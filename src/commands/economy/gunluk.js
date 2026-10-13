const { Client, Interaction } = require('discord.js');
const { getTranslator } = require('../../utils/language');
const { claimCooldown, addBalance, relativeTime } = require('../../utils/economy');
const economySchema = require('../../schemas/economySchema');

const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const STREAK_GRACE_MS = 48 * 60 * 60 * 1000;
const BASE_REWARD = 500;
const STREAK_BONUS = 50;
const MAX_BONUS_DAYS = 10;

module.exports = {
    name: 'günlük',
    description: 'Günlük ödülünü alırsın. Her gün alırsan seri bonusu büyür.',
    aliases: [{ name: 'daily', description: 'Claim your daily reward. The streak bonus grows each day.', language: 'en' }],

    mainOnly: true,
    skipUsageLog: true,
    cooldownSeconds: 5,

    /**
     * Pays the daily reward once per 24 hours. The streak grows when the last claim is under 48 hours old.
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const t = getTranslator(interaction);
        const guildID = interaction.guild.id;
        const userID = interaction.user.id;

        const { claimed, previous, readyAt } = await claimCooldown(guildID, userID, 'lastDaily', DAILY_COOLDOWN_MS);
        if (!claimed) {
            await interaction.reply({ content: t('daily.cooldown', { time: relativeTime(readyAt) }), ephemeral: true });
            return;
        }

        const isStreakAlive = previous?.lastDaily && Date.now() - previous.lastDaily.getTime() < STREAK_GRACE_MS;
        const streak = isStreakAlive ? previous.dailyStreak + 1 : 1;
        const reward = BASE_REWARD + STREAK_BONUS * Math.min(streak - 1, MAX_BONUS_DAYS);

        await economySchema.updateOne({ guildID, userID }, { $set: { dailyStreak: streak } });
        const account = await addBalance(guildID, userID, reward);

        await interaction.reply({
            content: t('daily.claimed', { reward: t.coins(reward), streak, wallet: t.coins(account.balance) }),
        });
    }
};
