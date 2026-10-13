const { Client, Interaction, ApplicationCommandOptionType } = require('discord.js');
const { getTranslator } = require('../../utils/language');
const { tryCharge, addBalance } = require('../../utils/economy');

const MAX_TRANSFER = 1_000_000;

module.exports = {
    name: 'gönder',
    description: 'Başka bir kullanıcıya para gönderirsin.',
    aliases: [{ name: 'pay', description: 'Send coins to another member.', language: 'en' }],

    mainOnly: true,
    skipUsageLog: true,
    cooldownSeconds: 10,

    options: [
        {
            name: 'hedef-kullanıcı',
            description: 'Para gönderilecek kullanıcı',
            required: true,
            type: ApplicationCommandOptionType.User,
        },
        {
            name: 'miktar',
            description: 'Gönderilecek miktar',
            required: true,
            type: ApplicationCommandOptionType.Integer,
            min_value: 1,
            max_value: MAX_TRANSFER,
        },
    ],

    /**
     * Moves coins from the command user to another member. The sender is charged first, atomically.
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const t = getTranslator(interaction);
        const targetUser = interaction.options.getUser('hedef-kullanıcı');
        const amount = interaction.options.getInteger('miktar');
        const guildID = interaction.guild.id;

        if (!Number.isSafeInteger(amount) || amount < 1 || amount > MAX_TRANSFER) {
            await interaction.reply({ content: t('pay.range', { max: t.number(MAX_TRANSFER) }), ephemeral: true });
            return;
        }

        if (targetUser.bot || targetUser.id === interaction.user.id) {
            await interaction.reply({ content: t('pay.invalidTarget'), ephemeral: true });
            return;
        }

        const isMember = await interaction.guild.members.fetch(targetUser.id).then(() => true, () => false);
        if (!isMember) {
            await interaction.reply({ content: t('pay.notMember'), ephemeral: true });
            return;
        }

        const senderAccount = await tryCharge(guildID, interaction.user.id, amount);
        if (!senderAccount) {
            await interaction.reply({ content: t('common.notEnough'), ephemeral: true });
            return;
        }

        try {
            await addBalance(guildID, targetUser.id, amount);
        } catch (error) {
            await addBalance(guildID, interaction.user.id, amount);
            throw error;
        }

        await interaction.reply({
            content: t('pay.done', { sender: interaction.user, target: targetUser, coins: t.coins(amount) }),
        });
    }
};
