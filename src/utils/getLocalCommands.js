const path = require("path");
const getAllFiles = require('./getAllFiles')
const isCommandDisabled = require('./isCommandDisabled');
const { withEnglishOptions } = require('./optionNames');

const ENGLISH = 'en';
const AUTO_LANGUAGE = 'auto';

const asciiLetters = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u' };

/** Replaces Turkish letters with their closest ASCII letters, so "çalış" becomes "calis". */
const toAsciiName = (name) => name.replace(/[çğıöşü]/g, (letter) => asciiLetters[letter]);

/**
 * Returns every command plus its aliases. An alias is a copy registered under another name that carries
 * `aliasOf` with the original name. Each command gets the aliases listed in its `aliases` field
 * (`{ name, description }`, used for English names) and an ASCII copy when its name has Turkish letters,
 * so it can be typed on an English keyboard. A deleted or disabled command gets no alias.
 * An English alias also gets English option names and descriptions. A command with `language: 'auto'`
 * gets English options with the Turkish ones as the Turkish localization. See optionNames.js.
 */
module.exports = (exceptions = []) => {
    let localCommands = [];

    const commandCategories = getAllFiles(path.join(__dirname, '..', 'commands'), true);

    for (const commandCategory of commandCategories) {

        const commandFiles = getAllFiles(commandCategory)
    
        for (const commandFile of commandFiles) {
            const commandObject = require(commandFile);
            
            if (exceptions.includes(commandObject.name)) continue;

            localCommands.push(commandObject);
        }
    }

    const takenNames = new Set(localCommands.map((command) => command.name));
    const aliasCommands = [];

    for (const commandObject of localCommands) {
        if (commandObject.deleted || isCommandDisabled(commandObject.name)) continue;

        const aliases = [...(commandObject.aliases ?? []), { name: toAsciiName(commandObject.name) }];

        for (const alias of aliases) {
            if (takenNames.has(alias.name)) continue;

            takenNames.add(alias.name);

            const aliasCommand = { ...commandObject, ...alias, aliasOf: commandObject.name };
            aliasCommands.push(alias.language === ENGLISH ? withEnglishOptions(aliasCommand, false) : aliasCommand);
        }
    }

    const namedCommands = localCommands.map((command) => (command.language === AUTO_LANGUAGE ? withEnglishOptions(command, true) : command));

    return [...namedCommands, ...aliasCommands];
}
