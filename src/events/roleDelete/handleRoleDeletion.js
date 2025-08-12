const LogBuilder = require("../../utils/logBuilder");

module.exports = async (client, role) => {
    try {
        await new LogBuilder(role.guild)
            .setTitle("🗑 Rol Silindi")
            .setDescription(`**${role.name}** rolü silindi`)
            .addField("Rol ID", role.id, true)
            .addField("Bahsedilebilir", role.mentionable ? "Evet" : "Hayır", true)
            .addField("Ayırıldı mı", role.hoist ? "Evet" : "Hayır", true)
            .addField("Renk", role.hexColor, true)
            .setColor("Red")
            .send();

    } catch (err) {
        console.error("Rol silme olayı loglanırken hata oluştu:", err);
    }
};
