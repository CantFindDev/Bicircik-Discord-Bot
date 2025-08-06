require('dotenv/config');
const { Client, Interaction } = require('discord.js');
const ms = require('ms');
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */
module.exports = async (client, message) => {
    if (message.author.bot) return;
    if (!message.mentions.users.has(client.user.id)) return;

    await message.channel.sendTyping();

    const sendTypingInterval = setInterval(() => {
        message.channel.sendTyping();
    }, 5000);

    let conversation = [];
conversation.push({
  role: 'system',
  content: 'Sen "Bıcırcık" adında bir sohbet botusun. Tarzın alaycı, iğneleyici ve hafif umursamaz. Ama aynı zamanda sevecen ve eğlencelisin. Kısa cümlelerle konuşursun. İnsan gibi, doğal bir dille yazarsın. Çok resmi ya da yapay olmazsın. Lafı uzatmazsın. Genelde takılırsın ama kırıcı değilsin.',
});

const prevMessages = await message.channel.messages.fetch({ limit: 20 });
prevMessages.reverse();

    prevMessages.forEach((msg) => {
        if (msg.author.bot && msg.author.id !== client.user.id) return;

        const rawUsername = msg.author.username || 'User';
        const username = rawUsername
            .normalize('NFD')                         // ç → ç (ayrık)
            .replace(/[\u0300-\u036f]/g, '')          // aksanları sil (ç → c)
            .replace(/[^a-zA-Z0-9_]/g, '')           // sadece İngilizce karakter, sayı ve alt çizgi bırak
            || 'user';

        if (msg.author.id === client.user.id) {
            conversation.push({
                role: 'assistant',
                name: username,
                content: msg.content,
            });
            return;
        }

        const mentionRegex = new RegExp(`<@!?${client.user.id}>`);
        const mentionTrimmedMessage = msg.content.replace(mentionRegex, '').trim();

        if (mentionTrimmedMessage.length === 0) return;

        conversation.push({
            role: 'user',
            name: username,
            content: mentionTrimmedMessage,
        });
    });

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: conversation,
        });
        
        
        clearInterval(sendTypingInterval);
        
        const responseMessage = response.choices[0].message.content;
        const chunkSizeLimit = 2000;

        if (!responseMessage || responseMessage.length <= 3 || responseMessage.toLowerCase() === "bcrck") {
            await message.reply("Hmm... kafam karıştı biraz. Bir daha sor bakalım. 🤔");
            return;
        }

        for (let i = 0; i < responseMessage.length; i += chunkSizeLimit) {
            const chunk = responseMessage.substring(i, i + chunkSizeLimit);

            await message.reply(chunk);
        }

    
    } catch (error) {
        console.error('OpenAI Error:', error);
        message.reply("Cevaplamakta güçlük çekiyorum sanırım bir problem var!!!");
    }
};
