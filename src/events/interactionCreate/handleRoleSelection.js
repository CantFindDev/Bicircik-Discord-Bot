const rolAlSchema = require('../../schemas/roleSchema');

module.exports = async (client, interaction) => {
  if (interaction.isStringSelectMenu() && interaction.customId === 'rolAlSelect') {
    
    try {
      await interaction.deferReply({ ephemeral: true });

      const selectedRoleIds = interaction.values;
      const member = interaction.member;
      
      if (!member) return;

      const data = await rolAlSchema.findOne({ guildID: interaction.guild.id });
      if (!data) {
        return interaction.editReply({ content: 'Rol alma sistemi ayarlı değil.' });
      }
      
      const addedRoles = [];
      const removedRoles = [];

      for (const roleId of selectedRoleIds) {
        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) continue;

        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId).catch(err => console.error(err));
          removedRoles.push(role.name);
        } else {
          await member.roles.add(roleId).catch(err => console.error(err));
          addedRoles.push(role.name);
        }
      }

      let infoMsg = "İşlem tamamlandı.";
      if (addedRoles.length > 0 || removedRoles.length > 0) {
        infoMsg = "";
        if (addedRoles.length > 0) infoMsg += `✅ **Verilenler:** ${addedRoles.join(', ')}\n`;
        if (removedRoles.length > 0) infoMsg += `🗑️ **Alınanlar:** ${removedRoles.join(', ')}`;
      } else {
          infoMsg = "Herhangi bir değişiklik yapılmadı.";
      }

      await interaction.editReply({ content: infoMsg });

    } catch (error) {
      console.error("Rol güncelleme hatası:", error);
      await interaction.editReply({ content: 'Bir hata oluştu.' }).catch(() => {});
    }
    
    return;
  }
};

module.exports.registerReactionHandlers = (client) => {
  client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;

    const { message, emoji } = reaction;
    if (!message.guild) return;

    const data = await rolAlSchema.findOne({ guildID: message.guild.id, messageID: message.id });
    if (!data) return;

    const emojiIdOrName = emoji.id ? emoji.id : emoji.name;
    const roleData = data.roles.find(r => r.emoji === emojiIdOrName);
    if (!roleData) return;

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    const role = message.guild.roles.cache.get(roleData.roleId);
    if (!role) return;

    if (!member.roles.cache.has(role.id)) {
      await member.roles.add(role).catch(() => {});
    }
  });

  client.on('messageReactionRemove', async (reaction, user) => {
    if (user.bot) return;

    const { message, emoji } = reaction;
    if (!message.guild) return;

    const data = await rolAlSchema.findOne({ guildID: message.guild.id, messageID: message.id });
    if (!data) return;

    const emojiIdOrName = emoji.id ? emoji.id : emoji.name;
    const roleData = data.roles.find(r => r.emoji === emojiIdOrName);
    if (!roleData) return;

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    const role = message.guild.roles.cache.get(roleData.roleId);
    if (!role) return;

    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role).catch(() => {});
    }
  });
};