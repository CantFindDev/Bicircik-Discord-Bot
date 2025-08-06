const {Client,Interaction, ApplicationCommandOptionType,PermissionFlagsBits,EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'send-embed',
    description: 'Just to test the command system',
    options: [
            {
                name: 'title',
                description: 'title?',
                required: true,
                type: ApplicationCommandOptionType.String,
            },
            {
                name: 'description',
                description: 'description of embed',
                required: true,
                type: ApplicationCommandOptionType.String,
            },
            {
                name: 'footer',
                description: 'foter',
                required: false,
                type: ApplicationCommandOptionType.String,
            },
            {
                name: 'footer-icon',
                description: 'foter icon',
                required: false,
                type: ApplicationCommandOptionType.String,
            },
            {
                name: 'target-channel',
                description: 'channel where the embed will be sent!',
                required: false,
                type: ApplicationCommandOptionType.Channel,
            },
            {
                name: 'url',
                description: 'url for title?',
                required: false,
                type: ApplicationCommandOptionType.String,
            },
            
            {
                name: 'thumbnail',
                description: 'thumbnail url',
                required: false,
                type: ApplicationCommandOptionType.String,
            },
            {
                name: 'image',
                description: 'image url',
                required: false,
                type: ApplicationCommandOptionType.String,
            },
            {
                name: 'color',
                description: 'color',
                required: false,
                type: ApplicationCommandOptionType.String,
                choices: [
                    {
                        name: "Random",
                        value: 'Random'
                    },
                    {
                        name: "Default",
                        value: 'Default'
                    },
                    {
                        name: "Aqua",
                        value: 'Aqua'
                    },
                    {
                        name: "Green",
                        value: 'Green'
                    },
                    {
                        name: "Blue",
                        value: 'Blue'
                    },
                    {
                        name: "Purple",
                        value: 'Purple'
                    },
                    {
                        name: "LuminousVividPink",
                        value: 'LuminousVividPink'
                    },
                    {
                        name: "Gold",
                        value: 'Gold'
                    },
                    {
                        name: "Orange",
                        value: 'Orange'
                    },
                    {
                        name: "Red",
                        value: 'Red'
                    },
                    {
                        name: "Grey",
                        value: 'Grey'
                    },
                    {
                        name: "DarkGrey",
                        value: 'DarkGrey'
                    },
                    {
                        name: "DarkerGrey",
                        value: 'DarkerGrey'
                    },
                    {
                        name: "NotQuiteBlack",
                        value: 'NotQuiteBlack'
                    },
                    {
                        name: "DarkButNotBlack",
                        value: 'DarkButNotBlack'
                    },
                    {
                        name: "LightGrey",
                        value: 'LightGrey'
                    },
                    {
                        name: "Navy",
                        value: 'Navy'
                    },
                    {
                        name: "Yellow",
                        value: 'Yellow'
                    },
                    {
                        name: "Fuchsia",
                        value: 'Fuchsia'
                    },
                    {
                        name: "White",
                        value: 'White'
                    },
                    {
                        name: "Greyple",
                        value: 'Greyple'
                    },
                    {
                        name: "Black",
                        value: 'Black'
                    },
                    {
                        name: "Blurple",
                        value: 'Blurple'
                    },                   
                ]
            },
        ],
    
    testOnly: true,
    devOnly: true,
    deleted: false,

    permissionsRequired: [PermissionFlagsBits.Administrator],
    botPermissions: [PermissionFlagsBits.Administrator],

    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {

        await interaction.deferReply({ ephemeral: true });

        const targetChannel = client.channels.cache.get(interaction.options.get('target-channel')?.value) || interaction.channel;
        const title = interaction.options.get('title').value;
       
        const description = interaction.options.get('description').value;

        const footer = interaction.options.get('footer')?.value || interaction.user.displayName;
        const footerIcon = interaction.options.get('footer-icon')?.value || interaction.user.displayAvatarURL();

        const image = interaction.options.get('image')?.value || "";
        const thumbnail = interaction.options.get('thumbnail')?.value || "";

        const url = interaction.options.get('url')?.value || "";
        const color =  interaction.options.get('color')?.value || 'Random';

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(description)
            .setAuthor({ name: client.user.displayName, iconURL: client.user.displayAvatarURL()})
            .setFooter({ text: footer, iconURL: footerIcon })
            .setTimestamp();
        
        if (url.length !== 0) embed.setURL(url)
        if (image.length !== 0) embed.setImage(image)
        if (thumbnail.length !== 0) embed.setThumbnail(thumbnail)
        
        targetChannel.send({ embeds: [embed] });
        interaction.editReply("Succesfully sent the embed message!")
    }
}