const { Client, Interaction, ApplicationCommandOptionType } = require('discord.js');
const { getTranslator } = require('../../utils/language');
const { getAccount } = require('../../utils/economy');

module.exports = {
    name: 'bakiye',
    description: 'Cüzdanındaki parayı gösterir.',
    aliases: [{ name: 'balance', description: 'Shows the coins in your wallet.', language: 'en' }],

    mainOnly: true,
    skipUsageLog: true,
    cooldownSeconds: 3,

    options: [
        {
            name: 'hedef-kullanıcı',
            description: 'Bakiyesini görmek istediğin kullanıcı',
            type: ApplicationCommandOptionType.User,
        },
    ],

    /**
     * Shows the balance of the command user or of the chosen member.
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const t = getTranslator(interaction);
        const targetUser = interaction.options.getUser('hedef-kullanıcı') ?? interaction.user;

        if (targetUser.bot) {
            await interaction.reply({ content: t('common.botNoWallet'), ephemeral: true });
            return;
        }

        const account = await getAccount(interaction.guild.id, targetUser.id);

        await interaction.reply({
            content: targetUser.id === interaction.user.id
                ? t('balance.self', { coins: t.coins(account.balance) })
                : t('balance.other', { user: targetUser.username, coins: t.coins(account.balance) }),
        });
    }
};
