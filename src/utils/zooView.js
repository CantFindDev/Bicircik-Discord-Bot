const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const exoticAnimalSchema = require('../schemas/exoticAnimalSchema');
const { getAccount } = require('./economy');
const { rarities } = require('./animals');
const { tiers, getSpeciesEmoji } = require('./dailyShop');
const { formatStats } = require('./shopView');

const PAGE_ID_PREFIX = 'zooPage';
const PAGE_INFO_ID = 'zooPageInfo';
const ANIMALS_PER_PAGE = 10;
const READ_EXOTIC_COUNT = 200;

/**
 * Every animal of the member as `{ header, line }`, rarest first: shop animals by tier, then hunted
 * species by rarity. Also returns the animal count and the sell value of the hunted ones.
 */
const readAnimals = async (t, guildID, userID) => {
    const [account, exotics] = await Promise.all([
        getAccount(guildID, userID),
        exoticAnimalSchema.find({ guildID, userID }).sort({ price: -1 }).limit(READ_EXOTIC_COUNT).lean(),
    ]);

    const entries = [];
    let totalCount = exotics.length;
    let totalValue = 0;

    for (const tier of [...tiers].reverse()) {
        const header = t('zoo.exoticTier', { tier: t(`shop.tier.${tier.id}`) });

        for (const exotic of exotics) {
            if (exotic.tier !== tier.id) continue;

            entries.push({
                header,
                line: `${getSpeciesEmoji(exotic.species)} ${t(`shop.species.${exotic.species}`)} • ${t(`shop.trait.${exotic.trait}`)} • ${formatStats(exotic)}`,
            });
        }
    }

    for (const rarity of [...rarities].reverse()) {
        const header = t(`rarity.${rarity.id}`);

        for (const animal of rarity.animals) {
            const count = account.animals.get(animal.id) ?? 0;
            if (count <= 0) continue;

            entries.push({ header, line: `${animal.emoji} ${t(`animal.${animal.id}`)} ×${count} • ${formatStats(animal)}` });
            totalCount += count;
            totalValue += count * rarity.price;
        }
    }

    return { entries, totalCount, totalValue };
};

/** Joins one page of entries, printing each header once above its lines. */
const renderPage = (entries) => {
    const lines = [];
    let lastHeader = null;

    for (const entry of entries) {
        if (entry.header !== lastHeader) {
            if (lines.length) lines.push('');
            lines.push(`**${entry.header}**`);
            lastHeader = entry.header;
        }
        lines.push(entry.line);
    }

    return lines.join('\n');
};

/**
 * Builds one page of a member's zoo, or returns null when the member has no animals.
 * A page button carries the reply language, the owner's id and the page to open. The page is read
 * from the database again on every press, so the buttons keep working after a restart.
 * @param {string} title shown above the list, the owner's name is part of it
 * @param {number} page zero based, clamped to the pages that exist
 */
const buildZooMessage = async (t, guildID, userID, title, page = 0) => {
    const { entries, totalCount, totalValue } = await readAnimals(t, guildID, userID);
    if (!entries.length) return null;

    const pageCount = Math.ceil(entries.length / ANIMALS_PER_PAGE);
    const shownPage = Math.min(Math.max(page, 0), pageCount - 1);
    const pageEntries = entries.slice(shownPage * ANIMALS_PER_PAGE, (shownPage + 1) * ANIMALS_PER_PAGE);

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(renderPage(pageEntries))
        .setFooter({ text: t('zoo.footer', { count: totalCount, value: t.number(totalValue) }) })
        .setColor('Green');

    if (pageCount === 1) return { embeds: [embed], components: [] };

    const pageId = (target) => `${PAGE_ID_PREFIX}:${t.language}:${userID}:${target}`;

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(pageId(shownPage - 1)).setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(shownPage === 0),
        new ButtonBuilder().setCustomId(PAGE_INFO_ID).setLabel(`${shownPage + 1} / ${pageCount}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId(pageId(shownPage + 1)).setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(shownPage === pageCount - 1),
    );

    return { embeds: [embed], components: [buttons] };
};

module.exports = { PAGE_ID_PREFIX, buildZooMessage };
