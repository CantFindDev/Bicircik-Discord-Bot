const { formatCoins } = require('./economy');

const DEFAULT_LANGUAGE = 'tr';
const AUTO_LANGUAGE = 'auto';

/** Add a language by adding its table here and a `language` to the command aliases that use it. */
const tables = {
    tr: require('../locales/tr'),
    en: require('../locales/en'),
};

const numberLocales = { tr: 'tr-TR', en: 'en-US' };

const languageByInteraction = new WeakMap();

/** Fills `{name}` marks in one pass, so a value that itself contains a mark is never expanded. */
const fill = (template, values) => template.replace(/\{(\w+)\}/g, (mark, name) => (name in values ? String(values[name]) : mark));

/**
 * Sets the reply language of an interaction from the command that was used.
 * A command alias carries its own language. `auto` is for names that are the same in every language
 * (`/slot`, `/ban`): Turkish for a Turkish Discord client, English for any other. No language means Turkish.
 */
const setLanguage = (interaction, commandLanguage) => {
    let language = commandLanguage ?? DEFAULT_LANGUAGE;
    if (language === AUTO_LANGUAGE) language = interaction.locale === 'tr' ? 'tr' : 'en';

    languageByInteraction.set(interaction, Object.hasOwn(tables, language) ? language : DEFAULT_LANGUAGE);
};

/**
 * Returns the translator of an interaction: `t(key, values)` gives the text in the reply language,
 * `t.number` and `t.coins` format with that language's digit grouping. A key missing from the
 * language falls back to Turkish. A list (the work jobs) is returned as it is.
 */
const getTranslator = (interaction) => {
    const language = languageByInteraction.get(interaction) ?? DEFAULT_LANGUAGE;
    const table = tables[language];

    const t = (key, values = {}) => {
        const text = table[key] ?? tables[DEFAULT_LANGUAGE][key] ?? key;
        return typeof text === 'string' ? fill(text, values) : text;
    };

    t.language = language;
    t.number = (amount) => amount.toLocaleString(numberLocales[language]);
    t.coins = (amount) => formatCoins(amount, numberLocales[language]);

    return t;
};

module.exports = { setLanguage, getTranslator, tables };
