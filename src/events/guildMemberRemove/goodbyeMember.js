const { Client, Interaction, AttachmentBuilder } = require('discord.js');
const { Font } = require("canvacord");
const { GreetingsCard } = require("../../utils/canvacord/greetingsCard.js");
const welcomerSchema = require('../../schemas/welcomerSchema.js');
const isRecentDuplicate = require('../../utils/isRecentDuplicate.js');

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */
module.exports = async (client, interaction) => {
    if (isRecentDuplicate(`goodbye:${interaction.guild.id}:${interaction.id}`)) return;

    const data = await welcomerSchema.findOne({ guildID: interaction.guild.id });
    if (!data?.goodbyeChannel) return;

    const goodbyeChannel = interaction.guild.channels.cache.get(data.goodbyeChannel);
    if (!goodbyeChannel) return;

    const user = interaction.user;
    Font.loadDefault();

    const card = new GreetingsCard()
        .setAvatar(user.displayAvatarURL({
            size: 256,
            forceStatic: true,
        }))
        .setDisplayName(user.username)
        .setType("goodbye")
        .setMessage("Seni özleyeceğiz 😢");

    const image = await card.build({ format: "png" });
    const attachment = new AttachmentBuilder(image);

    await goodbyeChannel.send({ files: [attachment] });
};
