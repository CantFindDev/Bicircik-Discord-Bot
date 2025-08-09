const {Client,ChannelType,Interaction, ApplicationCommandOptionType,PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'template',
    description: 'Just to test the command system',

    //comment or delete the following lines to disable development flags
    testOnly: true,
    devOnly: true,
    deleted: true,
    mainOnly: true,

    memberPermissions: [PermissionFlagsBits.Administrator],
    botPermissions: [PermissionFlagsBits.Administrator],

    subcommand_permissions: {
        'subcommand': PermissionFlagsBits.Administrator,
    },
    options: [
        // 1️⃣ Subcommand
        {
            name: 'subcommand',
            description: 'Example subcommand',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'string',
                    description: 'String option example',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    min_length: 3,
                    max_length: 10,
                    choices: [
                        { name: 'Choice 1', value: 'choice1' },
                        { name: 'Choice 2', value: 'choice2' }
                    ],
                    autocomplete: false
                },
                {
                    name: 'integer',
                    description: 'Integer option example',
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    min_value: 1,
                    max_value: 10,
                    choices: [
                        { name: 'One', value: 1 },
                        { name: 'Five', value: 5 }
                    ],
                    autocomplete: true
                },
                {
                    name: 'boolean',
                    description: 'Boolean option example',
                    type: ApplicationCommandOptionType.Boolean,
                    required: false
                },
                {
                    name: 'user',
                    description: 'User option example',
                    type: ApplicationCommandOptionType.User,
                    required: true
                },
                {
                    name: 'channel',
                    description: 'Channel option example',
                    type: ApplicationCommandOptionType.Channel,
                    required: true,
                    channel_types: [ChannelType.GuildCategory, ChannelType.GuildText]
                },
                {
                    name: 'role',
                    description: 'Role option example',
                    type: ApplicationCommandOptionType.Role,
                    required: false
                },
                {
                    name: 'mentionable',
                    description: 'Mentionable option example',
                    type: ApplicationCommandOptionType.Mentionable,
                    required: true
                },
                {
                    name: 'number',
                    description: 'Number option example',
                    type: ApplicationCommandOptionType.Number,
                    required: true,
                    min_value: 0.5,
                    max_value: 100,
                    choices: [
                        { name: 'Half', value: 0.5 },
                        { name: 'One', value: 1.0 }
                    ],
                    autocomplete: true
                },
                {
                    name: 'attachment',
                    description: 'Attachment option example',
                    type: ApplicationCommandOptionType.Attachment,
                    required: true
                }
            ]
        },

        // 2️⃣ SubcommandGroup
        {
            name: 'group',
            description: 'Example subcommand group',
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: 'first',
                    description: 'First subcommand in group',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'text',
                            description: 'Text input for first subcommand',
                            type: ApplicationCommandOptionType.String,
                            required: true
                        }
                    ]
                },
                {
                    name: 'second',
                    description: 'Second subcommand in group',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'number',
                            description: 'Number input for second subcommand',
                            type: ApplicationCommandOptionType.Integer,
                            required: true
                        }
                    ]
                }
            ]
        }
    ],

    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        await interaction.reply(`TEST`);
    }
}