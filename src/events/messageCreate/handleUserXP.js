const { AttachmentBuilder } = require('discord.js');
const levelSchema = require('../../schemas/levelSchema');
const calculateLevelXp = require('../../utils/calculateLevelXp');
const cooldowns = new Set();
const signUpSettings = require('../../schemas/registrationSchema');
const canvacord = require('canvacord');
const { rollRewards, claimLevelRewards } = require('../../utils/levelRewards');
const { formatCoins } = require('../../utils/economy');

const XP_COOLDOWN_MS = 30000;

function getRandomXP(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Gives chat XP once per XP_COOLDOWN_MS per member, and pays a coin reward when a rewarded level is reached.
 * The cooldown is claimed before the first await, so two messages sent together are not both counted.
 * The reward itself goes through claimLevelRewards, which never pays a level twice.
 */
module.exports = async (client, message) => {
    if (!message.inGuild() || message.author.bot) return;

    const cooldownKey = `${message.guild.id}:${message.author.id}`;
    if (cooldowns.has(cooldownKey)) return;

    cooldowns.add(cooldownKey);
    setTimeout(() => cooldowns.delete(cooldownKey), XP_COOLDOWN_MS).unref();

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
            userData.xp += xpToGive;

            if (userData.xp >= calculateLevelXp(userData.level)) {
                userData.xp = 0;
                userData.level += 1;

                await guildData.save();
                const reward = await claimLevelRewards(message.guild.id, message.author.id, userData.level, rollRewards);

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
                        content: `${message.member}, **${userData.level}. seviyeye** ulaştınız!` + (reward > 0 ? ` Ödül: **${formatCoins(reward)}**` : ''),
                        files: [attachment]
                    });
                }
            }
        }

        await guildData.save();

    } catch (error) {
        console.error('Failed to give XP:', error);
    }
};
