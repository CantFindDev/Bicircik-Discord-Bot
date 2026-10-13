const { Client, Interaction } = require('discord.js');
const { getTranslator } = require('../../utils/language');
const economySchema = require('../../schemas/economySchema');
const { claimCooldown, relativeTime } = require('../../utils/economy');
const { rollAnimal } = require('../../utils/animals');

const HUNT_COOLDOWN_MS = 60 * 1000;

module.exports = {
    name: 'avlan',
    description: 'Ava çıkıp rastgele bir hayvan yakalarsın. Dakikada bir kullanılır.',
    aliases: [{ name: 'hunt', description: 'Go hunting and catch a random animal. Usable once a minute.', language: 'en' }],

    mainOnly: true,
    skipUsageLog: true,
    cooldownSeconds: 3,

    /**
     * Adds one random animal to the member's zoo, once per minute.
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const t = getTranslator(interaction);
        const guildID = interaction.guild.id;
        const userID = interaction.user.id;

        const { claimed, readyAt } = await claimCooldown(guildID, userID, 'lastHunt', HUNT_COOLDOWN_MS);
        if (!claimed) {
            await interaction.reply({ content: t('hunt.cooldown', { time: relativeTime(readyAt) }), ephemeral: true });
            return;
        }

        const { animal, rarity } = rollAnimal();
        await economySchema.updateOne({ guildID, userID }, { $inc: { [`animals.${animal.id}`]: 1 } });

        await interaction.reply({
            content: t('hunt.caught', {
                user: interaction.user.username,
                emoji: animal.emoji,
                animal: t(`animal.${animal.id}`),
                rarity: t(`rarity.${rarity.id}`),
                price: t.coins(rarity.price),
            }),
        });
    }
};
