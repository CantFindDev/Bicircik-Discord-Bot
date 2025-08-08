const { testGuild, mainGuild } = require('../../../config.json');
const getApplicationCommands = require('../../utils/getApplicationCommands');
const getLocalCommands = require('../../utils/getLocalCommands');
const checkCommandDiffirience = require('../../utils/checkCommandDiffirience');

module.exports = async (client) => {
    try {
        const localCommands = getLocalCommands();

        const globalCommands = await getApplicationCommands(client);
        const testCommands = await getApplicationCommands(client, testGuild);
        const mainCommands = await getApplicationCommands(client, mainGuild);

        for (const localCommand of localCommands) {
            const { name, description, options, testOnly, mainOnly, deleted } = localCommand;

            const existingGlobal = globalCommands.cache.find(cmd => cmd.name === name);
            const existingTest = testCommands.cache.find(cmd => cmd.name === name);
            const existingMain = mainCommands.cache.find(cmd => cmd.name === name);

            // 🚫 Deleted from everywhere
            if (deleted) {
                if (existingGlobal) {
                    await globalCommands.delete(existingGlobal.id);
                    console.log(`🗑️ Deleted global command: ${name}`);
                }
                if (existingTest) {
                    await testCommands.delete(existingTest.id);
                    console.log(`🗑️ Deleted test command: ${name}`);
                }
                if (existingMain) {
                    await mainCommands.delete(existingMain.id);
                    console.log(`🗑️ Deleted main command: ${name}`);
                }
                continue;
            }

            if (testOnly && mainOnly) {
                console.warn(`⚠️ Command "${name}" cannot be both testOnly and mainOnly. Skipping...`);
                continue;
            }

            // 🧪 Test guild only
            if (testOnly) {
                if (existingTest) {
                    if (checkCommandDiffirience(existingTest, localCommand)) {
                        await testCommands.edit(existingTest.id, { description, options });
                        console.log(`🔄 Edited test command: ${name}`);
                    }
                } else {
                    await testCommands.create({ name, description, options });
                    console.log(`⚙️ Created test command: ${name}`);
                }

                if (existingGlobal) {
                    await globalCommands.delete(existingGlobal.id);
                    console.log(`🗑️ Removed global duplicate of test command: ${name}`);
                }
                if (existingMain) {
                    await mainCommands.delete(existingMain.id);
                    console.log(`🗑️ Removed main duplicate of test command: ${name}`);
                }
                continue;
            }

            // 🏠 Main guild only
            if (mainOnly) {
                if (existingMain) {
                    if (checkCommandDiffirience(existingMain, localCommand)) {
                        await mainCommands.edit(existingMain.id, { description, options });
                        console.log(`🔄 Edited main command: ${name}`);
                    }
                } else {
                    await mainCommands.create({ name, description, options });
                    console.log(`⚙️ Created main command: ${name}`);
                }

                if (existingGlobal) {
                    await globalCommands.delete(existingGlobal.id);
                    console.log(`🗑️ Removed global duplicate of main command: ${name}`);
                }
                if (existingTest) {
                    await testCommands.delete(existingTest.id);
                    console.log(`🗑️ Removed test duplicate of main command: ${name}`);
                }
                continue;
            }

            // 🌍 Global command
            if (existingGlobal) {
                if (checkCommandDiffirience(existingGlobal, localCommand)) {
                    await globalCommands.edit(existingGlobal.id, { description, options });
                    console.log(`🔄 Edited global command: ${name}`);
                }
            } else {
                await globalCommands.create({ name, description, options });
                console.log(`🛠️ Created global command: ${name}`);
            }

            // Clean up guild duplicates
            if (existingTest) {
                await testCommands.delete(existingTest.id);
                console.log(`🗑️ Removed test duplicate of global command: ${name}`);
            }
            if (existingMain) {
                await mainCommands.delete(existingMain.id);
                console.log(`🗑️ Removed main duplicate of global command: ${name}`);
            }
        }

    } catch (error) {
        console.error(`❌ Error while syncing commands:`, error);
    }
};
