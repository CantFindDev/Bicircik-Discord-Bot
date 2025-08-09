
const getLocalCommands = require('../../utils/getLocalCommands');
const { developers, testGuild } = require('../../../config.json');
const { Client, Interaction } = require('discord.js');

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */
module.exports = async (client,interaction) => {

    if (!interaction.isChatInputCommand()) return;

    const localCommands = getLocalCommands();

    try {
        const commandObject = localCommands.find((cmd) => cmd.name === interaction.commandName);

        if (!commandObject) return;

        if (!interaction.inGuild()) {
            interaction.reply({
                content: "You can't run commands out of the server",
                ephemeral: true,
            })
            return;
        }

        if (commandObject.devOnly) {
            if (!developers.includes(interaction.member.id)) {
                interaction.reply({
                    content: "Only developers can run this command!",
                    ephemeral: true,
                })
                return;
            }
        }

        if (commandObject.testOnly) {
            if (!(interaction.guild.id === testGuild)) {
                interaction.reply({
                    content: "This command can only be ran on the test server",
                    ephemeral: true,
                })
                return;
            }
        }

        const requiredPerms = BigInt(commandObject.default_member_permissions || '0');
        if (!interaction.member.permissions.has(requiredPerms)) {
            return interaction.reply({
                content: 'You do not have permission to use this command.',
                ephemeral: true
            });
        }

        if (commandObject.botPermissions?.lenght) {
            for (const permission of commandObject.botPermissions) {
                const bot = interaction.guild.members.me;

                if (!bot.permissions.has(permission)) {
                     interaction.reply({
                        content: `I don't have enough permissions.`,
                        ephemeral: true,
                     });
                    break;
                }
            }
        }

        const subcommand = interaction.options.getSubcommand(false);
        if (commandObject.subcommand_permissions?.[subcommand]) {
            const requiredPerms = BigInt(commandObject.subcommand_permissions[subcommand]);

            if (!interaction.member.permissions.has(requiredPerms)) {
                return interaction.reply({
                    content: `You need additional permissions to run \`${subcommand}\`.`,
                    ephemeral: true
                });
            }
        }

        await commandObject.callback(client, interaction);

    } catch (error) {
        console.log(`There was an error running this command: ${error}`)
    }

};
