const { ApplicationCommandOptionType,PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'devtest',
    description: 'Just to test the command system',
    options: [
            {
                name: 'option1',
                description: 'test option 1',
                required: true,
                type: ApplicationCommandOptionType.Mentionable,
            }
    ],
    
    testOnly: true,
    devOnly: true,
    deleted: true,

    permissionsRequired: [PermissionFlagsBits.Administrator],
    botPermissions: [PermissionFlagsBits.Administrator],

    callback: (client, interaction) => {
        interaction.reply(`TEST`);
    }
}