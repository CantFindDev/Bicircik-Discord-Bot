const { testGuild, mainGuild } = require('../../../config.json');
const getApplicationCommands = require('../../utils/getApplicationCommands');
const getLocalCommands = require('../../utils/getLocalCommands');
const checkCommandDiffirience = require('../../utils/checkCommandDiffirience');
const isCommandDisabled = require('../../utils/isCommandDisabled');

const GLOBAL_SCOPE = 'global';

/** Converts a local command to the payload Discord registers. */
const toPayload = ({ name, description, options, memberPermissions }) => ({
    name,
    description,
    options: options ?? [],
    default_member_permissions: Array.isArray(memberPermissions) && memberPermissions.length > 0
        ? memberPermissions.reduce((acc, perm) => acc | BigInt(perm), 0n).toString()
        : null,
});

/**
 * Sorts the local commands into the scope each one belongs to: global, or a guild id.
 * `testOnly` goes to the test guild and `mainOnly` to the main guild. When both ids in the config are
 * the same guild, they share one scope, so one never deletes what the other registered.
 * @returns {Map<string, object[]>} scope to commands, with an entry for every scope even when it is empty
 */
const groupByScope = (localCommands) => {
    const commandsByScope = new Map([[GLOBAL_SCOPE, []], [testGuild, []], [mainGuild, []]]);
    const takenNames = new Set();

    for (const command of localCommands) {
        if (command.deleted || isCommandDisabled(command.name)) continue;

        if (command.testOnly === true && command.mainOnly === true) {
            console.log(`⚠️ Command "${command.name}" cannot be both testOnly and mainOnly. Skipping...`);
            continue;
        }

        const scope = command.testOnly ? testGuild : command.mainOnly ? mainGuild : GLOBAL_SCOPE;
        const scopedName = `${scope}:${command.name}`;

        if (takenNames.has(scopedName)) {
            console.log(`⚠️ Command "${command.name}" is defined twice for the same scope. Skipping the second one.`);
            continue;
        }

        takenNames.add(scopedName);
        commandsByScope.get(scope).push(command);
    }

    return commandsByScope;
};

/** Reports whether the commands registered in a scope differ from the local ones. */
const isOutOfDate = (existingCommands, localCommands) => {
    if (existingCommands.size !== localCommands.length) return true;

    const existingByName = new Map(existingCommands.map((command) => [command.name, command]));

    return localCommands.some((localCommand) => {
        const existing = existingByName.get(localCommand.name);
        return !existing || checkCommandDiffirience(existing, localCommand);
    });
};

/**
 * Makes the commands registered on Discord match the local command files.
 * Each scope is compared first and left alone when nothing changed. A scope that changed is replaced
 * with one bulk request, instead of one request per command, which is what made startup slow and
 * used up Discord's limit of 200 command creations per guild per day.
 */
module.exports = async (client) => {
    try {
        const commandsByScope = groupByScope(getLocalCommands());

        for (const [scope, localCommands] of commandsByScope) {
            const scopeName = scope === GLOBAL_SCOPE ? 'Global' : `Guild ${scope}`;
            const manager = await getApplicationCommands(client, scope === GLOBAL_SCOPE ? undefined : scope);

            if (!isOutOfDate(manager.cache, localCommands)) {
                console.log(`✅ ${scopeName}: ${localCommands.length} commands are up to date.`);
                continue;
            }

            await manager.set(localCommands.map(toPayload));
            console.log(`🔄 ${scopeName}: registered ${localCommands.length} commands.`);
        }
    } catch (error) {
        console.log(`❌ Error while syncing commands: ${error.message}`);
    }
};
