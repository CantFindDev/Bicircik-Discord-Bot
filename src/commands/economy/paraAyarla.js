const { Client, Interaction, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const { getTranslator } = require('../../utils/language');
const { adjustBalance } = require('../../utils/economy');
const LogBuilder = require('../../utils/logBuilder');

const MAX_ADJUSTMENT = 10_000_000;

module.exports = {
    name: 'para-ayarla',
    description: 'Kullanıcının cüzdanına para ekler veya çıkarır.',
    aliases: [{ name: 'set-money', description: 'Adds coins to a wallet or removes coins from it.', language: 'en' }],

    mainOnly: true,

    memberPermissions: [PermissionFlagsBits.Administrator],

    options: [
        {
            name: 'hedef-kullanıcı',
            description: 'Cüzdanı değiştirilecek kullanıcı',
            required: true,
            type: ApplicationCommandOptionType.User,
        },
        {
            name: 'miktar',
            description: 'Eklenecek miktar, çıkarmak için eksi değer',
            required: true,
            type: ApplicationCommandOptionType.Integer,
            min_value: -MAX_ADJUSTMENT,
            max_value: MAX_ADJUSTMENT,
        },
    ],

    /**
     * Adds a signed amount to a member's balance. The balance never drops below zero.
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const t = getTranslator(interaction);
        const targetUser = interaction.options.getUser('hedef-kullanıcı');
        const amount = interaction.options.getInteger('miktar');

        if (!Number.isSafeInteger(amount) || amount === 0 || Math.abs(amount) > MAX_ADJUSTMENT) {
            await interaction.reply({ content: t('setMoney.invalid', { max: t.number(MAX_ADJUSTMENT) }), ephemeral: true });
            return;
        }

        if (targetUser.bot) {
            await interaction.reply({ content: t('common.botNoWallet'), ephemeral: true });
            return;
        }

        const account = await adjustBalance(interaction.guild.id, targetUser.id, amount);

        await new LogBuilder(interaction.guild)
            .setTitle('💰 Bakiye Değiştirildi')
            .addField('Kullanıcı', `${targetUser.tag} (\`${targetUser.id}\`)`, true)
            .addField('Yetkili', interaction.user.tag, true)
            .addField('Değişim', String(amount), true)
            .addField('Yeni Bakiye', String(account.balance), true)
            .setColor('Gold')
            .send();

        await interaction.reply({ content: t('setMoney.done', { user: targetUser.tag, coins: t.coins(account.balance) }), ephemeral: true });
    }
};
