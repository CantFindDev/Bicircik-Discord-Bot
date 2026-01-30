const { 
    ModalBuilder, TextInputBuilder, ActionRowBuilder, 
    TextInputStyle, ChannelType, PermissionFlagsBits 
} = require("discord.js");
const Team = require('../../schemas/teamSchema'); // Yeni şema dosyanın yolu
const LogBuilder = require("../../utils/logBuilder");

module.exports = async (client, interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'teamRegisterButton') return;

    if (!interaction.member.roles.cache.has('1466607918429372447')) {
        return interaction.reply({
            content: "❌ Bu komutu kullanmak için gerekli role sahip değilsin!",
            ephemeral: true
        });
    }

    const existingTeam = await Team.findOne({ 
        guildID: interaction.guild.id, 
        $or: [
            { teamOwnerID: interaction.user.id },
            { teamMembers: interaction.user.id }
        ]
    });

    if (existingTeam) {
        return interaction.reply({ 
            content: `❌ Zaten **${existingTeam.teamName}** ekibinin bir parçasısınız. Yeni bir ekip kuramazsınız.`, 
            ephemeral: true 
        });
    }

    // 1. MODAL OLUŞTURMA
    const modal = new ModalBuilder()
        .setTitle('Ekip Kayıt Formu')
        .setCustomId(`teamModal-${interaction.user.id}`);

    const nameInput = new TextInputBuilder()
        .setCustomId('teamNameInput')
        .setLabel('Takımınızın Adı')
        .setPlaceholder('Örn: Bıcırcıklar')
        .setRequired(true)
        .setStyle(TextInputStyle.Short);

    modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
    await interaction.showModal(modal);

    try {
        const filter = i => i.customId === `teamModal-${interaction.user.id}`;
        const modalInteraction = await interaction.awaitModalSubmit({ filter, time: 90_000 });
        
        await modalInteraction.deferReply({ ephemeral: true });

        const teamName = modalInteraction.fields.getTextInputValue('teamNameInput');
        const guild = modalInteraction.guild;

        const teamRole = await guild.roles.create({
            name: `👥 ${teamName}`,
            color: 'Random',
            reason: `${teamName} ekibi için oluşturuldu.`
        });

        await modalInteraction.member.roles.add(teamRole);

        const category = await guild.channels.create({
            name: teamName.toUpperCase(),
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: teamRole.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel, 
                        PermissionFlagsBits.SendMessages, 
                        PermissionFlagsBits.Connect,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.ManageChannels,
                        PermissionFlagsBits.ManageMessages,
                        PermissionFlagsBits.MoveMembers,
                        PermissionFlagsBits.MuteMembers,
                        PermissionFlagsBits.DeafenMembers,
                        PermissionFlagsBits.PrioritySpeaker
                    ],
                },
            ],
        });

        await guild.channels.create({
            name: `💬-${teamName.toLowerCase()}-sohbet`,
            type: ChannelType.GuildText,
            parent: category.id,
        });

        await guild.channels.create({
            name: `🔊 Ses Odası 1`,
            type: ChannelType.GuildVoice,
            parent: category.id,
        });
        await guild.channels.create({
            name: `🔊 Ses Odası 2`,
            type: ChannelType.GuildVoice,
            parent: category.id,
        });

        await Team.create({
            guildID: guild.id,
            teamOwnerID: modalInteraction.user.id,
            teamName: teamName,
            teamRoleID: teamRole.id,
            teamCategoryID: category.id,
            teamMembers: [modalInteraction.user.id] // Sahibi ilk üye olarak ekle
        });

        await modalInteraction.editReply({ 
            content: `✅ **${teamName}** ekibi başarıyla kuruldu!\nRolünüz verildi ve size özel kanallar oluşturuldu.` 
        });

        await new LogBuilder(guild)
            .setTitle("🆕 Yeni Ekip Kuruldu")
            .setDescription(`**${modalInteraction.user.tag}** bir ekip kurdu.`)
            .addField("Ekip Adı", teamName, true)
            .addField("Rol", `<@&${teamRole.id}>`, true)
            .setColor("Green")
            .send();

    } catch (err) {
        if (err.code === 'InteractionCollectorError') {
            return;
        }
        console.error(err);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: "❌ Bir hata oluştu, lütfen yetkilerimi kontrol edin.", ephemeral: true });
        }
    }
};