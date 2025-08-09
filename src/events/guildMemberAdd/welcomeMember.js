const { Client, Interaction, AttachmentBuilder } = require('discord.js');
const { Font } = require("canvacord");
const { GreetingsCard } = require("../../utils/canvacord/greetingsCard.js");
const welcomerSchema = require('../../schemas/welcomerSchema.js');

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */
module.exports = async (client, interaction) => {
    const data = await welcomerSchema.findOne({ guildID: interaction.guild.id });
    if (!data?.welcomeChannel) return;

    const welcomeChannel = interaction.guild.channels.cache.get(data.welcomeChannel);
    if (!welcomeChannel) return;

    const user = interaction.user;
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
};
