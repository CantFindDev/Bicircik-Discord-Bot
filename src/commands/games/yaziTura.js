const { Client, Interaction, ApplicationCommandOptionType } = require('discord.js');
const { getTranslator } = require('../../utils/language');
const { betOption, tryCharge, addBalance, randomInt } = require('../../utils/economy');

const sides = ['yazi', 'tura'];

module.exports = {
    name: 'yazı-tura',
    description: 'Yazı tura atarsın. Bilirsen bahsin ikiye katlanır.',
    aliases: [{ name: 'coinflip', description: 'Flip a coin. Call it right to double your bet.', language: 'en' }],

    mainOnly: true,
    skipUsageLog: true,
    cooldownSeconds: 4,

    options: [
        betOption,
        {
            name: 'seçim',
            description: 'Yazı mı tura mı',
            required: true,
            type: ApplicationCommandOptionType.String,
            choices: [
                { name: 'Yazı', value: 'yazi' },
                { name: 'Tura', value: 'tura' },
            ],
        },
    ],

    /**
     * Charges the bet, flips a fair coin and pays double on a correct call.
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const t = getTranslator(interaction);
        const bet = interaction.options.getInteger('miktar');
        const choice = interaction.options.getString('seçim');
        const guildID = interaction.guild.id;
        const userID = interaction.user.id;

        if (!sides.includes(choice) || !Number.isSafeInteger(bet) || bet < betOption.min_value || bet > betOption.max_value) {
            await interaction.reply({ content: t('common.invalidBet'), ephemeral: true });
            return;
        }

        let account = await tryCharge(guildID, userID, bet);
        if (!account) {
            await interaction.reply({ content: t('common.notEnough'), ephemeral: true });
            return;
        }

        const result = randomInt(0, 1) === 0 ? 'yazi' : 'tura';
        const hasWon = result === choice;
        if (hasWon) account = await addBalance(guildID, userID, bet * 2);

        await interaction.reply({
            content: [
                t('coinflip.result', { side: t(`coinflip.side.${result}`) }),
                t(hasWon ? 'coinflip.won' : 'coinflip.lost', { coins: t.coins(bet) }),
                t('common.wallet', { coins: t.coins(account.balance) }),
            ].join('\n'),
        });
    }
};
