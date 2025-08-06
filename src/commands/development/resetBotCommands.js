const { Client,Interaction,ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const { REST, Routes } = require('discord.js');
const { botID } = require('../../../config.json');
require("dotenv").config();

module.exports = {
    name: 'resetbotcommands',
    description: 'This command resets all bot commands',
     options: [
            {
                name: 'target-command-id',
                description: 'Target command ID',
                required: false,
                type: ApplicationCommandOptionType.Mentionable,
            }
    ],
     
    testOnly: false,
    devOnly: true,
    deleted: true,


     /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: (client, interaction) => {
        const rest = new REST().setToken(process.env.BOT_TOKEN);
        const targetCommandID = interaction.options.get("target-command-ID")?.value || "0";
        
1402418751818830014

        if (targetCommandID === "0") {
            rest.put(Routes.applicationCommands(botID), { body: [] })
                .then(() => console.log('Successfully deleted all application commands.'))
                .catch(console.error);
        }
        else {
            rest.delete(Routes.applicationGuildCommand(botID, interaction.guildId, targetCommandID))
                .then(() => console.log('Successfully deleted guild commands.'))
                .catch(console.error);
        }
        
        interaction.reply({
            content: 'All bot commands have been reset successfully.',
            ephemeral: true
        });
    }
}