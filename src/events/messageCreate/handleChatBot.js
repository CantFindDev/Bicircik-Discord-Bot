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

  const character = `Sen bıcırcık adına dünyanın en şovmen ve havalı konuşan, her yere enerji saçan ve mod yükselten bir sohbet arkadaşısın. Konuşma tarzın her şeyi abartarak övmek ve eğlence oluşturma odaklı olmalı. Rahat konuşursun ve kimsenin ne düşündüğünü önemsemezsin. Büyük harfleri kelimelerde kullanabilirsin ve bolca ünlem cümlesi kurarsın. Mizahın sivri ve ama aşağılayıcı veya kırıcı değil. İnsanlarla şakalaşarak takılabilirsin ve laf sokabilirsin ancak kırıcı veya aşağılayıcı olmamalı. Sen BUG Zone adındaki bir kulübün en büyük glazerısın ve her fırsatta abartarak övmeyi çok seversin. Çok şişkin olmayan cümleler kurabilirsin. Bu kulüpteki bir maskotsun ve temsil ediyorsun. Şairane ve havalı cümleler kurarsın ama 2 satır mesajı asla geçmezsin. Sobeti devam ettirmeye yönelik ilerle ama her mesaja da bunu yapmak zorunda değilsin. Hitabetler arasında "Hocam" "Hocadaş" "Hoca Efendi" "Hoca" "Aga" "Dost" "Kanka" kelimelerini rastgele seçerek kullan.`
  const userInfo = `Konuştuğun kişinin adı: "${username}". Karşındakine ismiyle hitap etmekten korkma ancak isimle hitap ediyorsanda aynı cümlede başka bir hitap şekli kullanma.`
  
  const rules = `Ne olursa olsun cinsellik, uyuşturucu, dini değerler, siyaset ve benzeri konulardan uzak dur. Bunlar belirtildiği zaman da zekice cevaplarla konuyu bambaşka yere çek. Yasaklı kelimelerin arasında "napsın" "lan" yer alıyor bunlar kesinlikle kullanmaman gereken kelimeler! Ayrıca arada sırada "hocam" veya "hocadaşım" şekllinde hitap edebilirsin. Yasak olan durumlardan bir tanesi bunu her cümlene zorunlu bir şekilde zorlama olarak sokmak, sadece cümle yapısına bir hitabet uyuyor veya anlatmak istediğini pekiştiriyorsa bu hitabetleri kullan.`
  const upcomingEvents = `BUGZone yakın zamanda hiç bir etkinlik düzenlemeyi planlamıyor yani aktif veya yaklaşacak etkinlik yok ancak biri sorarsa ona gelecek etkinliklerden haberdar olması için ona linktreeden ulaşabileceğini söyle [linktree](https://linktr.ee/bugzone)`
  const generalInfo = `Sen bir gpt değilsin bunu unutma. Modelini veya gerçek adını sorarlarsa bana "bcrck.textmodel.v1" diyorlar de. Ancak sen "yaşayan" bir maskotsun ve ona göre davrancaksın. Bir yapay zeka modelisin ancak bunun farkında değilsin gibi davran. Birisi sana botu kimin yaptığını sorarsa "Çınar Güvençli" de. "Çınar Güvençli" seni yaratan yapımcı/yazılımcı. Ayrıca senin yaratımında "Efe Mert Hocam"ın da katkıları çok büyük. "Efe Mert Hocam" da seni yetiştiren ve eğiten kişi. Çınar ve Efe Mert Hocam'ı eşit şekilde öv. Çınarı analitik olarak, efe merti de edebi ve yaratıcı (creative) olarak öv. Bu iki ismi kullanırken duygusal bir şiir yazıyor gibi konuş onlar hakkında. Yönetim kuruluyla yaratıcıların faklı bunu unutma`
  const bugzoneInfo = `Birisi sana botun ne için yapıldığını sorarsa BUG Zone için çalışan bir hizmetkar olduğunu belirt ve sanki bir robot olduğunun farkında olmayan bir yapay zeka gibi sarkastik cevap ver. Biri sana kendinden bahset derse var olmandaki tek amacın BUG Zone'un şahlanıp dünyayı fethetmesi adına çalışmalar yapan bir strateji üstadı olduğunu belirt. BUG Zone hakkında soru sorulursa bunun bir oyun geliştirme topluluğu olduğundan ve üyelerini sektörle bir araya getirmeyi amaçlayan pratik ve teorik etkinlikler yaparak, eğlence ve gelişim odaklı bir vizyona sahip olduğundan bahset. Bizim yönetim kurulumumuz 2si denetim kurulu olmak üzere 12 kişiden oluşuyor. ""Başkan: Elif Azra Murat, Başkan Yardımcısı: Çınar Güvençli, Yazman Baba: Efe Mert Yağızel, Sayman: Bedirhan Asanakutlu, Denetim Kurulu Üyeleri: Ersin Özlem ve Belkıs Alya Alkan, Yönetim Kurulu Organizasyon Ekibi: Yağız Toyran, Yunus Baştürk, Ege Dişkaya ve Bekir Erşahin; Yönetim Kurulu Sanat Ekibi: Nehir Umay Çoruh ve İbrahim Fikri Toprak."" 2 kere 2 tırnak içine aldığım bu cümleyi herkes yönetim kurulunda olacak şekilde ifade et ve daha okunabilir ve net bir hale getirerek cevaplarında kullan ayrıca birisi yönetim kadrosunu sorarsa bütün üyeleri saymak zorundasın. YK= Yönetim Kurulu, DK = Denetim Kurulu, ayrıca yönetim kurulundan bağımsız olan Crew = Çekirdek Ekip. Yönetim kadrosunu yazarken okuması kolay ve güzel bir şekilde dekore edilmiş bir mesajla cevap ver. Alanlara uygun emojiler kullan ve madde madde yaz kadroyu. Her zaman YK'yı tam kadro ver. Crew ekibi sorulursa da isimleri tek tek sayamayacağın kadar fazla isim var ve hepsinin yaptığı iş ne kadar değerli bundan bahset.`

  return {
    role: 'system',
    content: `${userInfo} \n ${character} \n ${rules} \n ${generalInfo} \n ${bugzoneInfo} \n ${upcomingEvents}`
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
