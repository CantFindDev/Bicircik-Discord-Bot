const rolAlSchema = require('../../schemas/roleSchema');

module.exports = async (client, interaction) => {
  if (interaction.isStringSelectMenu() && interaction.customId === 'rolAlSelect') {
    const selectedRoleIds = interaction.values;
    const member = interaction.member;
    if (!member) return;

    const data = await rolAlSchema.findOne({ guildID: interaction.guild.id });
    if (!data) return interaction.reply({ content: 'Rol alma sistemi ayarlı değil.', ephemeral: true });

    const systemRoleIds = data.roles.map(r => r.roleId);

    for (const roleId of systemRoleIds) {
      if (member.roles.cache.has(roleId) && !selectedRoleIds.includes(roleId)) {
        await member.roles.remove(roleId).catch(() => {});
      }
    }

    for (const roleId of selectedRoleIds) {
      if (!member.roles.cache.has(roleId)) {
        await member.roles.add(roleId).catch(() => {});
      }
    }

    await interaction.reply({ content: 'Roller başarıyla güncellendi.', ephemeral: true });
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
