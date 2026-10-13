const LogBuilder = require("../../utils/logBuilder");

module.exports = async (client, role) => {
    try {
        await new LogBuilder(role.guild)
            .setTitle("🆕 Rol Oluşturuldu")
            .setDescription(`Yeni bir rol oluşturuldu: **${role.name}**`)
            .addField("Rol ID", role.id, true)
            .addField("Bahsedilebilir", role.mentionable ? "Evet" : "Hayır", true)
            .addField("Ayırıldı mı", role.hoist ? "Evet" : "Hayır", true)
            .addField("Renk", role.hexColor, true)
            .setColor("Green")
            .send();

    } catch (err) {
        console.error("Failed to log the role creation:", err);
    }
};
