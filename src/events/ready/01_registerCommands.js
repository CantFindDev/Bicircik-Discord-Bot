const {testGuild} = require('../../../config.json');
const getApplicationCommands = require('../../utils/getApplicationCommands');
const getLocalCommands = require('../../utils/getLocalCommands');
const checkCommandDiffirience = require('../../utils/checkCommandDiffirience');

module.exports = async (client) => {
    try {
        const localCommands = getLocalCommands();
        const applicationCommands = await getApplicationCommands(client);

        for (const localCommand of localCommands) {
            const { name, description, options } = localCommand;

            const existingCommand = await applicationCommands.cache.find((cmd) => cmd.name === name);

            if (existingCommand) {
                if (localCommand.deleted) {
                    await applicationCommands.delete(existingCommand.id);
                    console.log(`🗑️ Deleted command ${name}.`)
                    continue;
                }

                if (checkCommandDiffirience(existingCommand, localCommand)) {
                    await applicationCommands.edit(existingCommand.id, {
                        description,
                        options,
                    });
                    
                    console.log(`🔄 Edited command ${name}.`)
                }
            }

            else {
                if (localCommand.deleted) {
                    console.log(`🛡️ The command ${name} will not be registered since it is tagged as deleted`)
                    continue;
                }

                await applicationCommands.create({
                    name,
                    description,
                    options,
                })

                console.log(`🛠️ The command ${name} has been registered`);
            }
        }

    } catch (error) {
        console.log(`There was an error: ${error}`)
    }
}