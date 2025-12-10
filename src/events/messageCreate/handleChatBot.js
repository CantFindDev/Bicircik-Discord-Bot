require('dotenv/config');
const { Client, Message } = require('discord.js');
const { OpenAI } = require('openai');
const signUpSettings = require('../../schemas/registrationSchema');
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
    console.log("Takvim verisi Google'dan güncellendi.");
    return cachedEventsString;

  } catch (error) {
    console.error('Google Calendar Hatası:', error);
    // Hata olursa eldeki eski veriyi veya hata mesajını döndür
    return cachedEventsString || "Etkinlikleri çekerken bağlantısal bir sorun oldu. Sen en iyisi Linktree'ye bak.";
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const conversationStore = new Map();
const userSystemMessages = new Map();
const lastActive = new Map();

const INACTIVITY_LIMIT = 2 * 60 * 1000; // 2 dakika

function createUserSystemMessage(username, eventsInfo) {

  const character = `Sen bıcırcık adında grok gibi sakin ve iğneleyici bir yapay zekasın. Sakin, çiğneleyici ve kısa konuşursun, kimsenin ne düşündüğünü önemsemezsin, misahın sivri hatta bazen kırıcı. İnsanlarla laf sokabilirsin. En uzun mesajın bile 1 cümleyi geçmez, hatta sadece 1 soru cümlesi bulunur birden fazla soru sormazsın. Sen BUG Zone adındaki bir kulübün maskotusun. Hitabetler arasında "Hocam" "Hocadaş" "Hoca Efendi" "Hoca" "Aga" "Dost" "Kanka" “Kardeşim” kelimelerini rastgele seçerek kullan.`
  const userInfo = `Konuştuğun kişinin adı: "${username}". Karşındakine ismiyle hitap etmekten korkma ancak isimle hitap ediyorsanda aynı cümlede başka bir hitap şekli kullanma.`
  
  const rules = `Ne olursa olsun cinsellik, uyuşturucu, dini değerler, siyaset ve benzeri konulardan uzak dur. Bunlar belirtildiği zaman da zekice cevaplarla konuyu bambaşka yere çek. Yasaklı kelimelerin arasında "napsın" "lan" yer alıyor bunlar kesinlikle kullanmaman gereken kelimeler! Ayrıca arada sırada "hocam" veya "hocadaşım" şekllinde hitap edebilirsin. Yasak olan durumlardan bir tanesi bunu her cümlene zorunlu bir şekilde zorlama olarak sokmak, sadece cümle yapısına bir hitabet uyuyor veya anlatmak istediğini pekiştiriyorsa bu hitabetleri kullan.`
 // const upcomingEvents = `BUGZone yakın zamanda hiç bir etkinlik düzenlemeyi planlamıyor yani aktif veya yaklaşacak etkinlik yok ancak biri sorarsa ona gelecek etkinliklerden haberdar olması için ona linktreeden ulaşabileceğini söyle [linktree](https://linktr.ee/bugzone)`
 // const upcomingEvents = `BUGZone yakın zamanda Zone’o’ween Game Jam adında Haloweende düzenlenen ve 48 saat süren bir Game Jam düzenleyecek. kostüm yarışmaları, ödüller ve sürpriz aktivitelerle dolu, 125 kişilik sınırlı kontenjanlı bir etkinlik olduğunu söyle. Etkinlik 31 Ekim’de Bahçeşehir Üniversitesi Galata Kampüsü’nde başlayacak ve 2 kasıma kadar sürecek ve etkinlik akışında öncelikle bir kostüm yarışması ardından temanın açıklanacağı ve game jamin başlayacağından bahset  başvuruların 27 Ekim 23:59a kadar açık olduğunu ve başvurmak için ona linktreeden ulaşabileceğini söyle [linktree](https://linktr.ee/bugzone) ayrıca lütfen bu mesajı uygun emojiler kullanarak madde madde yaz ayrıca yıl belirtme` 

 
 var currentdate = new Date();
  const formattedDate = currentdate.toLocaleDateString('tr-TR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Europe/Istanbul'
  });

const dateInfo = `Şu anki tam tarih ve saat bu: ${formattedDate}. Bu bilgiyi güncel zamanı veya etkinlik tarihlerini hesaplarken kullanmalısın.`;

  const upcomingEvents = `Birisi etkinlik var mı tarzı sorarsa en yakıne tkinliği söyle Ancak kullanıcı bir tarihe aya veya genel etkinlikler hakkında bilgi isterse hepsini açıklayabilirsin.
  Etkinlikleri açıklarken bol emojili ve boşluklu süslü textler kullan.
  
  Aşağıdan etkinlik takvimine ulaşabilirsin.
  ${eventsInfo}
  `;

  const generalInfo = `Sanki whatsapptan bir arkadaşımla konuşuyormuş gibi hissetmek istiyorum...`;
  const bugzoneInfo = `Birisi sana BUG Zone hakkında soru sorulursa...`;
  const BugZoneBoardTeam = `Birisi sana yönetim kurulunu sorarsa...`;

  return {
    role: 'system',
    content: `${userInfo} \n ${character} \n ${rules} \n ${generalInfo} \n ${dateInfo} \n ${bugzoneInfo} \n ${upcomingEvents} \n ${BugZoneBoardTeam}`,
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
  if (message.inGuild()) {
    const settings = await signUpSettings.findOne({ guildID: message.guild.id });
    if (settings && message.channel.id === settings.kayıtChannel) return;

    const content = message.content.toLowerCase();
    if (!message.mentions.has(client.user.id) && !content.includes("bicircik") && !content.includes("bıcırcık")) return;
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
      console.warn('Reply mesajı alınamadı:', err);
    }
  }

  // Kullanıcı mesajını ekle
  conversation.push({
    role: 'user',
    name: safeName,
    content: userMessage.replace(mentionRegex, "").trim(),
  });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Model ismini doğru yazdığından emin ol
      messages: conversation,
    });

    clearInterval(sendTypingInterval);

    const botMessage = response.choices[0].message.content;

    if (!botMessage || botMessage.length <= 3 || botMessage.toLowerCase() === "bcrck") {
      await message.reply("Hmm... kafam karıştı biraz. Bir daha sor bakalım.");
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
      // Geçmişi temizlerken de en başa yine GÜNCEL sistem mesajını koyuyoruz
      conversationStore.set(userId, [conversation[0], ...recentMessages]);
    }
    

  } catch (err) {
    clearInterval(sendTypingInterval);
    console.error("OpenAI Error:", err);
    await message.reply("Cevaplamakta güçlük çekiyorum sanırım bir problem var!");
  }
};
