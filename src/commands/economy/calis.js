const { Client, Interaction } = require('discord.js');
const { getTranslator } = require('../../utils/language');
const { claimCooldown, addBalance, relativeTime, randomInt } = require('../../utils/economy');

const WORK_COOLDOWN_MS = 60 * 60 * 1000;
const MIN_REWARD = 100;
const MAX_REWARD = 300;

module.exports = {
    name: 'çalış',
    description: 'Çalışıp para kazanırsın. Saatte bir kullanılır.',
    aliases: [{ name: 'work', description: 'Work to earn coins. Usable once an hour.', language: 'en' }],

    mainOnly: true,
    skipUsageLog: true,
    cooldownSeconds: 5,

    /**
     * Pays a random wage once per hour. The job sentences come from the `work.jobs` list of the reply language.
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const t = getTranslator(interaction);
        const guildID = interaction.guild.id;
        const userID = interaction.user.id;

        const { claimed, readyAt } = await claimCooldown(guildID, userID, 'lastWork', WORK_COOLDOWN_MS);
        if (!claimed) {
            await interaction.reply({ content: t('work.cooldown', { time: relativeTime(readyAt) }), ephemeral: true });
            return;
        }

        const reward = randomInt(MIN_REWARD, MAX_REWARD);
        const jobs = t('work.jobs');
        const job = jobs[randomInt(0, jobs.length - 1)];
        const account = await addBalance(guildID, userID, reward);

        await interaction.reply({
            content: t('work.done', { job, reward: t.coins(reward), wallet: t.coins(account.balance) }),
        });
    }
};
