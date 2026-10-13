const { Client, Interaction, ApplicationCommandOptionType } = require('discord.js');
const { getTranslator } = require('../../utils/language');
const economySchema = require('../../schemas/economySchema');
const { addBalance } = require('../../utils/economy');
const { rarities } = require('../../utils/animals');
const { buildSellMessage } = require('../../utils/sellView');

const ALL_RARITIES = 'hepsi';

module.exports = {
    name: 'sat',
    description: 'Yakaladığın hayvanları satarsın. Seçenek vermezsen tek tek satabileceğin liste açılır.',
    aliases: [{ name: 'sell', description: 'Sell the animals you caught. With no option it opens a list to sell one by one.', language: 'en' }],

    mainOnly: true,
    skipUsageLog: true,
    cooldownSeconds: 5,

    options: [
        {
            name: 'nadirlik',
            description: 'Bu nadirlikteki bütün hayvanları tek seferde satar',
            type: ApplicationCommandOptionType.String,
            choices: [
                { name: 'Hepsi', value: ALL_RARITIES },
                ...rarities.map((rarity) => ({ name: rarity.name, value: rarity.id })),
            ],
        },
    ],

    /**
     * With no option, opens the member's private sell list, whose buttons are handled in
     * events/interactionCreate/handleSell.js. With a rarity, sells every animal of that rarity: the animals
     * are removed in one atomic update and paid from the account as it was before the removal, so an
     * animal can never be sold twice.
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const t = getTranslator(interaction);
        const rarityId = interaction.options.getString('nadirlik');
        const guildID = interaction.guild.id;
        const userID = interaction.user.id;

        if (!rarityId) {
            const sellMessage = await buildSellMessage(t, guildID, userID);
            await interaction.reply({ ...(sellMessage ?? { content: t('sell.nothing') }), ephemeral: true });
            return;
        }

        const soldRarities = rarityId === ALL_RARITIES ? rarities : rarities.filter((rarity) => rarity.id === rarityId);

        if (!soldRarities.length) {
            await interaction.reply({ content: t('sell.invalid'), ephemeral: true });
            return;
        }

        const removal = {};
        for (const rarity of soldRarities) {
            for (const animal of rarity.animals) removal[`animals.${animal.id}`] = '';
        }

        const accountBeforeSale = await economySchema.findOneAndUpdate({ guildID, userID }, { $unset: removal });

        let earnings = 0;
        let soldCount = 0;
        for (const rarity of soldRarities) {
            for (const animal of rarity.animals) {
                const count = accountBeforeSale?.animals.get(animal.id) ?? 0;
                if (!Number.isSafeInteger(count) || count <= 0) continue;

                soldCount += count;
                earnings += count * rarity.price;
            }
        }

        if (soldCount === 0) {
            await interaction.reply({ content: t('sell.nothing'), ephemeral: true });
            return;
        }

        const account = await addBalance(guildID, userID, earnings);

        await interaction.reply({
            content: t('sell.done', { count: soldCount, earnings: t.coins(earnings), wallet: t.coins(account.balance) }),
        });
    }
};
