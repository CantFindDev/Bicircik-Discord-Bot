const { AttachmentBuilder } = require('discord.js');
const levelSchema = require('../../schemas/levelSchema');
const calculateLevelXp = require('../../utils/calculateLevelXp');
const cooldowns = new Set();
const signUpSettings = require('../../schemas/registrationSchema');
const canvacord = require('canvacord');

function getRandomXP(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = async (client, message) => {
    if (!message.inGuild() || message.author.bot) return;

    const settings = await signUpSettings.findOne({ guildID: message.guild.id });
    if (settings && message.channel.id === settings.kayıtChannel) return;

    const xpToGive = getRandomXP(5, 15);

    try {
        let guildData = await levelSchema.findOne({ guildID: message.guild.id });

        if (!guildData) {
            guildData = new levelSchema({
                guildID: message.guild.id,
                userLevels: []
            });
        }

        if (!Array.isArray(guildData.userLevels)) {
            guildData.userLevels = [];
        }

        let userData = guildData.userLevels.find(u => u.userID === message.author.id);

        if (!userData) {
            userData = {
                userID: message.author.id,
                xp: xpToGive,
                level: 0
            };
            guildData.userLevels.push(userData);
        } else {
            if (cooldowns.has(message.author.id)) return;

            userData.xp += xpToGive;

            if (userData.xp >= calculateLevelXp(userData.level)) {
                userData.xp = 0;
                userData.level += 1;

                const allLevels = [...guildData.userLevels].sort((a, b) => {
                    if (a.level === b.level) return b.xp - a.xp;
                    return b.level - a.level;
                });

                const currentRank = allLevels.findIndex(u => u.userID === message.author.id) + 1;

                const targetUserObj = message.member;
                const fetchedLevel = userData;

                const { Font } = require('canvacord');
                Font.loadDefault();

                const rank = new canvacord.RankCardBuilder()
                    .setTextStyles({
                        level: "SEVİYE:",
                        xp: "XP:",
                        rank: "SIRALAMA:",
                    })
                    .setAvatar(
                        targetUserObj.user.displayAvatarURL({
                            size: 256,
                            forceStatic: true,
                        })
                    )
                    .setRank(currentRank)
                    .setLevel(fetchedLevel.level)
                    .setCurrentXP(fetchedLevel.xp)
                    .setRequiredXP(calculateLevelXp(fetchedLevel.level))
                    .setStatus(targetUserObj.presence?.status || "offline")
                    .setUsername(targetUserObj.user.username)
                    .setDisplayName(targetUserObj.displayName);

                const image = await rank.build({ format: 'png' });
                const attachment = new AttachmentBuilder(image, { name: 'rank.png' });

                const levelChannel = guildData.levelChannel ? message.guild.channels.cache.get(guildData.levelChannel) : message.channel;

                if (levelChannel) {
                    await levelChannel.send({
                        content: `${message.member}, **${userData.level}. seviyeye** ulaştınız!`,
                        files: [attachment]
                    });
                }
            }
        }

        await guildData.save();

        cooldowns.add(message.author.id);
        setTimeout(() => cooldowns.delete(message.author.id), 30000);

    } catch (error) {
        console.log(`XP verirken hata oluştu: ${error}`);
    }
};
