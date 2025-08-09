const { Client,ChannelType, Interaction, ApplicationCommandOptionType, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const ticketSchema = require('../../schemas/ticketSchema');

module.exports = {
    name: 'ticket',
    description: 'ticket system',

    deleted: false,

    memberPermissions: [PermissionFlagsBits.Administrator],
    botPermissions: [PermissionFlagsBits.Administrator],

    options: [
        {
            name: 'send',
            description: 'the name for the open select menu content',
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
                },
                {
                    name: 'channel',
                    description: 'channel to send message to',
                    type: ApplicationCommandOptionType.Channel,
                    channel_types: [ChannelType.GuildText],
                },
            ]
        },
        {
            name: 'setup',
            description: 'Setup the ticket category',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'category',
                    description: 'The category to send tickets in',
                    required: true,
                    type: ApplicationCommandOptionType.Channel,
                    channel_types: [ChannelType.GuildCategory],
                },
                {
                    name: 'transcriptchannel',
                    description: 'The channel to send ticket transcripts',
                    required: true,
                    type: ApplicationCommandOptionType.Channel,
                    channel_types: [ChannelType.GuildText],
                },
            ]
        },
        {
            name: 'remove',
            description: 'Setup the ticket category',
            type: ApplicationCommandOptionType.Subcommand,
        },
    ],

    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        
        const sub = interaction.options.getSubcommand();
        const data = await ticketSchema.findOne({ guildID: interaction.guild.id })

        switch (sub) {
            case 'send':
                if (!data) return await interaction.reply({ content: 'You have to do /ticket setup before you can send a ticket message...', ephemeral: true });
    
                const channelOption = interaction.options.getChannel('channel');
                const ticketMessageChannel = channelOption ?? interaction.channel;

                if (!ticketMessageChannel || !ticketMessageChannel.isTextBased()) {
                    return await interaction.reply({ content: 'Invalid channel selected or I cannot send messages there.', ephemeral: true });
                }

                const ticketName = interaction.options.getString('name');
                const ticketMessage = interaction.options.getString('message') || 'Create a ticket to talk with the server staff! Once you select below, use the input to describe why you are creating the ticket';

                const select = new ActionRowBuilder()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('ticketCreateSelect')
                            .setPlaceholder(ticketName)
                            .setMinValues(0)
                            .addOptions(
                                {
                                    label: 'Create your ticket',
                                    description: 'Click to begin the ticket creation process',
                                    value: 'createTicket'
                                }
                            )
                    );
    
                const embed = new EmbedBuilder()
                    .setColor('Blurple')
                    .setTitle('Create a ticket!')
                    .setDescription(ticketMessage)
                    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });
    
                await interaction.reply({ content: `I have sent your ticket message ${ticketMessageChannel}.`, ephemeral: true });
                await ticketMessageChannel.send({ embeds: [embed], components: [select] });
                break;
            case 'remove':
                if (!data) return await interaction.reply({ content: `Looks like you don't already have a ticket system set!`, ephemeral: true })
                await ticketSchema.deleteOne({ guildID: interaction.guild.id });
                await interaction.reply({ content: `I have deleted your ticket category.`, ephemeral: true });
                break;
            case 'setup':
                if (data) return await interaction.reply({ content: `looks like you already have a ticket category set to <#${data.category}>`, ephemeral: true });
                const category = interaction.options.getChannel('category');
                const transcriptChannel = interaction.options.getChannel('transcriptchannel');
                await ticketSchema.create({
                    guildID: interaction.guild.id,
                    category: category.id,
                    transcriptsChannel: transcriptChannel.id
                });

                await interaction.reply({ content: `I have set the category to **${category}**! use /ticket send to send a ticket create message`, ephemeral: true })
                break;
        }
    }
}