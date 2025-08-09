const { Client, Message } = require('discord.js');
const levelSchema = require('../../schemas/levelSchema');
const calculateLevelXp = require('../../utils/calculateLevelXp');
const cooldowns = new Set();

function getRandomXP(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = async (client, message) => { 
    if (!message.inGuild() || message.author.bot || cooldowns.has(message.author.id)) return;

    const xpToGive = getRandomXP(5, 15);

    try {
        let guildData = await levelSchema.findOne({ guildID: message.guild.id });

        if (!guildData) {
            guildData = new levelSchema({
                guildID: message.guild.id,
                users: []
            });
        }

        if (!Array.isArray(guildData.users)) {
            guildData.users = [];
        }

        let userData = guildData.users.find(u => u.userID === message.author.id);

        if (userData) {
            userData.xp += xpToGive;

            if (userData.xp >= calculateLevelXp(userData.level)) {
                userData.xp = 0;
                userData.level += 1;

                message.channel.send(`${message.member}, **${userData.level}. seviyeye** ulaştınız.`);
            }
        } else {
            guildData.users.push({
                userID: message.author.id,
                xp: xpToGive,
                level: 0
            });
        }

        await guildData.save().catch((e) => {
            console.log(`Seviye güncellenirken hata oluştu: ${e}`);
        });

        cooldowns.add(message.author.id);
        setTimeout(() => {
            cooldowns.delete(message.author.id);
        }, 30000);

    } catch (error) {
        console.log(`XP verirken hata oluştu: ${error}`);
    }
};
