const fs = require('fs');
const path = require('path');

const PROMPTS_PATH = path.join(__dirname, '..', '..', 'prompts', 'chatbot');
const PROMPT_SECTIONS = ['user', 'character', 'rules', 'general', 'date', 'bugzone', 'terms', 'tools', 'events', 'board'];

const promptTemplate = PROMPT_SECTIONS
  .map((section) => fs.readFileSync(path.join(PROMPTS_PATH, `${section}.txt`), 'utf8').trim())
  .join('\n\n');

/**
 * Builds the chatbot system message from the text files in `prompts/chatbot`, joined in PROMPT_SECTIONS order.
 * The files are read once at startup; `{username}`, `{date}` and `{events}` in them are filled in per call.
 * @param {string} username
 * @param {string} eventsInfo Upcoming events as text, placed where `{events}` appears.
 */
module.exports = (username, eventsInfo) => {
  const formattedDate = new Date().toLocaleDateString('tr-TR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Europe/Istanbul'
  });

  return {
    role: 'system',
    content: promptTemplate
      .replace('{username}', () => username)
      .replace('{date}', () => formattedDate)
      .replace('{events}', () => eventsInfo),
  };
};
