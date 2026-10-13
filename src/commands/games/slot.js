const { Client, Interaction } = require('discord.js');
const { getTranslator } = require('../../utils/language');
const { betOption, tryCharge, addBalance, randomInt } = require('../../utils/economy');

/** Each symbol is equally likely. `multiplier` is the payout for three of a kind, as a multiple of the bet. */
const symbols = [
    { emoji: '🍒', multiplier: 3 },
    { emoji: '🍋', multiplier: 4 },
    { emoji: '🍇', multiplier: 6 },
    { emoji: '🔔', multiplier: 10 },
    { emoji: '💎', multiplier: 20 },
    { emoji: '🪲', multiplier: 50 },
];

/** Payout as a multiple of the bet: three of a kind pays the symbol's multiplier, a pair returns the bet. */
const getMultiplier = (reels) => {
    const [first, second, third] = reels;

    if (first === second && second === third) return first.multiplier;
    if (first === second || second === third || first === third) return 1;
    return 0;
};

module.exports = {
    name: 'slot',
    description: 'Slot makinesini çevirirsin. Üçü aynı gelirse büyük ödül.',
    language: 'auto',

    mainOnly: true,
    skipUsageLog: true,
    cooldownSeconds: 4,

    options: [betOption],

    /**
     * Charges the bet, spins three reels and pays by the multiplier table.
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const t = getTranslator(interaction);
        const bet = interaction.options.getInteger('miktar');
        const guildID = interaction.guild.id;
        const userID = interaction.user.id;

        if (!Number.isSafeInteger(bet) || bet < betOption.min_value || bet > betOption.max_value) {
            await interaction.reply({ content: t('common.invalidBet'), ephemeral: true });
            return;
        }

        let account = await tryCharge(guildID, userID, bet);
        if (!account) {
            await interaction.reply({ content: t('common.notEnough'), ephemeral: true });
            return;
        }

        const reels = [0, 1, 2].map(() => symbols[randomInt(0, symbols.length - 1)]);
        const multiplier = getMultiplier(reels);
        const payout = bet * multiplier;
        if (payout > 0) account = await addBalance(guildID, userID, payout);

        let outcome = t('slot.lost', { coins: t.coins(bet) });
        if (multiplier === 1) outcome = t('slot.pair');
        if (multiplier > 1) outcome = t('slot.triple', { multiplier, coins: t.coins(payout - bet) });

        await interaction.reply({
            content: `🎰 **[ ${reels.map((symbol) => symbol.emoji).join(' | ')} ]**\n${outcome}\n${t('common.wallet', { coins: t.coins(account.balance) })}`,
        });
    }
};
