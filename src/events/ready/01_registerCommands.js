const { testGuild, mainGuild } = require('../../../config.json');
const getApplicationCommands = require('../../utils/getApplicationCommands');
const getLocalCommands = require('../../utils/getLocalCommands');
const checkCommandDiffirience = require('../../utils/checkCommandDiffirience');

module.exports = async (client) => {
  const logs = [];

  async function safeDelete(commandsManager, commandId, commandName, scopeName = "", isSilent = false) {
    try {
      await commandsManager.delete(commandId);
      if (!isSilent) logs.push(`🗑️ Deleted ${scopeName} command: ${commandName}`);
    } catch (error) {
      if (error.code === 10063) {
        logs.push(`ℹ️ ${scopeName} command already deleted or not found: ${commandName}`);
      } else {
        throw error;
      }
    }
  }

  try {
    const localCommands = getLocalCommands();

    // Fetch current commands from all scopes
    const globalCommands = await getApplicationCommands(client);
    const testCommands = await getApplicationCommands(client, testGuild);
    const mainCommands = await getApplicationCommands(client, mainGuild);

    // Create maps for quick lookup of existing commands by name
    const existingGlobalMap = new Map(globalCommands.cache.map(cmd => [cmd.name, cmd]));
    const existingTestMap = new Map(testCommands.cache.map(cmd => [cmd.name, cmd]));
    const existingMainMap = new Map(mainCommands.cache.map(cmd => [cmd.name, cmd]));

    // For tracking which commands should exist in which scopes after sync
    const shouldExistTest = new Set();
    const shouldExistMain = new Set();
    const shouldExistGlobal = new Set();

    // First, iterate all local commands and add/edit them appropriately
    for (const localCommand of localCommands) {
      const { name, description, options, testOnly, mainOnly, deleted, memberPermissions } = localCommand;

      const default_member_permissions = Array.isArray(memberPermissions) && memberPermissions.length > 0
        ? memberPermissions.reduce((acc, perm) => acc | BigInt(perm), 0n).toString()
        : null;

      if (deleted) {
        // Delete from all scopes if exists
        if (existingGlobalMap.has(name)) await safeDelete(globalCommands, existingGlobalMap.get(name).id, name, "Global");
        if (existingTestMap.has(name)) await safeDelete(testCommands, existingTestMap.get(name).id, name, "Test");
        if (existingMainMap.has(name)) await safeDelete(mainCommands, existingMainMap.get(name).id, name, "Main");

        continue;
      }

      if (testOnly === true && mainOnly === true) {
        logs.push(`⚠️ Command "${name}" cannot be both testOnly and mainOnly. Skipping...`);
        continue;
      }

      if (testOnly === true) {
        shouldExistTest.add(name);
        const existingTest = existingTestMap.get(name);
        if (existingTest) {
          const differs = checkCommandDiffirience(existingTest, localCommand);
          if (differs) {
            await testCommands.edit(existingTest.id, { description, options, default_member_permissions });
            logs.push(`🔄 Edited Test command: ${name}`);
          } else {
            logs.push(`✅ Test command "${name}" is up to date. No edit needed.`);
          }
        } else {
          await testCommands.create({ name, description, options, default_member_permissions });
          logs.push(`⚙️ Created Test command: ${name}`);
        }
        // Ensure deleted from other scopes
        if (existingGlobalMap.has(name)) await safeDelete(globalCommands, existingGlobalMap.get(name).id, name, "Global");
        if (existingMainMap.has(name)) await safeDelete(mainCommands, existingMainMap.get(name).id, name, "Main");

        continue;
      }

      if (mainOnly === true) {
        shouldExistMain.add(name);
        const existingMain = existingMainMap.get(name);
        if (existingMain) {
          const differs = checkCommandDiffirience(existingMain, localCommand);
          if (differs) {
            await mainCommands.edit(existingMain.id, { description, options, default_member_permissions });
            logs.push(`🔄 Edited Main command: ${name}`);
          } else {
            logs.push(`✅ Main command "${name}" is up to date. No edit needed.`);
          }
        } else {
          await mainCommands.create({ name, description, options, default_member_permissions });
          logs.push(`⚙️ Created Main command: ${name}`);
        }
        // Ensure deleted from other scopes
        if (existingGlobalMap.has(name)) await safeDelete(globalCommands, existingGlobalMap.get(name).id, name, "Global");
        if (existingTestMap.has(name)) await safeDelete(testCommands, existingTestMap.get(name).id, name, "Test");

        continue;
      }

      // Global command case
      shouldExistGlobal.add(name);
      const existingGlobal = existingGlobalMap.get(name);
      if (existingGlobal) {
        const differs = checkCommandDiffirience(existingGlobal, localCommand);
        if (differs) {
          await globalCommands.edit(existingGlobal.id, { description, options, default_member_permissions });
          logs.push(`🔄 Edited Global command: ${name}`);
        } else {
          logs.push(`✅ Global command "${name}" is up to date. No edit needed.`);
        }
      } else {
        await globalCommands.create({ name, description, options, default_member_permissions });
        logs.push(`🛠️ Created Global command: ${name}`);
      }
    }

    // Now remove duplicates after full processing

    // Remove Test commands that should not exist (not testOnly)
    for (const [name, cmd] of existingTestMap) {
      if (!shouldExistTest.has(name)) {
        await safeDelete(testCommands, cmd.id, name,"Test",true);
        logs.push(`🗑️ Removed Test duplicate of command: ${name}`);
      }
    }

    // Remove Main commands that should not exist (not mainOnly)
    for (const [name, cmd] of existingMainMap) {
      if (!shouldExistMain.has(name)) {
        await safeDelete(mainCommands, cmd.id, name,"Main",true);
        logs.push(`🗑️ Removed Main duplicate of command: ${name}`);
      }
    }

    // Optionally, remove Global commands that should not exist
    for (const [name, cmd] of existingGlobalMap) {
      if (!shouldExistGlobal.has(name)) {
        await safeDelete(globalCommands, cmd.id, name,"Global",true);
        logs.push(`🗑️ Removed Global duplicate of command: ${name}`);
      }
    }

  } catch (error) {
    logs.push(`❌ Error while syncing commands: ${error.message}`);
  }

  logs.forEach(log => console.log(log));
  return logs;
};
