const { Client, Interaction, ApplicationCommandOptionType } = require('discord.js');
const { getTranslator } = require('../../utils/language');
const { buildZooMessage } = require('../../utils/zooView');

module.exports = {
    name: 'hayvanat-bahçesi',
    description: 'Yakaladığın hayvanları gösterir.',
    aliases: [{ name: 'zoo', description: 'Shows the animals you caught.', language: 'en' }],

    mainOnly: true,
    skipUsageLog: true,
    cooldownSeconds: 5,

    options: [
        {
            name: 'hedef-kullanıcı',
            description: 'Hayvanlarını görmek istediğin kullanıcı',
            type: ApplicationCommandOptionType.User,
        },
    ],

    /**
     * Lists the animals of the command user or of the chosen member, rarest first: one header per shop
     * tier and per hunt rarity, one line per animal with its duel stats. Page buttons are handled in
     * events/interactionCreate/handleZoo.js.
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const t = getTranslator(interaction);
        const targetUser = interaction.options.getUser('hedef-kullanıcı') ?? interaction.user;

        if (targetUser.bot) {
            await interaction.reply({ content: t('zoo.botNoZoo'), ephemeral: true });
            return;
        }

        const title = t('zoo.title', { user: targetUser.username });
        const zooMessage = await buildZooMessage(t, interaction.guild.id, targetUser.id, title);

        await interaction.reply(zooMessage ?? { content: t('zoo.empty', { user: targetUser.username }) });
    }
};
