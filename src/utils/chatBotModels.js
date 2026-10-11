const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const { chatBot } = require('../../config.json');

const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
// The client refuses to construct without a key; a placeholder defers the failure to the request, where it is handled.
const MISSING_API_KEY = 'missing-api-key';
const API_KEY = process.env.CHATBOT_API_KEY || MISSING_API_KEY;

const MODEL_NOT_FOUND = 404;
const REJECTED_STATUSES = new Set([400, 401, 403]);

const FIRST_COOLDOWN = 60 * 1000;
const LONGEST_COOLDOWN = 60 * 60 * 1000;
const RESEARCH_COOLDOWN = 60 * 1000;
const AGENT_TIMEOUT = 120 * 1000;

const DEMANDING_LENGTH = 60;
const CHAT_TIMEOUT = 20 * 1000;
// Question words, requests to look something up, and words that hint at current information.
const DEMANDING_PATTERN = /\?|(^|[^a-z])(nasil|neden|niye|nedir|ne zaman|hangi|kim|kac|nerede|anlat|acikla|oner|tavsiye|etkinlik|yardim|bak|ogren|bul|kontrol|check|teyit|dogrula|guncel|surum|versiyon|fiyat|cikis|cikti|cikacak|belli mi|haber|tarih|kaynak)/;
// Phrases that ask for a web search outright. Looser wording is left to the chat model, which asks through RESEARCH_TOOL.
const RESEARCH_PATTERN = /(^|[^a-z])(arastir|arat|googl|internetten|internette|internete bak|netten|nete bak|webde|webden|arama yap|search)/;
const RESEARCH_COOLDOWN_REPLY = 'Az önce araştırdım, bir dakika sonra tekrar iste.';

/** Returned by askChatModel in place of a reply when the model asked for a web search. */
const RESEARCH_REQUESTED = Symbol('research requested');

const RESEARCH_TOOL = {
  type: 'function',
  function: {
    name: 'internette_ara',
    description:
      'Kullanıcı internete bakmanı, bir şeyi kontrol etmeni ya da öğrenmeni istediğinde ("bi bakar mısın", "öğrenir misin", "bulur musun", "kontrol eder misin" gibi) '
      + 'veya sorduğu şey sende olmayan güncel bir bilgi olduğunda (tarih, sürüm, fiyat, haber, çıkış tarihi gibi) bu aracı çağır. '
      + 'Kulübün etkinlik takvimi, yönetim kurulu ve BUG Zone bilgisi sende var; bunlar için çağırma. '
      + 'Selamlaşma, sohbet, fikir ya da tavsiye isteyen mesajlar ve kendi bilginle cevaplayabildiğin oyun geliştirme soruları için de çağırma.',
    parameters: {
      type: 'object',
      properties: { sorgu: { type: 'string', description: 'İnternette aranacak şey, kısa bir arama sorgusu olarak.' } },
      required: ['sorgu'],
    },
  },
};

const TURKISH_LETTERS = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u' };

const researchInstructions = fs
  .readFileSync(path.join(__dirname, '..', '..', 'prompts', 'chatbot', 'research.txt'), 'utf8')
  .trim();

const openai = new OpenAI({ apiKey: API_KEY, baseURL: `${API_BASE_URL}/openai/`, maxRetries: 0 });

/** Per model: when it may be tried again and how long the last cooldown was. */
const cooldowns = new Map();
/** Per user: when the last research request was sent to the agent. */
const lastResearchAt = new Map();

/** Lowercases and strips Turkish diacritics so keyword checks match either spelling. */
const normalize = (text) => text.toLocaleLowerCase('tr-TR').replace(/[çğıöşü]/g, (letter) => TURKISH_LETTERS[letter]);

const isAvailable = (model) => (cooldowns.get(model)?.until ?? 0) <= Date.now();

/**
 * Rests a model after a failure. The API does not say whether the minute or the day limit was hit,
 * so each consecutive failure doubles the rest, up to LONGEST_COOLDOWN.
 */
const rest = (model, duration = Math.min((cooldowns.get(model)?.duration ?? FIRST_COOLDOWN / 2) * 2, LONGEST_COOLDOWN)) => {
  cooldowns.set(model, { until: Date.now() + duration, duration });
  console.warn(`${model} cevap vermiyor, ${Math.round(duration / 60000)} dk denenmeyecek.`);
};

/**
 * Sends the conversation to a Gemini chat model through the OpenAI compatible endpoint.
 * With `offerResearch` the model may call RESEARCH_TOOL; the result is then RESEARCH_REQUESTED instead of text.
 * Low reasoning effort keeps replies near one second; a model slower than CHAT_TIMEOUT is treated as failed.
 */
const askChatModel = async (model, conversation, offerResearch) => {
  const response = await openai.chat.completions.create(
    {
      model,
      messages: conversation,
      reasoning_effort: 'low',
      ...(offerResearch && { tools: [RESEARCH_TOOL] }),
    },
    { timeout: CHAT_TIMEOUT }
  );

  const { content, tool_calls: toolCalls } = response.choices[0].message;
  return toolCalls?.length ? RESEARCH_REQUESTED : content;
};

