const getLocalCommands = require('../../utils/getLocalCommands');
const { testGuild } = require('../../../config.json');
const { Client, Interaction } = require('discord.js');
const LogBuilder = require("../../utils/logBuilder");
const isDeveloper = require('../../utils/isDeveloper');
const isCommandDisabled = require('../../utils/isCommandDisabled');
const { setLanguage, getTranslator } = require('../../utils/language');
const { withOriginalNames } = require('../../utils/optionNames');

const COOLDOWN_SWEEP_INTERVAL_MS = 60_000;

let commandsByName;
const cooldownEndsAt = new Map();

setInterval(() => {
    const now = Date.now();
    for (const [key, endsAt] of cooldownEndsAt) {
        if (endsAt <= now) cooldownEndsAt.delete(key);
    }
}, COOLDOWN_SWEEP_INTERVAL_MS).unref();

/** Looks a command up by name. The command files are read once, on the first interaction. */
const findCommand = (name) => {
    commandsByName ??= new Map(getLocalCommands().map((command) => [command.name, command]));
    return commandsByName.get(name);
};

/**
 * Starts the command's per-user cooldown when it is not already running. An alias shares its original's cooldown.
 * @returns {number} 0 when the command may run, otherwise the milliseconds left.
 */
const claimCommandCooldown = (commandObject, userId) => {
    if (!commandObject.cooldownSeconds) return 0;

    const key = `${commandObject.aliasOf ?? commandObject.name}:${userId}`;
    const now = Date.now();
    const endsAt = cooldownEndsAt.get(key) ?? 0;
    if (endsAt > now) return endsAt - now;

    cooldownEndsAt.set(key, now + commandObject.cooldownSeconds * 1000);
    return 0;
};

/**
 * Runs a slash command after the disabled, guild, developer, permission and cooldown checks.
 * Replies use the language of the command name that was typed, see setLanguage.
 * Member permissions are checked here as well as by Discord, so a per-command override made in the
 * server's Integrations settings cannot hand a moderation command to a role without the permission.
 * @param {Client} client
 * @param {Interaction} interaction
 */
module.exports = async (client, interaction) => {
    if (!interaction.isChatInputCommand()) return;

    try {
        const commandObject = findCommand(interaction.commandName);
        if (!commandObject) return;

        setLanguage(interaction, commandObject.language);
        const t = getTranslator(interaction);

        if (commandObject.optionNames) interaction.options = withOriginalNames(interaction.options, commandObject.optionNames);

        if (isCommandDisabled(commandObject.name)) {
            interaction.reply({
                content: t('handler.disabled'),
                ephemeral: true,
            });
            return;
        }

        if (!interaction.inGuild()) {
            interaction.reply({
                content: t('handler.guildOnly'),
                ephemeral: true,
            });
            return;
        }

        if (commandObject.devOnly && !isDeveloper(interaction.user.id)) {
            interaction.reply({
                content: t('handler.devOnly'),
                ephemeral: true,
            });
            return;
        }

        if (commandObject.testOnly) {
            if (!(interaction.guild.id === testGuild)) {
                interaction.reply({
                    content: t('handler.testOnly'),
                    ephemeral: true,
                });
                return;
            }
        }

        const requiredPerms = (commandObject.memberPermissions ?? []).reduce((acc, perm) => acc | BigInt(perm), 0n);
        if (!interaction.member.permissions.has(requiredPerms)) {
            return interaction.reply({
                content: t('handler.noPermission'),
                ephemeral: true
            });
        }

        if (commandObject.botPermissions?.length) {
            for (const permission of commandObject.botPermissions) {
                const bot = interaction.guild.members.me;

                if (!bot.permissions.has(permission)) {
                    interaction.reply({
                        content: t('handler.botNoPermission'),
                        ephemeral: true,
                    });
                    return;
                }
            }
        }

        const subcommand = interaction.options.getSubcommand(false);
        if (commandObject.subcommand_permissions?.[subcommand]) {
            const requiredPerms = BigInt(commandObject.subcommand_permissions[subcommand]);

            if (!interaction.member.permissions.has(requiredPerms)) {
                return interaction.reply({
                    content: t('handler.subcommandPermission', { subcommand }),
                    ephemeral: true
                });
            }
        }

        const cooldownLeftMs = claimCommandCooldown(commandObject, interaction.user.id);
        if (cooldownLeftMs > 0) {
            return interaction.reply({
                content: t('handler.cooldown', { seconds: Math.ceil(cooldownLeftMs / 1000) }),
                ephemeral: true
            });
        }

        if (!commandObject.skipUsageLog) {
            await new LogBuilder(interaction.guild)
                .setTitle("🛠 Komut Çalıştırıldı")
                .setDescription(`**/${interaction.commandName}** komutu çalıştırıldı`)
                .addField("Kullanıcı", `${interaction.user.tag} (\`${interaction.user.id}\`)`, true)
                .addField("Kanal", `${interaction.channel}`, true)
                .setColor("Blue")
                .send();
        }

        await commandObject.callback(client, interaction);

    } catch (error) {
        console.error(`Command /${interaction.commandName} failed:`, error);

        const failure = { content: getTranslator(interaction)('handler.error'), ephemeral: true };
        await (interaction.deferred || interaction.replied ? interaction.followUp(failure) : interaction.reply(failure)).catch(() => {});

        if (interaction.guild) {
            await new LogBuilder(interaction.guild)
                .setTitle("⚠️ Komut Hatası")
                .setDescription(`**/${interaction.commandName}** komutu çalıştırılırken hata oluştu.`)
                .addField("Kullanıcı", `${interaction.user.tag} (\`${interaction.user.id}\`)`, true)
                .addField("Hata Mesajı", `\`\`\`${String(error?.message || error).slice(0, 1000)}\`\`\``)
                .setColor("Red")
                .send()
                .catch(() => {});
        }
    }
};
