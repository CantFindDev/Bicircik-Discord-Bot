const LogBuilder = require("../../utils/logBuilder");

module.exports = async (client, oldMember, newMember) => {
    try {
        if (oldMember.nickname === newMember.nickname) return;

        const oldNick = oldMember.nickname || oldMember.user.username;
        const newNick = newMember.nickname || newMember.user.username;

        await new LogBuilder(newMember.guild)
            .setTitle("✏️ Kullanıcı Takma Adı Değişti")
            .setDescription(`**<@${newMember.user.id}>** takma adını değiştirdi`)
            .addField("Eski Takma Ad", oldNick, true)
            .addField("Yeni Takma Ad", newNick, true)
            .setColor("Yellow")
            .send();

    } catch (err) {
        console.error("Takma ad değişikliği loglanırken hata oluştu:", err);
    }
};
