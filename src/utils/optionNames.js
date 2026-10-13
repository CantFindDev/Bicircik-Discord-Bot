const english = require('../locales/commandOptions');

const TURKISH_LOCALE = 'tr';

/** Resolver methods whose first argument is an option name. */
const nameFirstMethods = new Set([
    'get', 'getBoolean', 'getChannel', 'getString', 'getInteger', 'getNumber',
    'getUser', 'getMember', 'getRole', 'getAttachment', 'getMentionable', 'getMessage',
]);

const subcommandMethods = new Set(['getSubcommand', 'getSubcommandGroup']);

/**
 * Returns a copy of the options with English names, descriptions and choice names, and records every
 * renamed option in `nameMap` (Turkish name to English name). With `keepsTurkish`, the Turkish texts
 * are kept as the Turkish localization, so a Turkish Discord client still shows them.
 */
const toEnglishOptions = (options, nameMap, keepsTurkish) => options?.map((option) => {
    const name = english.names[option.name] ?? option.name;
    const description = english.descriptions[option.description] ?? option.description;
    if (name !== option.name) nameMap[option.name] = name;

    const translated = { ...option, name, description };

    if (keepsTurkish) {
        translated.name_localizations = { [TURKISH_LOCALE]: option.name };
        translated.description_localizations = { [TURKISH_LOCALE]: option.description };
    }

    if (option.choices) {
        translated.choices = option.choices.map((choice) => ({
            ...choice,
            name: english.choices[choice.name] ?? choice.name,
            ...(keepsTurkish ? { name_localizations: { [TURKISH_LOCALE]: choice.name } } : {}),
        }));
    }

    if (option.options) translated.options = toEnglishOptions(option.options, nameMap, keepsTurkish);

    return translated;
});

/**
 * Gives a command English options. The command callbacks keep reading options by their Turkish names,
 * `optionNames` on the returned command lets the handler translate those names at run time.
 * @param {boolean} keepsTurkish true for a command whose one name serves both languages
 */
const withEnglishOptions = (command, keepsTurkish) => {
    if (!command.options?.length) return command;

    const optionNames = {};
    const options = toEnglishOptions(command.options, optionNames, keepsTurkish);

    return { ...command, options, optionNames };
};

/**
 * Wraps an interaction's option resolver so the callback can keep using the Turkish option names of a
 * command that is registered with English ones. Subcommand names are translated back to Turkish.
 */
const withOriginalNames = (resolver, optionNames) => {
    const originalNames = Object.fromEntries(Object.entries(optionNames).map(([original, translated]) => [translated, original]));

    return new Proxy(resolver, {
        get(target, property) {
            const value = Reflect.get(target, property, target);
            if (typeof value !== 'function') return value;

            if (nameFirstMethods.has(property)) {
                return (name, ...rest) => value.call(target, optionNames[name] ?? name, ...rest);
            }

            if (subcommandMethods.has(property)) {
                return (...args) => {
                    const name = value.apply(target, args);
                    return name === null ? null : originalNames[name] ?? name;
                };
            }

            return value.bind(target);
        },
    });
};

module.exports = { withEnglishOptions, withOriginalNames };
