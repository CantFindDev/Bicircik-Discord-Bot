const {Client,Interaction, ApplicationCommandOptionType,PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'deletechannel',
    description: 'Delete channel',

    memberPermissions: [PermissionFlagsBits.ManageChannels],
    botPermissions: [PermissionFlagsBits.ManageChannels],

    options: [
            {
                name: 'target-channel',
                description: 'channel to delete',
                required: true,
                type: ApplicationCommandOptionType.Channel,
            }
    ],
    
    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {

        const channelID = interaction.options.get("target-channel").value;
        const channel = client.channels.cache.get(channelID);
        
        await interaction.reply({ content: `Deleted channel "${channel.name}" `, ephemeral: true });
        channel.delete();
    }
}