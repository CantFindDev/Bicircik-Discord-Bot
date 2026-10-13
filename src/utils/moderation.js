const { ApplicationCommandOptionType } = require('discord.js');
const moderationCaseSchema = require('../schemas/moderationCaseSchema');
const LogBuilder = require('./logBuilder');
const { getTranslator, tables } = require('./language');

const REASON_MAX_LENGTH = 400;
const REMOVAL_LIMIT = 5;
const REMOVAL_WINDOW_MS = 10 * 60 * 1000;

const removalTimesByModerator = new Map();

/** Reason option shared by moderation commands. The length cap keeps it inside embed field and audit log limits. */
const reasonOption = {
    name: 'sebep',
    description: 'İşlemin sebebi',
    type: ApplicationCommandOptionType.String,
    max_length: REASON_MAX_LENGTH,
};

/** Reads the reason option, trimmed to the cap even if Discord did not enforce it. */
const getReason = (interaction) => (interaction.options.getString('sebep') || getTranslator(interaction)('mod.noReason')).slice(0, REASON_MAX_LENGTH);

/** Audit log reason that names the moderator, since Discord records the bot as the actor. */
const buildAuditReason = (moderator, reason) => `${moderator.tag} (${moderator.id}): ${reason}`.slice(0, 512);

/**
 * Limits kicks and bans to REMOVAL_LIMIT per moderator inside REMOVAL_WINDOW_MS, so one hijacked
 * moderator account cannot empty the server through the bot. The guild owner is exempt.
 * @returns {boolean} false when the moderator has used up the limit.
 */
const claimMemberRemoval = (interaction) => {
    if (interaction.user.id === interaction.guild.ownerId) return true;

    const key = `${interaction.guild.id}:${interaction.user.id}`;
    const now = Date.now();
    const times = (removalTimesByModerator.get(key) || []).filter((time) => now - time < REMOVAL_WINDOW_MS);

    if (times.length >= REMOVAL_LIMIT) {
        removalTimesByModerator.set(key, times);
        return false;
    }

    times.push(now);
    removalTimesByModerator.set(key, times);
    return true;
};

const caseTypes = {
    warn: { label: 'Uyarı', color: 'Yellow' },
    timeout: { label: 'Susturma', color: 'Orange' },
    untimeout: { label: 'Susturma Kaldırma', color: 'Green' },
    kick: { label: 'Atılma', color: 'Orange' },
    ban: { label: 'Yasaklama', color: 'Red' },
    unban: { label: 'Yasak Kaldırma', color: 'Green' },
};

/**
 * Checks that the command user, and optionally the bot, outrank the target member.
 * @returns {string | null} the refusal text to show the command user, or null when the action is allowed.
 */
const getHierarchyError = (interaction, targetMember, needsBotAuthority = true) => {
    const guild = interaction.guild;
    const t = getTranslator(interaction);

    if (targetMember.id === guild.ownerId) return t('mod.hierarchy.owner');
    if (targetMember.id === interaction.user.id) return t('mod.hierarchy.self');
    if (targetMember.id === interaction.client.user.id) return t('mod.hierarchy.bot');

    const targetPosition = targetMember.roles.highest.position;

    if (interaction.user.id !== guild.ownerId && targetPosition >= interaction.member.roles.highest.position) {
        return t('mod.hierarchy.userAbove');
    }

    if (needsBotAuthority && targetPosition >= guild.members.me.roles.highest.position) {
        return t('mod.hierarchy.botAbove');
    }

    return null;
};

/** Builds the DM text of an action in one language. Function replacers keep `$` in a reason literal. */
const buildNotice = (language, guild, type, reason) => tables[language]['mod.notice']
    .replace('{guild}', () => guild.name)
    .replace('{action}', () => tables[language][`case.${type}`])
    .replace('{reason}', () => reason);

/**
 * Sends the target a DM about the action, in Turkish and English because the target's language is unknown.
 * Call it before a kick or ban, a user outside the guild cannot be reached.
 * @returns {Promise<boolean>} false when the user has DMs closed.
 */
const notifyTarget = async (user, guild, type, reason) => {
    try {
        await user.send(`${buildNotice('tr', guild, type, reason)}\n\n${buildNotice('en', guild, type, reason)}`);
        return true;
    } catch {
        return false;
    }
};

/**
 * Stores the action in the member's record and posts it to the log channel.
 * @param {{ guild: import('discord.js').Guild, user: import('discord.js').User, moderator: import('discord.js').User,
 * type: keyof typeof caseTypes, reason: string, durationMs?: number }} details
 */
const recordCase = async ({ guild, user, moderator, type, reason, durationMs = null }) => {
    const moderationCase = await moderationCaseSchema.create({
        guildID: guild.id,
        userID: user.id,
        moderatorID: moderator.id,
        type,
        reason,
        durationMs,
    });

    await new LogBuilder(guild)
        .setTitle(`🔨 ${caseTypes[type].label}`)
        .addField('Kullanıcı', `${user.tag} (\`${user.id}\`)`, true)
        .addField('Yetkili', `${moderator.tag}`, true)
        .addField('Vaka', `\`${getCaseCode(moderationCase)}\``, true)
        .addField('Sebep', reason)
        .setColor(caseTypes[type].color)
        .send();

    return moderationCase;
};

/** Short code shown to moderators, the last 6 characters of the database id. */
const getCaseCode = (moderationCase) => moderationCase.id.slice(-6);

module.exports = {
    caseTypes,
    reasonOption,
    getReason,
    buildAuditReason,
    claimMemberRemoval,
    getHierarchyError,
    notifyTarget,
    recordCase,
    getCaseCode,
};
