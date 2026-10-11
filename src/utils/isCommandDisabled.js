const { disabledCommands = [] } = require('../../config.json');

const disabledCommandNames = new Set(disabledCommands);

/** Commands named in the config `disabledCommands` list are removed from Discord and refuse to run. */
module.exports = (commandName) => disabledCommandNames.has(commandName);
