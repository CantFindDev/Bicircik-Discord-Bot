const { 
  Client, 
  ChannelType, 
  Interaction, 
  ApplicationCommandOptionType, 
  PermissionFlagsBits 
} = require('discord.js');

module.exports = {
  name: 'rol-kaldır',
  description: 'Belirtilen rolü sunucudaki tüm üyelerden kaldırır',

  memberPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.ManageRoles],

  options: [
    {
      name: 'rol',
      description: 'Tüm üyelerden kaldırılacak rol',
      type: ApplicationCommandOptionType.Role,
      required: true,
    }
  ],

  /**
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: true });

    const rol = interaction.options.getRole('rol');
    if (!rol) {
      return interaction.editReply('Rol bulunamadı!');
    }

    await interaction.guild.members.fetch();

    const roleSahipleri = interaction.guild.members.cache.filter(uye => uye.roles.cache.has(rol.id));

    if (roleSahipleri.size === 0) {
      return interaction.editReply(`Sunucuda "${rol.name}" rolüne sahip hiçbir üye yok.`);
    }

    let basariSayisi = 0;
    let hataSayisi = 0;

    for (const [uyeId, uye] of roleSahipleri) {
      try {
        await uye.roles.remove(rol, `${interaction.user.tag} tarafından komut ile kaldırıldı.`);
        basariSayisi++;

      } catch (error) {
        console.error(`${uye.user.tag} kullanıcısından rol çıkarılamadı.`, error);
        hataSayisi++;
      }
    }

    return interaction.editReply(`"${rol.name}" rolü başarıyla ${basariSayisi} üyeden kaldırıldı.${hataSayisi > 0 ? ` ${hataSayisi} üyeden kaldırılamadı.` : ''}`);
  }
};
