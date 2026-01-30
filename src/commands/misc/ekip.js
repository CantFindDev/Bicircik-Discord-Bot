const { 
  ChannelType, PermissionFlagsBits, ApplicationCommandOptionType, 
  EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType
} = require('discord.js');
const Team = require('../../schemas/teamSchema'); 
const LogBuilder = require("../../utils/logBuilder");

module.exports = {
  name: 'ekip',
  description: 'Ekip yönetim sistemi',

  options: [
    {
      name: 'ekle',
      description: 'Ekibe yeni bir üye ekler (Sadece Ekip Sahibi)',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: 'kullanıcı', description: 'Eklenecek kullanıcı', required: true, type: ApplicationCommandOptionType.User },
      ],
    },
    {
      name: 'çıkart',
      description: 'Ekipten bir üyeyi çıkartır (Sadece Ekip Sahibi)',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: 'kullanıcı', description: 'Çıkartılacak kullanıcı', required: true, type: ApplicationCommandOptionType.User },
      ],
    },
    {
      name: 'ayrıl',
      description: 'Bulunduğunuz ekipten kendi rızanızla ayrılırsınız.',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'adlandır',
      description: 'Ekibin adını değiştirir (Sadece Ekip Sahibi)',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: 'yeni-isim', description: 'Yeni ekip adı', required: true, type: ApplicationCommandOptionType.String },
      ],
    },
    {
      name: 'sil',
      description: 'Kendi ekibinizi tamamen siler',
      type: ApplicationCommandOptionType.Subcommand,
      options: [],
    }
  ],

  callback: async (client, interaction) => {
    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild;

    // --- AYRIL KOMUTU ---
    if (subcommand === 'ayrıl') {
      await interaction.deferReply({ ephemeral: true });

      const teamData = await Team.findOne({ guildID: guild.id, teamMembers: interaction.user.id });

      if (!teamData) {
        return interaction.editReply("❌ Herhangi bir ekibin üyesi değilsiniz.");
      }

      if (teamData.teamOwnerID === interaction.user.id) {
        return interaction.editReply("❌ Ekip sahibi olduğunuz için bu komutla ayrılamazsınız. Ekibi silmek için `/ekip sil` komutunu kullanın.");
      }

      const role = guild.roles.cache.get(teamData.teamRoleID);
      const member = interaction.member;

      if (role && member.roles.cache.has(role.id)) {
        await member.roles.remove(role).catch(() => null);
      }

      teamData.teamMembers = teamData.teamMembers.filter(id => id !== interaction.user.id);
      await teamData.save();

      return interaction.editReply(`✅ **${teamData.teamName}** ekibinden başarıyla ayrıldınız.`);
    }

      if (!interaction.member.roles.cache.has('1466607918429372447')) {
    return interaction.reply({ 
        content: "❌ Bu komutu kullanmak için gerekli role sahip değilsin!", 
        ephemeral: true 
    });
}

// --- EKLE KOMUTU ---
    if (subcommand === 'ekle') {
      await interaction.deferReply({ ephemeral: true });
      const targetUser = interaction.options.getMember('kullanıcı');
      
      const teamData = await Team.findOne({ guildID: guild.id, teamOwnerID: interaction.user.id });
      if (!teamData) return interaction.editReply("❌ Size ait bir ekip bulunamadı.");

      const isTargetInAnyTeam = await Team.findOne({
        guildID: guild.id,
        $or: [
          { teamOwnerID: targetUser.id },
          { teamMembers: targetUser.id }
        ]
      });

      if (isTargetInAnyTeam) {
        return interaction.editReply(`❌ ${targetUser} zaten bir ekibe dahil (sahibi veya üyesi).`);
      }

      const role = guild.roles.cache.get(teamData.teamRoleID);
      if (!role) return interaction.editReply("❌ Ekip rolü sunucuda bulunamadı.");

      await targetUser.roles.add(role).catch(() => null);
      teamData.teamMembers.push(targetUser.id);
      await teamData.save();

      return interaction.editReply(`✅ ${targetUser} başarıyla ekibinize eklendi.`);
    }

    // --- ÇIKART KOMUTU ---
    if (subcommand === 'çıkart') {
      await interaction.deferReply({ ephemeral: true });
      const targetUser = interaction.options.getMember('kullanıcı');

      const teamData = await Team.findOne({ guildID: guild.id, teamOwnerID: interaction.user.id });
      if (!teamData) return interaction.editReply("❌ Size ait bir ekip bulunamadı.");

      if (targetUser.id === interaction.user.id) return interaction.editReply("❌ Kendinizi ekipten çıkartamazsınız.");

      const role = guild.roles.cache.get(teamData.teamRoleID);
      if (role) await targetUser.roles.remove(role).catch(() => null);

      teamData.teamMembers = teamData.teamMembers.filter(id => id !== targetUser.id);
      await teamData.save();

      return interaction.editReply(`✅ ${targetUser} ekibinizden çıkartıldı.`);
    }

    // --- ADLANDIR KOMUTU ---
    if (subcommand === 'adlandır') {
      await interaction.deferReply({ ephemeral: true });
      const newName = interaction.options.getString('yeni-isim');

      const teamData = await Team.findOne({ guildID: guild.id, teamOwnerID: interaction.user.id });
      if (!teamData) return interaction.editReply("❌ Size ait bir ekip bulunamadı.");

      const role = guild.roles.cache.get(teamData.teamRoleID);
      const category = guild.channels.cache.get(teamData.teamCategoryID);

      if (role) await role.setName(`👥 ${newName}`).catch(() => null);
      if (category) await category.setName(newName.toUpperCase()).catch(() => null);

      teamData.teamName = newName;
      await teamData.save();

      return interaction.editReply(`✅ Ekibinizin adı **${newName}** olarak güncellendi.`);
    }

    // --- SİL KOMUTU ---
    if (subcommand === 'sil') {
      const teamData = await Team.findOne({ guildID: guild.id, teamOwnerID: interaction.user.id });

      if (!teamData) {
        return interaction.reply({ content: "❌ Sahibi olduğunuz aktif bir ekip bulunamadı.", ephemeral: true });
      }

      const confirmEmbed = new EmbedBuilder()
        .setTitle("⚠️ Emin Misiniz?")
        .setDescription(`**${teamData.teamName}** ekibini silmek üzeresiniz. Bu işlem geri alınamaz!`)
        .setColor("Red");

      const confirmBtn = new ButtonBuilder().setCustomId('confirm_delete').setLabel('Ekibimi Sil').setStyle(ButtonStyle.Danger);
      const cancelBtn = new ButtonBuilder().setCustomId('cancel_delete').setLabel('İptal').setStyle(ButtonStyle.Secondary);
      const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);

      const response = await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });

      const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

      collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) return;

        if (i.customId === 'cancel_delete') {
          return i.update({ content: "✅ İşlem iptal edildi.", embeds: [], components: [] });
        }

        if (i.customId === 'confirm_delete') {
          await i.deferUpdate();

          await i.editReply({ content: `🗑️ **${teamName}** ekibi siliniyor...`, embeds: [], components: [] }).catch(() => null);

          const category = guild.channels.cache.get(teamData.teamCategoryID);
    
          if (category) {
            const channels = guild.channels.cache.filter(c => c.parentId === category.id);
            for (const [id, ch] of channels) {
              await ch.delete().catch(() => null);
            }
            await category.delete().catch(() => null);
          }

          const role = guild.roles.cache.get(teamData.teamRoleID);
          if (role) await role.delete().catch(() => null);

          await Team.deleteOne({ _id: teamData._id });

          return i.editReply({ content: `✅ **${teamData.teamName}** başarıyla yok edildi.` }).catch(() => null);
        }
      });
    }
  }
}