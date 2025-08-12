const LogBuilder = require("../../utils/logBuilder");

module.exports = async (client, channel) => {
    try {
        await new LogBuilder(channel.guild)
            .setTitle("🗑 Channel Deleted")
            .setDescription(`The channel **${channel.name}** was deleted`)
            .addField("Channel ID", channel.id, true)
            .addField("Type", channel.type, true)
            .setColor("Red")
            .send();

    } catch (err) {
        console.error("Error logging channel deletion:", err);
    }
};
