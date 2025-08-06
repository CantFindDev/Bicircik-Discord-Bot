const {Client,Interaction, ApplicationCommandOptionType,PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'devtest',
    description: 'Just to test the command system',
    options: [
            {
                name: 'option1',
                description: 'test option 1',
                required: true,
                type: ApplicationCommandOptionType.String,
                
                choices: [
                    {
                    name: "choice1",
                    value: "a"
                    },
                ]
            }
    ],

    //comment or delete the following lines to disable development flags
    testOnly: true,
    devOnly: true,
    deleted: true,

    permissionsRequired: [PermissionFlagsBits.Administrator],
    botPermissions: [PermissionFlagsBits.Administrator],

    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
       await interaction.reply(`TEST`);
    }
}