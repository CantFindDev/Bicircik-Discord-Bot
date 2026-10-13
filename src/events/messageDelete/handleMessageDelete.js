const LogBuilder = require("../../utils/logBuilder");

module.exports = async (client, message) => {
    try {
        if (message.partial) return;
        if (message.author?.bot) return;

        await new LogBuilder(message.guild)
            .setAuthor(message.author)
            .setTitle("🗑 Mesaj Silindi")
            .setDescription(`${message.channel} kanalında **${message.author}** tarafından gönderilen bir mesaj silindi`)
            .addField("Silinen İçerik", `\`\`\`${message.content || "*İçerik yok*"}\`\`\``, false)
            .addField("Yazan ID", message.author.id, true)
            .addField("Kanal ID", message.channel.id, true)
            .setColor("Red")
            .send();

    } catch (err) {
        console.error("Failed to log the message deletion:", err);
    }
};