/**
 * Sends the conversation to the Antigravity agent through the Interactions API, which takes one text input.
 * The agent can search the web; replies take ten to twenty seconds.
 */
const askAgent = async (conversation, isResearch) => {
  const [system, ...turns] = conversation;
  const transcript = turns
    .map((turn) => `${turn.role === 'assistant' ? 'Bıcırcık' : 'Kullanıcı'}: ${turn.content}`)
    .join('\n');

  const input = [
    system.content,
    isResearch ? researchInstructions : '',
    `Konuşma:\n${transcript}`,
    'Son kullanıcı mesajına Bıcırcık olarak cevap ver. Yalnızca cevabın kendisini yaz.',
  ].filter(Boolean).join('\n\n');

  const response = await fetch(`${API_BASE_URL}/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
    body: JSON.stringify({
      agent: chatBot.researchAgent,
      environment: 'remote',
      input,
      ...(isResearch && { tools: [{ type: 'google_search' }] }),
    }),
    signal: AbortSignal.timeout(AGENT_TIMEOUT),
  });

  if (!response.ok) {
    throw Object.assign(new Error(`Agent request failed with status ${response.status}`), { status: response.status });
  }

  const interaction = await response.json();
  return (interaction.steps ?? [])
    .filter((step) => step.type === 'model_output')
    .flatMap((step) => step.content ?? [])
    .map((part) => part.text ?? '')
    .join('')
    .trim();
};

/**
 * Orders the models for one message: outright research requests start at the agent, demanding messages at
 * the Flash models, casual ones at the Flash-Lite models. Every route ends with the other models as fallbacks.
 */
const pickRoute = (text) => {
  const normalized = normalize(text);
  const { flashModels, liteModels, researchAgent } = chatBot;

  if (RESEARCH_PATTERN.test(normalized)) {
    return { isResearch: true, models: [researchAgent, ...flashModels, ...liteModels] };
  }

  const isDemanding = text.length >= DEMANDING_LENGTH || DEMANDING_PATTERN.test(normalized);
  return {
    isResearch: false,
    models: isDemanding ? [...flashModels, ...liteModels, researchAgent] : [...liteModels, ...flashModels, researchAgent],
  };
};

/**
 * Hands a research request from a chat model to the agent. When the agent cannot answer,
 * the same chat model answers without the research tool instead.
 */
const researchOrAnswerWithout = async (model, conversation, userId) => {
  try {
    lastResearchAt.set(userId, Date.now());
    const reply = await askAgent(conversation, true);
    cooldowns.delete(chatBot.researchAgent);
    console.log(`Sohbet cevabı: ${model} > ${chatBot.researchAgent}`);
    return reply;
  } catch (error) {
    rest(chatBot.researchAgent, error.status === MODEL_NOT_FOUND ? LONGEST_COOLDOWN : undefined);
    return askChatModel(model, conversation, false);
  }
};

/**
 * Answers the last user message of the conversation with the first model on its route that responds.
 * Rate limited models are skipped until their cooldown ends. Throws when no model could answer.
 * Only the Flash models are offered the research tool; the Flash-Lite models do not call it reliably.
 * @param {{ role: string, content: string }[]} conversation System message first, newest user message last.
 * @param {string} userId Used to space out research requests per user.
 */
module.exports = async (conversation, userId) => {
  const { researchAgent } = chatBot;
  const route = pickRoute(conversation[conversation.length - 1].content);
  const canResearch = Date.now() - (lastResearchAt.get(userId) ?? 0) >= RESEARCH_COOLDOWN;

  if (route.isResearch && !canResearch) return RESEARCH_COOLDOWN_REPLY;

  let lastError = new Error('Every chat model is cooling down.');

  for (const model of route.models) {
    if (!isAvailable(model)) continue;

    try {
      let reply;
      if (model === researchAgent) {
        if (route.isResearch) lastResearchAt.set(userId, Date.now());
        reply = await askAgent(conversation, route.isResearch);
      } else {
        const offerResearch = canResearch && isAvailable(researchAgent) && chatBot.flashModels.includes(model);
        reply = await askChatModel(model, conversation, offerResearch);
        if (reply === RESEARCH_REQUESTED) return await researchOrAnswerWithout(model, conversation, userId);
      }

      cooldowns.delete(model);
      if (!reply) {
        lastError = new Error(`${model} returned an empty reply.`);
        continue;
      }

      console.log(`Sohbet cevabı: ${model}`);
      return reply;
    } catch (error) {
      lastError = error;
      if (REJECTED_STATUSES.has(error.status)) break;
      rest(model, error.status === MODEL_NOT_FOUND ? LONGEST_COOLDOWN : undefined);
    }
  }

  throw lastError;
};
