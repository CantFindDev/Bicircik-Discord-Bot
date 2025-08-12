const LogBuilder = require("../../utils/logBuilder");

module.exports = async (client, oldRole, newRole) => {
  try {
    const changes = [];

    if (oldRole.name !== newRole.name)
      changes.push(`**İsim:** \`${oldRole.name}\` → \`${newRole.name}\``);

    if (oldRole.color !== newRole.color)
      changes.push(`**Renk:** \`${oldRole.hexColor}\` → \`${newRole.hexColor}\``);

    if (oldRole.hoist !== newRole.hoist)
      changes.push(`**Ayırıldı mı:** \`${oldRole.hoist ? "Evet" : "Hayır"}\` → \`${newRole.hoist ? "Evet" : "Hayır"}\``);

    if (oldRole.mentionable !== newRole.mentionable)
      changes.push(`**Bahsedilebilir mi:** \`${oldRole.mentionable ? "Evet" : "Hayır"}\` → \`${newRole.mentionable ? "Evet" : "Hayır"}\``);

    if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
      changes.push(`**İzinler:** Değiştirildi`);
    }

    if (changes.length === 0) return;

    await new LogBuilder(newRole.guild)
      .setTitle("✏️ Rol Güncellendi")
      .setDescription(`**${newRole.name}** rolü aşağıdaki değişikliklerle güncellendi:`)
      .addField("Değişiklikler", changes.join("\n"))
      .setColor("Yellow")
      .send();

  } catch (err) {
    console.error("Rol güncelleme loglanırken hata oluştu:", err);
  }
};
