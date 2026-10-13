const { Client, Interaction, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
const { getTranslator } = require('../../utils/language');
const { betOption, tryCharge, addBalance, getAccount, randomInt } = require('../../utils/economy');

const TURN_TIMEOUT_MS = 60_000;
const DEALER_STAND_VALUE = 17;
const BLACKJACK = 21;
const HIT_ID = 'blackjackHit';
const STAND_ID = 'blackjackStand';

const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const suits = ['♠️', '♥️', '♦️', '♣️'];

/** Members with a game in progress. One game per member, so a bet cannot be opened many times at once. */
const activePlayers = new Set();

/** Draws from an endless deck, so every card is independent of the ones before it. */
const drawCard = () => ({ rank: ranks[randomInt(0, ranks.length - 1)], suit: suits[randomInt(0, suits.length - 1)] });

/** Best hand value, counting each ace as 11 unless that would bust the hand. */
const getHandValue = (hand) => {
    let value = 0;
    let aces = 0;

    for (const card of hand) {
        if (card.rank === 'A') {
            aces += 1;
            value += 11;
        } else {
            value += ['J', 'Q', 'K'].includes(card.rank) ? 10 : Number(card.rank);
        }
    }

    while (value > BLACKJACK && aces > 0) {
        value -= 10;
        aces -= 1;
    }

    return value;
};

const formatHand = (hand) => hand.map((card) => `\`${card.rank}${card.suit}\``).join(' ');

const buildEmbed = (t, user, bet, playerHand, dealerHand, isDealerHidden, footer) => new EmbedBuilder()
    .setTitle(`🃏 Blackjack • ${user.username}`)
    .addFields(
        {
            name: t('blackjack.yourHand', { value: getHandValue(playerHand) }),
            value: formatHand(playerHand),
        },
        {
            name: isDealerHidden ? t('blackjack.dealer') : t('blackjack.dealerValue', { value: getHandValue(dealerHand) }),
            value: isDealerHidden ? `${formatHand([dealerHand[0]])} \`??\`` : formatHand(dealerHand),
        },
    )
    .setFooter({ text: footer ?? t('blackjack.bet', { bet: t.number(bet) }) })
    .setColor('DarkGreen');

const buildButtons = (t) => new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(HIT_ID).setLabel(t('blackjack.hit')).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(STAND_ID).setLabel(t('blackjack.stand')).setStyle(ButtonStyle.Secondary),
);

/**
 * Lets the player hit until they stand, reach 21, bust or stop answering. No answer counts as standing.
 * A failure here is never refunded: the player has already seen the cards, so a refund would be a free look.
 */
const playPlayerTurn = async (interaction, message, bet, playerHand, dealerHand) => {
    const t = getTranslator(interaction);

    while (getHandValue(playerHand) < BLACKJACK) {
        let press;
        try {
            press = await message.awaitMessageComponent({
                componentType: ComponentType.Button,
                time: TURN_TIMEOUT_MS,
                filter: (component) => {
                    if (component.user.id === interaction.user.id) return true;
                    component.reply({ content: t('blackjack.notYours'), ephemeral: true }).catch(() => {});
                    return false;
                },
            });
        } catch {
            return;
        }

        if (press.customId !== HIT_ID) {
            await press.deferUpdate();
            return;
        }

        playerHand.push(drawCard());

        if (getHandValue(playerHand) >= BLACKJACK) {
            await press.deferUpdate();
            return;
        }

        await press.update({ embeds: [buildEmbed(t, interaction.user, bet, playerHand, dealerHand, true)] });
    }
};

module.exports = {
    name: 'blackjack',
    description: 'Krupiyeye karşı 21 oynarsın.',
    language: 'auto',

    mainOnly: true,
    skipUsageLog: true,
    cooldownSeconds: 5,

    options: [betOption],

    /**
     * Plays one blackjack hand. The bet is charged before the cards are dealt, a win pays double,
     * a natural blackjack pays two and a half times the bet, a tie returns the bet.
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const t = getTranslator(interaction);
        const bet = interaction.options.getInteger('miktar');
        const guildID = interaction.guild.id;
        const userID = interaction.user.id;
        const playerKey = `${guildID}:${userID}`;

        if (!Number.isSafeInteger(bet) || bet < betOption.min_value || bet > betOption.max_value) {
            await interaction.reply({ content: t('common.invalidBet'), ephemeral: true });
            return;
        }

        if (activePlayers.has(playerKey)) {
            await interaction.reply({ content: t('blackjack.active'), ephemeral: true });
            return;
        }

        activePlayers.add(playerKey);

        try {
            if (!await tryCharge(guildID, userID, bet)) {
                await interaction.reply({ content: t('common.notEnough'), ephemeral: true });
                return;
            }

            const playerHand = [drawCard(), drawCard()];
            const dealerHand = [drawCard(), drawCard()];
            const isNatural = getHandValue(playerHand) === BLACKJACK;

            try {
                await interaction.reply({
                    embeds: [buildEmbed(t, interaction.user, bet, playerHand, dealerHand, true)],
                    components: isNatural ? [] : [buildButtons(t)],
                });
            } catch (error) {
                await addBalance(guildID, userID, bet);
                throw error;
            }

            if (!isNatural) {
                try {
                    const message = await interaction.fetchReply();
                    await playPlayerTurn(interaction, message, bet, playerHand, dealerHand);
                } catch (error) {
                    console.error('Blackjack turn was interrupted, settling the hand as it stands:', error);
                }
            }

            const playerValue = getHandValue(playerHand);
            if (playerValue <= BLACKJACK) {
                while (getHandValue(dealerHand) < DEALER_STAND_VALUE) dealerHand.push(drawCard());
            }
            const dealerValue = getHandValue(dealerHand);
            const isDealerNatural = dealerHand.length === 2 && dealerValue === BLACKJACK;

            let payout = 0;
            if (playerValue > BLACKJACK) payout = 0;
            else if (isNatural && !isDealerNatural) payout = Math.floor(bet * 2.5);
            else if (dealerValue > BLACKJACK || playerValue > dealerValue) payout = bet * 2;
            else if (playerValue === dealerValue) payout = bet;

            if (payout > 0) await addBalance(guildID, userID, payout);

            const account = await getAccount(guildID, userID);

            let outcome = t('blackjack.lost', { amount: t.number(bet) });
            if (payout === bet) outcome = t('blackjack.tie');
            if (payout > bet) outcome = t('blackjack.won', { amount: t.number(payout - bet) });

            await interaction.editReply({
                embeds: [buildEmbed(t, interaction.user, bet, playerHand, dealerHand, false, t('blackjack.footer', { outcome, wallet: t.number(account.balance) }))],
                components: [],
            });
        } finally {
            activePlayers.delete(playerKey);
        }
    }
};
