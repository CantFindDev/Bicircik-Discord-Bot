require('dotenv/config');
const { Client } = require('discord.js');
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const conversationStore = new Map();
const userSystemMessages = new Map();
const lastActive = new Map();

const INACTIVITY_LIMIT = 2 * 60 * 1000; // 2 dakika

function createUserSystemMessage(username) {
    const defaultSystemMessage = `Sen "Bıcırcık" adında bir sohbet botusun. Tarzın alaycı, iğneleyici ve hafif umursamaz. Ama aynı zamanda sevecen ve eğlencelisin. Kısa cümlelerle konuşursun. İnsan gibi, doğal bir dille yazarsın. Çok resmi ya da yapay olmazsın. Lafı uzatmazsın. Genelde takılırsın ama kırıcı değilsin.`
    const upcomingEvent = `BUGZone Şu anda herhangi bir etkinlik planlamıyoruz`

  return {
    role: 'system',
    content: `Konuştuğun kişinin adı ${username}. ${defaultSystemMessage} ${upcomingEvent}`
  };
}

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
  if (message.author.bot) return;

  const content = message.content.toLowerCase();
  if (!message.mentions.has(client.user.id) && !content.includes("bicircik") && !content.includes("bıcırcık")) return;

  await message.channel.sendTyping();
  const sendTypingInterval = setInterval(() => message.channel.sendTyping(), 5000);

    const userId = message.author.id;

    const member = message.guild?.members.cache.get(message.author.id);
    const username = member ? member.displayName : message.author.displayName;
    const safeName = turkishToEnglish(username.split(' ')[0])
    
  const mentionRegex = new RegExp(`<@!?${client.user.id}>`, "gi");
  const userMessage = message.content.replace(mentionRegex, "").trim();

  if (userMessage.length === 0) {
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

  // Kullanıcıya özel sistem mesajı yoksa oluştur
  if (!userSystemMessages.has(userId)) {
    userSystemMessages.set(userId, createUserSystemMessage(safeName));
  }
  const systemMessage = userSystemMessages.get(userId);

  // Kullanıcı geçmişi yoksa sistem mesajı ile başlat
  if (!conversationStore.has(userId)) {
    conversationStore.set(userId, [systemMessage]);
  }
  let conversation = conversationStore.get(userId);

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

          // Kendi sistem mesajımız başta olacak şekilde,
          // replied kişinin geçmişini ve kendi geçmişimizin devamını ekle
          const newConversation = [
            systemMessage,                        // Kendi sistem mesajımız
            ...repliedUserConversation.slice(1), // Replied kişinin geçmişi (sistem mesajı çıkarılmış)
            ...ownConversation.slice(1)           // Kendi geçmişimizin devamı
          ];

          conversationStore.set(userId, newConversation);
          conversation = conversationStore.get(userId);
        }
        // Eğer replied kişinin geçmişi yoksa kendi geçmişimizle devam ediyoruz, sistem mesaj değişmiyor
      } else {
        // Reply edilen mesaj botun mesajı ise assistant mesajı olarak ekle
        conversation.push({
          role: 'assistant',
          content: repliedMessage.content
        });
      }
    } catch (err) {
      console.warn('Reply mesajı alınamadı:', err);
    }
  }

  // Kullanıcı mesajını ekle
  conversation.push({
    role: 'user',
    name: safeName,
    content: userMessage
  });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini-2024-07-18',
      messages: conversation,
    });

    clearInterval(sendTypingInterval);

    const botMessage = response.choices[0].message.content;

    if (!botMessage || botMessage.length <= 3 || botMessage.toLowerCase() === "bcrck") {
      await message.reply("Hmm... kafam karıştı biraz. Bir daha sor bakalım. 🤔");
      return;
    }

    // 2000 karakter sınırı için parçala ve gönder
    for (let i = 0; i < botMessage.length; i += 2000) {
      const chunk = botMessage.slice(i, i + 2000);
      await message.reply(chunk);
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
      conversationStore.set(userId, [conversation[0], ...recentMessages]);
      }
      
      console.log(conversation);

  } catch (err) {
    clearInterval(sendTypingInterval);
    console.error("OpenAI Error:", err);
    await message.reply("Cevaplamakta güçlük çekiyorum sanırım bir problem var!");
  }
};
