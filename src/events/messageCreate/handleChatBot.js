require('dotenv/config');
const fs = require('fs');
const path = require('path');
const { Client, Message, MessageFlags } = require('discord.js');
const signUpSettings = require('../../schemas/registrationSchema');
const chatBotSchema = require('../../schemas/chatBotSchema');
const generateReply = require('../../utils/chatBotModels');
const createUserSystemMessage = require('../../utils/chatBotPrompt');
const { google } = require('googleapis');

// --- AYARLAR ---
// 1. Bu ID'yi Google Takvim ayarlarından alacaksın (genelde ...group.calendar.google.com ile biter)
const CALENDAR_ID = 'bugzone2022@gmail.com'; 

// 2. Google Cloud Console'dan indirdiğin JSON dosyasının proje klasöründeki tam adı
const CREDENTIALS_PATH = './google-credentials.json'; 

// --- ÖNBELLEK (CACHE) DEĞİŞKENLERİ ---
// Her mesajda Google'a sormamak için son veriyi burada tutuyoruz
let cachedEventsString = ""; 
let lastFetchTime = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 Dakika (Milisaniye cinsinden)

/**
 * Google Takvim'den gelecek etkinlikleri çeker ve string olarak döndürür.
 * Cache süresi dolmadıysa API isteği atmaz, hafızadaki veriyi kullanır.
 */
async function getUpcomingEvents() {
  const now = Date.now();

  // EĞER: Cache boş değilse VE son çekimden bu yana 30 dakika geçmediyse
  if (cachedEventsString && (now - lastFetchTime < CACHE_DURATION)) {
    // Google'a gitme, eldekini ver
    return cachedEventsString;
  }

  // YOKSA: Google'dan yeni veri çek
  try {
    // 1. Yetkilendirme (Auth)
    const auth = new google.auth.GoogleAuth({
      keyFile: CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    // 2. API İsteği
    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: (new Date()).toISOString(), // Şu andan itibaren
      maxResults: 30, // En yakın 30 etkinlik
      singleEvents: true, // Tekrarlayan etkinlikleri tek tek aç
      orderBy: 'startTime', // Tarihe göre sırala
    });

    const events = response.data.items;

    // 3. Veriyi Bıcırcık'ın anlayacağı metne çevirme (Formatlama)
    if (!events || events.length === 0) {
      cachedEventsString = "Şu an için planlanmış bir etkinlik görünmüyor. Ancak Linktree'yi takipte kal!";
    } else {
      let formattedText = "BUGZone’un önümüzdeki dönem etkinlik takvimi (Google Takvim verisidir):\n\n";

      events.forEach((event) => {
        // Tarih formatlama (Örn: 12 Aralık Cuma, 14:00)
        const start = event.start.dateTime || event.start.date;
        const dateObj = new Date(start);
        const dateString = dateObj.toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'long',
          weekday: 'long',
          hour: '2-digit',
          minute: '2-digit'
        });

        // Açıklama varsa al, yoksa standart mesaj koy
        // (Açıklamadaki gereksiz boşlukları temizler)
        const description = event.description ? event.description.trim() : "Detaylar yakında açıklanacak.";
        const location = event.location ? `\n    * **Nerede:** ${event.location}` : "";

        // Listeye ekle
        formattedText += `* **${event.summary}** 📅\n`;
        formattedText += `    * **Ne Zaman:** ${dateString}${location}\n`;
        formattedText += `    * **Detaylar:** ${description}\n\n`;
      });

      formattedText += `\nTüm başvurular ve detaylı bilgiler için: [linktree](https://linktr.ee/bugzone)`;
      
      cachedEventsString = formattedText;
    }

    // Zamanlayıcıyı güncelle
    lastFetchTime = now;
    console.log("Calendar data refreshed from Google.");
    return cachedEventsString;

  } catch (error) {
    console.error('Google Calendar error:', error);
    // Hata olursa eldeki eski veriyi veya hata mesajını döndür
    return cachedEventsString || "Etkinlikleri çekerken bağlantısal bir sorun oldu. Sen en iyisi Linktree'ye bak.";
  }
}

