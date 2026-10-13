const LogBuilder = require("../../utils/logBuilder");

module.exports = async (client, oldMessage, newMessage) => {
    try {
        if (oldMessage.partial || newMessage.partial) return;
        if (oldMessage.author?.bot) return;

        if (oldMessage.content === newMessage.content) return;

        await new LogBuilder(newMessage.guild)
            .setAuthor(newMessage.author)
            .setTitle("✏ Mesaj Düzenlendi")
            .setDescription(`${newMessage.channel} kanalında **${newMessage.author}** tarafından gönderilen bir mesaj düzenlendi`)
            .addField("Eski Mesaj", `\`\`\`${oldMessage.content || "*İçerik yok*"}\`\`\``, false)
            .addField("Yeni Mesaj", `\`\`\`${newMessage.content || "*İçerik yok*"}\`\`\``, false)
            .addField("Mesaja Git", `[Mesajı Gör](${newMessage.url})`, false)
            .setColor("Yellow")
            .send();

    } catch (err) {
        console.error("Failed to log the message edit:", err);
    }
};
