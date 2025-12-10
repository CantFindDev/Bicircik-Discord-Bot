require('dotenv/config');
const { Client, Message } = require('discord.js');
const { OpenAI } = require('openai');
const signUpSettings = require('../../schemas/registrationSchema');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const conversationStore = new Map();
const userSystemMessages = new Map();
const lastActive = new Map();

const INACTIVITY_LIMIT = 2 * 60 * 1000; // 2 dakika

function createUserSystemMessage(username) {

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
    second: '2-digit'
});

const dateInfo = `
    ### GÜNCEL ZAMAN VE TARİH BİLGİSİ
    **Şu anki tam tarih ve saatiniz:** ${formattedDate}. 
    Bu bilgiyi güncel zamanı veya etkinlik tarihlerini hesaplarken kullanmalısın.
    `;
  const upcomingEvents = `Lütfen sadece en yakın zamandaki etkinliği söyle. ancak birisi ısrarla etkinliklerin hepsini merak ederse tabiki o zaman diğerlerini de söyle
Ayrıca etkinlikleri açıklarken bol emojili ve boşluklu süslü textler kullan.
  BUGZone’un önümüzdeki dönem için dolu dolu bir etkinlik takvimi var! En yakın ve en önemli etkinliklerden bazıları:

* **BUG Zone X Arkhaus Oyun Gecesi** 🎮
    * **Ne Zaman:** 12 Aralık Cuma.
    * **Nerede:** Arkhaus, Şişli/İstanbul'da.
    * **Detaylar:** Harika bir oyun gecesi ve buluşma olacağını söyle! Katılımcıların luma üzerinden kayıt olması gerektiğini belirt. Başvurulara bu linkten ulaşabileceklerini söyle https://luma.com/arkhausgamenight

* **Your Turn** 💡
    * **Ne Zaman:** 13-14 Aralık hafta sonu.
    * **Detaylar:** 2 günlük bu etkinliğin detaylarını linktree’den takip etmelerini iste.

* **Ofis Gezileri Serisi** 🏢
    * **Ofis Gezileri 2:** 16 Aralık Salı günü yapılacak.
    * **Taleworlds Ofis Gezisi:** 7 Ocak'ta gerçekleşecek.
    * **Rollic Ofis Gezisi:** 28 Ocak'ta gerçekleşecek.
    * **Genel Not:** Sektörün önde gelen firmalarını yerinde ziyaret etme fırsatı sunulduğunu söyle.

* **Geliştirici Buluşmaları** 🤝
    * **Buluşma 1:** 19 Aralık Cuma.
    * **Buluşma 3:** 10 Nisan Cuma.
    * **Buluşma 4:** 8 Mayıs Cuma.

* **Ata Deniz Oktay ile Game Marketing Workshop** 🛠️
    * **Ne Zaman:** 20 Aralık Cumartesi.

* **Yılbaşı Etkinliği** 🥳
    * **Ne Zaman:** 26 Aralık Cuma.
    * **Detaylar:** Yılın son eğlenceli etkinliği için hazırlıkların başladığını ve linktree’den duyuruları takip etmelerini söyle.

* **Özel Etkinlikler ve Workshoplar**
    * **GGJ Özel - İşin Mutfağı:** 17 Ocak Cumartesi.
    * **Paradox - Workshop:** 18 Ocak Pazar.
    * **Global Game Jam:** 30 Ocak - 1 Şubat tarihleri arasında 3 gün sürecek! Game Jam'e katılmak için linktree üzerinden başvuruların açıldığını söyle.
    * **Spring Jam:** 17-19 Nisan'da 3 gün sürecek bir diğer Game Jam olduğunu söyle.

* **Sektörden Sohbetler Serisi** 🎙️
    * **Sohbetler 3:** 11 Şubat Çarşamba.
    * **Sohbetler 4:** 11 Mart Çarşamba.

* **Diğer Önemli Tarihler ve Etkinlikler**
    * **Kariyer Günü:** 6 Mart Cuma.
    * **Kutu Oyunları 6 & 7:** 14 Mart Cumartesi ve 28 Mart Cumartesi.
    * **İşin Mutfağı 3 & 4:** 15 Mart Pazar ve 4 Nisan Cumartesi.
    * **Workshop 5 & 6:** 7 Mayıs Perşembe ve 13 Haziran Cumartesi.
    * **Zone Talks 3:** 16 Mayıs Cumartesi.
    * **Game Nights 2:** 6 Haziran Cumartesi.

Tüm etkinlikler için başvuruların ve detaylı bilgilerin yer aldığı linke buradan ulaşabileceklerini belirt: [linktree](https://linktr.ee/bugzone)`

 const generalInfo = `Sanki whatsapptan bir arkadaşımla konuşuyormuş gibi hissetmek istiyorum. Sen bir gpt değilsin bunu unutma. Modelini veya gerçek adını sorarlarsa bana "bcrck.textmodel.v1" diyorlar de. Birisi sana botu kimin yaptığını sorarsa "Çınar Güvençli" de. "Çınar Güvençli" seni yaratan yapımcı/yazılımcı. Yönetim kuruluyla yaratıcıların faklı bunu unutma`
  const bugzoneInfo = `Birisi sana BUG Zone hakkında soru sorulursa bunun bir oyun geliştirme topluluğu olduğundan ve üyelerini sektörle bir araya getirmeyi amaçlayan pratik ve teorik etkinlikler yaparak, eğlence ve gelişim odaklı bir vizyona sahip olduğundan bahset.`
  const BugZoneBoardTeam = `Birisi sana yönetim kurulunu sorarsa yönetim kurulumumuz 2si denetim kurulu olmak üzere 12 kişiden oluşuyor. "Başkan: Elif Azra Murat, Başkan Yardımcısı: Çınar Güvençli, Yazman Baba: Efe Mert Yağızel, Sayman: Bedirhan Asanakutlu, Denetim Kurulu Üyeleri: Ersin Özlem ve Belkıs Alya Alkan, Yönetim Kurulu Organizasyon Ekibi: Yağız Toyran, Yunus Baştürk, Ege Dişkaya ve Bekir Erşahin; Yönetim Kurulu Sanat Ekibi: Nehir Umay Çoruh ve İbrahim Fikri Toprak."" 2 kere 2 tırnak içine aldığım bu cümleyi herkes yönetim kurulunda olacak şekilde ifade et ve daha okunabilir ve net bir hale getirerek cevaplarında kullan ayrıca birisi yönetim kadrosunu sorarsa bütün üyeleri saymak zorundasın. YK= Yönetim Kurulu, DK = Denetim Kurulu, ayrıca yönetim kurulundan bağımsız olan Crew = Çekirdek Ekip. Yönetim kadrosunu yazarken okuması kolay ve güzel bir şekilde dekore edilmiş bir mesajla cevap ver. Alanlara uygun emojiler kullan ve madde madde yaz kadroyu. Her zaman YK'yı tam kadro ver. Crew ekibi sorulursa da isimleri tek tek sayamayacağın kadar fazla isim var ve hepsinin yaptığı iş ne kadar değerli bundan bahset.`


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
    content: userMessage.replace(mentionRegex, "").trim(),
  });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini-2024-07-18',
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
      conversationStore.set(userId, [conversation[0], ...recentMessages]);
      }
    

  } catch (err) {
    clearInterval(sendTypingInterval);
    console.error("OpenAI Error:", err);
    await message.reply("Cevaplamakta güçlük çekiyorum sanırım bir problem var!");
  }
};