const UNAVAILABLE_REPLIES = fs
  .readFileSync(path.join(__dirname, '..', '..', '..', 'prompts', 'chatbot', 'unavailable.txt'), 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

const conversationStore = new Map();
const userSystemMessages = new Map();
const lastActive = new Map();

const INACTIVITY_LIMIT = 2 * 60 * 1000; // 2 dakika

function turkishToEnglish(str) {
  const lettersMap = {
    'Ç': 'C',
    'ç': 'c',
    'Ğ': 'G',
    'ğ': 'g',
    'İ': 'I',
    'ı': 'i',
    'Ö': 'O',
    'ö': 'o',
    'Ş': 'S',
    'ş': 's',
    'Ü': 'U',
    'ü': 'u',
  };

  return str.split('').map(char => lettersMap[char] || char).join('');
}

/**
 * @param {Client} client
 * @param {Message} message
 */
module.exports = async (client, message) => {
  if (message.inGuild()) {
    const content = message.content.toLowerCase();
    if (!message.mentions.has(client.user.id) && !content.includes("bicircik") && !content.includes("bıcırcık")) return;

    const settings = await signUpSettings.findOne({ guildID: message.guild.id });
    if (settings && message.channel.id === settings.kayıtChannel) return;

    const chatBotSettings = await chatBotSchema.findOne({ guildID: message.guild.id });
    if (chatBotSettings && message.channel.id !== chatBotSettings.channelID) return;
  }

  if (message.author.bot) return;

  await message.channel.sendTyping();
  const sendTypingInterval = setInterval(() => message.channel.sendTyping(), 5000);

  const userId = message.author.id;

  const member = message.guild?.members.cache.get(message.author.id);
  const username = member ? member.displayName : message.author.displayName;
  const safeName = turkishToEnglish(username.split(' ')[0])
  
  const mentionRegex = new RegExp(`<@!?${client.user.id}>`, "gi");
  let userMessage = message.content;

  if (userMessage.length > 1000) {
    userMessage = "Karşındaki sana çok uzun bir mesaj atmış ve bu aşırı uzun mesajın seni nasıl yorduğundan ve kullanılmasına gerek olmadığından bahset ve ona göre davran";
  }

  if (userMessage.length === 0 || userMessage.length < 3) {
    clearInterval(sendTypingInterval);
    return;
  }

  const now = Date.now();

  // Kullanıcı inaktifse geçmişi temizle
  if (lastActive.has(userId)) {
    const diff = now - lastActive.get(userId);
    if (diff > INACTIVITY_LIMIT) {
      conversationStore.delete(userId);
      userSystemMessages.delete(userId);
    }
  }
  lastActive.set(userId, now);

  // 1. Google'dan YENİ veriyi çek
  const dynamicEvents = await getUpcomingEvents();

  // 2. Sistem Mesajını HER SEFERİNDE yeniden oluştur (Eski kontrolü kaldırdık)
  const newSystemMessage = createUserSystemMessage(safeName, dynamicEvents);
  userSystemMessages.set(userId, newSystemMessage);

  // 3. Konuşma geçmişini al veya oluştur
  if (!conversationStore.has(userId)) {
    conversationStore.set(userId, [newSystemMessage]);
  }
  
  let conversation = conversationStore.get(userId);

  // 4. KRİTİK NOKTA: Konuşma geçmişinin en başındaki (0. indeks) sistem mesajını
  // yeni çektiğimiz etkinliklerle güncelliyoruz.
  conversation[0] = newSystemMessage;

  // Reply kontrolü
  if (message.reference && message.reference.messageId) {
    try {
      const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);

      // Eğer reply yapılan kişi bot değilse
      if (repliedMessage.author.id !== client.user.id) {
        const repliedUserId = repliedMessage.author.id;

        if (conversationStore.has(repliedUserId)) {
          const repliedUserConversation = conversationStore.get(repliedUserId);
          const ownConversation = conversationStore.get(userId) || [];

          // Sistem mesajını en güncel haliyle (newSystemMessage) başa koyuyoruz
          const newConversation = [
            newSystemMessage,                     // GÜNCEL SİSTEM MESAJI
            ...repliedUserConversation.slice(1), 
            ...ownConversation.slice(1)          
          ];

          conversationStore.set(userId, newConversation);
          conversation = conversationStore.get(userId);
        }
      } else {
        // Reply edilen mesaj botun mesajı ise assistant mesajı olarak ekle
        conversation.push({
          role: 'assistant',
          content: repliedMessage.content
        });
      }
    } catch (err) {
      console.warn('Could not fetch the replied message:', err);
    }
  }

  // Kullanıcı mesajını ekle
  conversation.push({
    role: 'user',
    content: userMessage.replace(mentionRegex, "").trim(),
  });

  try {
    const botMessage = await generateReply(conversation, userId);

    clearInterval(sendTypingInterval);

    if (!botMessage || botMessage.length <= 3 || botMessage.toLowerCase() === "bcrck") {
      await message.reply("Hmm... kafam karıştı biraz. Bir daha sor bakalım.");
      return;
    }

    // 2000 karakter sınırı için parçala ve gönder
    for (let i = 0; i < botMessage.length; i += 2000) {
      const chunk = botMessage.slice(i, i + 2000);
      await message.reply({ content: chunk, flags: MessageFlags.SuppressEmbeds });
    }

    conversation.push({
      role: 'assistant',
      content: botMessage
    });

    // Maksimum 5 çift (10 mesaj) sakla
    const MAX_PAIRS = 5;
    const maxMessages = MAX_PAIRS * 2;

    if (conversation.length > maxMessages + 1) {
      const recentMessages = conversation.slice(-maxMessages);
      // Geçmişi temizlerken de en başa yine GÜNCEL sistem mesajını koyuyoruz
      conversationStore.set(userId, [conversation[0], ...recentMessages]);
    }
    

  } catch (err) {
    clearInterval(sendTypingInterval);
    console.error("Chatbot Error:", err);
    await message.reply(UNAVAILABLE_REPLIES[Math.floor(Math.random() * UNAVAILABLE_REPLIES.length)]);
  }
};
