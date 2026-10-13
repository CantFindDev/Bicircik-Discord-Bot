const {
    Client,
    Interaction,
    ApplicationCommandOptionType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
    StringSelectMenuBuilder,
} = require('discord.js');
const { getTranslator } = require('../../utils/language');
const { betOption, tryCharge, addBalance, getAccount } = require('../../utils/economy');
const { MAX_HP, getFighters, simulateBattle } = require('../../utils/animalBattle');

const ANSWER_TIMEOUT_MS = 60_000;
const PICK_TIMEOUT_MS = 60_000;
const FRAME_DELAY_MS = 1500;
const MAX_FRAMES = 8;
const SHOWN_LOG_LINES = 6;
const HP_BAR_LENGTH = 10;

const ACCEPT_ID = 'duelAccept';
const DECLINE_ID = 'duelDecline';
const PICK_ID = 'duelPick';
const ANIMAL_SELECT_ID = 'duelAnimal';

/** Members inside a duel, from the offer to the result. One duel per member at a time. */
const activeDuelists = new Set();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const formatFighter = (fighter) => `${fighter.emoji} ${fighter.name}`;

const formatStats = (fighter) => `💪 ${fighter.power} ⚡ ${fighter.speed} 🍀 ${fighter.luck}`;

const buildHpBar = (hp) => {
    const filled = Math.ceil(hp / MAX_HP * HP_BAR_LENGTH);
    return '🟩'.repeat(filled) + '⬛'.repeat(HP_BAR_LENGTH - filled);
};

const buildAnswerButtons = (t) => new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(ACCEPT_ID).setLabel(t('duel.accept')).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(DECLINE_ID).setLabel(t('duel.decline')).setStyle(ButtonStyle.Danger),
);

const buildPickButton = (t) => new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(PICK_ID).setLabel(t('duel.pickButton')).setStyle(ButtonStyle.Primary),
);

const buildAnimalMenu = (t, fighters) => new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
        .setCustomId(ANIMAL_SELECT_ID)
        .setPlaceholder(t('duel.pickPlaceholder'))
        .addOptions(fighters.map((fighter) => ({
            label: fighter.name.slice(0, 100),
            description: formatStats(fighter),
            emoji: fighter.emoji,
            value: fighter.key,
        }))),
);

const buildBattleEmbed = (t, players, hp, logLines) => new EmbedBuilder()
    .setTitle(t('duel.title'))
    .setDescription(logLines.slice(-SHOWN_LOG_LINES).join('\n') || t('duel.start'))
    .addFields(players.map((player, index) => ({
        name: formatFighter(player.fighter),
        value: `${player.user}\n${formatStats(player.fighter)}\n${buildHpBar(hp[index])} ${hp[index]}/${MAX_HP}`,
        inline: true,
    })))
    .setColor('DarkRed');

/**
 * Lets both players choose an animal in private. Each press of the button opens a menu only that
 * player sees, filled with the animals read from the database for that player. A choice is looked up
 * in that same list, so a player can only send an animal they own. A player who does not choose in
 * time fights with their strongest animal.
 */
const collectPicks = async (t, message, players) => {
    const picks = [null, null];
    let isClosed = false;

    const handlePress = async (press, collector) => {
        const index = players.findIndex((player) => player.user.id === press.user.id);
        if (index === -1) {
            await press.reply({ content: t('duel.notInDuel'), ephemeral: true });
            return;
        }

        if (picks[index]) {
            await press.reply({ content: t('duel.alreadyPicked'), ephemeral: true });
            return;
        }

        await press.reply({ content: t('duel.pickPrompt'), components: [buildAnimalMenu(t, players[index].fighters)], ephemeral: true });
        const menuMessage = await press.fetchReply();

        let choice;
        try {
            choice = await menuMessage.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: PICK_TIMEOUT_MS });
        } catch {
            return;
        }

        const fighter = players[index].fighters.find((candidate) => candidate.key === choice.values[0]);
        if (isClosed || picks[index] || !fighter) {
            await choice.update({ content: t(isClosed ? 'duel.pickClosed' : 'duel.alreadyPicked'), components: [] });
            return;
        }

        picks[index] = fighter;
        await choice.update({ content: t('duel.picked', { animal: formatFighter(fighter) }), components: [] });

        if (picks[0] && picks[1]) collector.stop();
    };

    await new Promise((resolve) => {
        const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: PICK_TIMEOUT_MS });

        collector.on('collect', (press) => {
            handlePress(press, collector).catch((error) => console.error('Duel animal pick failed:', error));
        });
        collector.on('end', resolve);
    });

    isClosed = true;
    return picks.map((pick, index) => pick ?? players[index].fighters[0]);
};

