const { Client, Interaction, ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getTranslator } = require('../../utils/language');
const { betOption, tryCharge, addBalance, getAccount, randomInt } = require('../../utils/economy');

const ANSWER_TIMEOUT_MS = 60_000;
const ACCEPT_ID = 'coinDuelAccept';
const DECLINE_ID = 'coinDuelDecline';

/** Members with an open challenge. One challenge per member at a time. */
const activeChallengers = new Set();

const buildButtons = (t) => new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(ACCEPT_ID).setLabel(t('duel.accept')).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(DECLINE_ID).setLabel(t('duel.decline')).setStyle(ButtonStyle.Danger),
);

module.exports = {
    name: 'yazı-tura-düello',
    description: 'Bir kullanıcıya bahisli yazı tura düellosu teklif edersin. Şans yarı yarıya.',
    aliases: [{ name: 'coin-duel', description: 'Challenge a member to a fifty-fifty coin duel for coins.', language: 'en' }],

    mainOnly: true,
    skipUsageLog: true,
    cooldownSeconds: 15,

    options: [
        {
            name: 'rakip',
            description: 'Düello teklif edilecek kullanıcı',
            required: true,
            type: ApplicationCommandOptionType.User,
        },
        betOption,
    ],

    /**
     * Challenges another member to a fifty-fifty duel with no animals involved. Nobody is charged until
     * the opponent accepts. Both sides are then charged atomically, and the challenger is refunded when
     * the opponent cannot pay.
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const t = getTranslator(interaction);
        const opponent = interaction.options.getUser('rakip');
        const bet = interaction.options.getInteger('miktar');
        const guildID = interaction.guild.id;
        const challenger = interaction.user;
        const challengerKey = `${guildID}:${challenger.id}`;

        if (!Number.isSafeInteger(bet) || bet < betOption.min_value || bet > betOption.max_value) {
            await interaction.reply({ content: t('common.invalidBet'), ephemeral: true });
            return;
        }

        if (opponent.bot || opponent.id === challenger.id) {
            await interaction.reply({ content: t('duel.invalidTarget'), ephemeral: true });
            return;
        }

        if (activeChallengers.has(challengerKey)) {
            await interaction.reply({ content: t('duel.pending'), ephemeral: true });
            return;
        }

        activeChallengers.add(challengerKey);

        try {
            const challengerAccount = await getAccount(guildID, challenger.id);
            if (challengerAccount.balance < bet) {
                await interaction.reply({ content: t('common.notEnough'), ephemeral: true });
                return;
            }

            await interaction.reply({
                content: t('coinDuel.offer', { opponent, challenger, coins: t.coins(bet) }),
                components: [buildButtons(t)],
            });
            const message = await interaction.fetchReply();

            let answer;
            try {
                answer = await message.awaitMessageComponent({
                    componentType: ComponentType.Button,
                    time: ANSWER_TIMEOUT_MS,
                    filter: (component) => {
                        if (component.user.id === opponent.id) return true;
                        component.reply({ content: t('duel.notForYou'), ephemeral: true }).catch(() => {});
                        return false;
                    },
                });
            } catch {
                await interaction.editReply({ content: t('duel.noAnswer', { opponent }), components: [] }).catch(() => {});
                return;
            }

            if (answer.customId !== ACCEPT_ID) {
                await answer.update({ content: t('duel.declined', { opponent }), components: [] });
                return;
            }

            if (!await tryCharge(guildID, challenger.id, bet)) {
                await answer.update({ content: t('duel.challengerBroke', { challenger }), components: [] });
                return;
            }

            if (!await tryCharge(guildID, opponent.id, bet)) {
                await addBalance(guildID, challenger.id, bet);
                await answer.update({ content: t('duel.opponentBroke', { opponent }), components: [] });
                return;
            }

            const winner = randomInt(0, 1) === 0 ? challenger : opponent;
            const loser = winner.id === challenger.id ? opponent : challenger;

            try {
                await addBalance(guildID, winner.id, bet * 2);
            } catch (error) {
                await addBalance(guildID, challenger.id, bet).catch(() => {});
                await addBalance(guildID, opponent.id, bet).catch(() => {});
                throw error;
            }

            await answer.update({
                content: t('coinDuel.result', { winner, loser, coins: t.coins(bet) }),
                components: [],
            }).catch(() => {});
        } finally {
            activeChallengers.delete(challengerKey);
        }
    }
};
