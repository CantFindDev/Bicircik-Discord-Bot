const { Client, AttachmentBuilder } = require('discord.js');
const { Font } = require("canvacord");
const { GreetingsCard } = require("../../utils/canvacord/greetingsCard.js");
const welcomerSchema = require('../../schemas/welcomerSchema.js');

/**
 * @param {Client} client
 * @param {import('discord.js').GuildMember} member
 */
module.exports = async (client, member) => {
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
        console.log(`${user.tag} için hoş geldin kartı gönderildi.`);
    } catch (error) {
        console.error("Hoş geldin kartı gönderilirken hata oluştu:", error);
    }
};
