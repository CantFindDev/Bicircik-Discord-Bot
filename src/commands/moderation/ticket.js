const { Client,ChannelType, Interaction, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const ticketSchema = require('../../models/ticketSchema');

module.exports = {
    name: 'ticket',
    description: 'ticket system',
    options: [
        {
            name: 'send',
            description: 'the name for the open select menu content',
            required: true,
            type: ApplicationCommandOptionType.Subcommand,
            
            options: [
                {
                    name: 'name',
                    description: 'the name for the open select menu content',
                    required: true,
                    type: ApplicationCommandOptionType.String,
                },
                {
                    name: 'message',
                    description: 'a custom message to add to the embed',
                    type: ApplicationCommandOptionType.String,
                }
            ]
        },
        {
            name: 'setup',
            description: 'Setup the ticket category',
            required: true,
            type: ApplicationCommandOptionType.Subcommand,
            
            options: [
                {
                    name: 'category',
                    description: 'The category to send tickets in',
                    required: true,
                    type: ApplicationCommandOptionType.Channel,
                    channel_types: [ChannelType.GuildCategory],
                },
            ]
        },
    ],

    deleted: true,
    mainOnly: true,

    permissionsRequired: [PermissionFlagsBits.Administrator],
    botPermissions: [PermissionFlagsBits.Administrator],

    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
       
    }
}