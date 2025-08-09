const {Client,Interaction, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, ChannelType, EmbedBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require("discord.js");
const ticketSchema = require('../../schemas/ticketSchema');
const ticketChannelSchema = require('../../schemas/ticketChannelSchema');
const { createTranscript } = require('discord-html-transcripts');

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */
module.exports = async (client, interaction) => { 
     const user = interaction.user;
    const data = await ticketSchema.findOne({ guildID: interaction.guild.id });
    const userData = await ticketChannelSchema.findOne({ userID: user.id });
    

    switch (interaction.customId) {
        case 'ticketCreateSelect':
            if (userData) return await interaction.reply({ content: `You have already have a ongoing ticket at <#${userData.channelID}>`, ephemeral: true });
            
            const modal = new ModalBuilder()
                .setTitle('Create your ticket')
                .setCustomId('createTicketModal')
        
            const ticketReasonInput = new TextInputBuilder()
                .setCustomId('ticketCreationReason')
                .setRequired(true)
                .setPlaceholder('What is the reason for creating this ticket')
                .setLabel('Why are you creating this ticket?')
                .setStyle(TextInputStyle.Paragraph);
        
            const otherReasonInput = new TextInputBuilder()
                .setCustomId('additionalInformation')
                .setRequired(false)
                .setPlaceholder('Feel free to leave this blank')
                .setLabel('Provide us with any additional information')
                .setStyle(TextInputStyle.Paragraph);
        
            const firstActionRow = new ActionRowBuilder().addComponents(ticketReasonInput);
            const secondActionRow = new ActionRowBuilder().addComponents(otherReasonInput);

            modal.addComponents(firstActionRow, secondActionRow);
            await interaction.showModal(modal);
            break;
        case 'createTicketModal':
            if (!data) return await interaction.reply({ content: `Sorry! Looks like you found this message but the ticket system is not yet setup here.`, ephemeral: true })
        
            const ticketReasonValue = interaction.fields.getTextInputValue('ticketCreationReason');
            const additionalInformationValue = interaction.fields.getTextInputValue('additionalInformation');
            const category = await interaction.guild.channels.cache.get(data.category);

            const ticketChannel = await interaction.guild.channels.create({
                name: `ticket-${user.username}`,
                type: ChannelType.GuildText,
                topic: `Ticket user: ${user.username} | Ticket reason: ${ticketReasonValue}`,
                parent: category,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel]
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
                    }
                ]
            });

            await ticketChannelSchema.create({
                channelID: ticketChannel.id,
                userID: user.id,
            });

            const embed = new EmbedBuilder()
                .setColor("Blurple")
                .setTitle(`Ticket from ${user.username}`)
                .setDescription(`Opening Reason: ${ticketReasonValue}\n\n Additional Information: ${additionalInformationValue}`)
                .setTimestamp();
        
            const button = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('closeTicket')
                        .setLabel('Close Ticket')
                        .setStyle(ButtonStyle.Danger),
                
                    new ButtonBuilder()
                        .setCustomId('ticketTranscript')
                        .setLabel('Transcript')
                        .setStyle(ButtonStyle.Primary),
                );
        
            await ticketChannel.send({ embeds: [embed], components: [button] });
            await interaction.reply({ content: `Your ticket has been opened in ${ticketChannel}`, ephemeral: true })
            break;
        case 'closeTicket':
            const closeModal = new ModalBuilder()
                .setTitle('Ticket Closing')
                .setCustomId('closeTicketModal')
            
            const closeReasonInput = new TextInputBuilder()
                .setCustomId('closeTicketReason')
                .setRequired(true)
                .setPlaceholder('What is the reason for closing this ticket?')
                .setLabel('Provide a closing reason')
                .setStyle(TextInputStyle.Paragraph);
            
            const firstActionRowCloseTicketModal = new ActionRowBuilder().addComponents(closeReasonInput);

            closeModal.addComponents(firstActionRowCloseTicketModal);
            await interaction.showModal(closeModal);
            break;
        case 'closeTicketModal':
            const ticketChannelData = await ticketChannelSchema.findOne({ channelID: interaction.channel.id });
            const member = await interaction.guild.members.cache.get(ticketChannelData?.userID);

            const closeReason = interaction.fields.getTextInputValue('closeTicketReason');
            await interaction.reply({ content: 'Closing this ticket...' });

            const transcriptChannel = await interaction.guild.channels.cache.get(data.transcriptsChannel);
            const finalTranscript = await createTranscript(interaction.channel, {
                limit: -1,
                returnBuffer: false,
                filename: `${interaction.channel.name}.html`
            });
            
            await ticketChannelSchema.deleteOne({ userID: member.user.id });
            await transcriptChannel.send({ content: `**${member.user.username}**'s ticket got closed by **${interaction.user.username}** with the reason: \`${closeReason}\` \nTranscript of the conversation:`, files: [finalTranscript] });
            
            setTimeout(async () => {
                await interaction.channel.delete().catch(err => { });
                await member.send(`You are receiving this notification because your ticket in ${interaction.guild.name} has been closed for: \`${closeReason}\``).catch(err => { });
            }, 5000);
            
            break;
        case 'ticketTranscript':
            const transcript = await createTranscript(interaction.channel, {
                limit: -1,
                returnBuffer: false,
                filename: `${interaction.channel.name}.html`
            });

            var msg = await interaction.channel.send({ content: `Your transcript:`, files: [transcript] });
            // var message = `**Here is your [ticket transcript](https://mahto.id/chat-exporter?url=${msg.attachments.first()?.url}) from ${interaction.guild.name}!**`
            // await msg.delete().catch(err => { });
            // await interaction.reply({ content: message, ephemeral: true });
            break;
    }
}