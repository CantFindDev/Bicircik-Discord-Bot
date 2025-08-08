const { Client, Interaction } = require('discord.js');
const { REST, Routes } = require('discord.js');
const { botID, testGuild, mainGuild } = require('../../../config.json');
require("dotenv").config();

module.exports = {
    name: 'resetbotcommands',
    description: 'Deletes ALL commands globally and in test/main guilds.',
    options: [],
    devOnly: true,
    testOnly: true,
    deleted: true,

    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
        const successMessages = [];

        // Internal helper for deleting commands from a specific scope
        async function deleteCommands(scopeName, routeFn) {
            try {
                const commands = await rest.get(routeFn());
                for (const command of commands) {
                    await rest.delete(routeFn(command.id));
                    successMessages.push(`🗑️ Deleted ${scopeName} command: ${command.name}`);
                }
            } catch (err) {
                successMessages.push(`⚠️ Failed to delete ${scopeName} commands: ${err.message}`);
                console.error(`Error deleting ${scopeName} commands:`, err);
            }
        }

        // Delete global commands
        await deleteCommands("global", (id) =>
            id
                ? Routes.applicationCommand(botID, id)
                : Routes.applicationCommands(botID)
        );

        // Delete test guild commands
        if (testGuild) {
            await deleteCommands("testGuild", (id) =>
                id
                    ? Routes.applicationGuildCommand(botID, testGuild, id)
                    : Routes.applicationGuildCommands(botID, testGuild)
            );
        }

        // Delete main guild commands
        if (mainGuild) {
            await deleteCommands("mainGuild", (id) =>
                id
                    ? Routes.applicationGuildCommand(botID, mainGuild, id)
                    : Routes.applicationGuildCommands(botID, mainGuild)
            );
        }

        await interaction.editReply({
            content: `✅ Application command reset completed.\n\n` + successMessages.join('\n'),
        });
    },
};
