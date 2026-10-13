const { Client, AttachmentBuilder } = require('discord.js');
const { Font } = require("canvacord");
const { GreetingsCard } = require("../../utils/canvacord/greetingsCard.js");
const welcomerSchema = require('../../schemas/welcomerSchema.js');
const isRecentDuplicate = require('../../utils/isRecentDuplicate.js');

/**
 * @param {Client} client
 * @param {import('discord.js').GuildMember} member
 */
module.exports = async (client, member) => {
    if (isRecentDuplicate(`welcome:${member.guild.id}:${member.id}`)) return;

    try {
        const data = await welcomerSchema.findOne({ guildID: member.guild.id });
        if (!data?.welcomeChannel) return;

        const welcomeChannel = member.guild.channels.cache.get(data.welcomeChannel);
        if (!welcomeChannel) return;

        const user = member.user;
        Font.loadDefault();

        const card = new GreetingsCard()
            .setAvatar(user.displayAvatarURL({
                size: 256,
                forceStatic: true,
            }))
            .setDisplayName(user.username)
            .setType("welcome")
            .setMessage("BUG Zone'a hoş geldin");

        const image = await card.build({ format: "png" });
        const attachment = new AttachmentBuilder(image);

        await welcomeChannel.send({ files: [attachment] });
        console.log(`Welcome card sent for ${user.tag}.`);
    } catch (error) {
        console.error("Failed to send the welcome card:", error);
    }
};