/** Shows the fight a few turns at a time. The result is already paid out, so a failed edit changes nothing. */
const playBattle = async (t, interaction, players, battle, resultText) => {
    const turnsPerFrame = Math.ceil(battle.turns.length / MAX_FRAMES);
    const logLines = [];
    let hp = [MAX_HP, MAX_HP];

    await interaction.editReply({ content: '', embeds: [buildBattleEmbed(t, players, hp, logLines)], components: [] });

    for (let shown = 0; shown < battle.turns.length; shown += turnsPerFrame) {
        await wait(FRAME_DELAY_MS);

        for (const turn of battle.turns.slice(shown, shown + turnsPerFrame)) {
            hp = turn.hp;
            logLines.push(t(`duel.log.${turn.type}`, {
                attacker: `**${formatFighter(players[turn.attacker].fighter)}**`,
                defender: `**${formatFighter(players[1 - turn.attacker].fighter)}**`,
                damage: turn.damage,
            }));
        }

        const isLastFrame = shown + turnsPerFrame >= battle.turns.length;
        await interaction.editReply({
            content: isLastFrame ? resultText : '',
            embeds: [buildBattleEmbed(t, players, hp, logLines)],
        });
    }
};

module.exports = {
    name: 'düello',
    description: 'Bir kullanıcıya bahisli hayvan düellosu teklif edersin. Kazanan ortadaki parayı alır.',
    aliases: [{ name: 'duel', description: 'Challenge a member to an animal duel for coins. The winner takes the pot.', language: 'en' }],

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
     * Challenges another member to an animal duel. Both choose an animal in private, then the animals fight.
     * Nobody is charged until both animals are chosen. Both sides are then charged atomically, the fight
     * is decided and the winner is paid before any of it is shown, so nothing is held while the fight plays.
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
        const opponentKey = `${guildID}:${opponent.id}`;

        if (!Number.isSafeInteger(bet) || bet < betOption.min_value || bet > betOption.max_value) {
            await interaction.reply({ content: t('common.invalidBet'), ephemeral: true });
            return;
        }

        if (opponent.bot || opponent.id === challenger.id) {
            await interaction.reply({ content: t('duel.invalidTarget'), ephemeral: true });
            return;
        }

        if (activeDuelists.has(challengerKey)) {
            await interaction.reply({ content: t('duel.pending'), ephemeral: true });
            return;
        }

        activeDuelists.add(challengerKey);
        let isOpponentLocked = false;

        try {
            const [challengerAccount, challengerFighters] = await Promise.all([
                getAccount(guildID, challenger.id),
                getFighters(t, guildID, challenger.id),
            ]);

            if (!challengerFighters.length) {
                await interaction.reply({ content: t('duel.noAnimals'), ephemeral: true });
                return;
            }

            if (challengerAccount.balance < bet) {
                await interaction.reply({ content: t('common.notEnough'), ephemeral: true });
                return;
            }

            await interaction.reply({
                content: t('duel.offer', { opponent, challenger, coins: t.coins(bet) }),
                components: [buildAnswerButtons(t)],
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

            if (activeDuelists.has(opponentKey)) {
                await answer.update({ content: t('duel.opponentBusy', { opponent }), components: [] });
                return;
            }
            activeDuelists.add(opponentKey);
            isOpponentLocked = true;

            const opponentFighters = await getFighters(t, guildID, opponent.id);
            if (!opponentFighters.length) {
                await answer.update({ content: t('duel.opponentNoAnimals', { opponent }), components: [] });
                return;
            }

            const players = [
                { user: challenger, fighters: challengerFighters, fighter: null },
                { user: opponent, fighters: opponentFighters, fighter: null },
            ];

            await answer.update({ content: t('duel.choose', { challenger, opponent }), components: [buildPickButton(t)] });

            const picks = await collectPicks(t, message, players);
            players[0].fighter = picks[0];
            players[1].fighter = picks[1];

            if (!await tryCharge(guildID, challenger.id, bet)) {
                await interaction.editReply({ content: t('duel.challengerBroke', { challenger }), components: [] });
                return;
            }

            if (!await tryCharge(guildID, opponent.id, bet)) {
                await addBalance(guildID, challenger.id, bet);
                await interaction.editReply({ content: t('duel.opponentBroke', { opponent }), components: [] });
                return;
            }

            const battle = simulateBattle(players[0].fighter, players[1].fighter);
            const winner = players[battle.winner];
            const loser = players[1 - battle.winner];

            try {
                await addBalance(guildID, winner.user.id, bet * 2);
            } catch (error) {
                await addBalance(guildID, challenger.id, bet).catch(() => {});
                await addBalance(guildID, opponent.id, bet).catch(() => {});
                throw error;
            }

            const resultText = t('duel.result', {
                winner: winner.user,
                animal: formatFighter(winner.fighter),
                loser: loser.user,
                coins: t.coins(bet),
            });

            await playBattle(t, interaction, players, battle, resultText).catch(async (error) => {
                console.error('Duel replay failed, the result is already paid:', error);
                await interaction.followUp({ content: resultText }).catch(() => {});
            });
        } finally {
            activeDuelists.delete(challengerKey);
            if (isOpponentLocked) activeDuelists.delete(opponentKey);
        }
    }
};
