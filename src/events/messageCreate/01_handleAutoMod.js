const { Client, Message, PermissionFlagsBits } = require('discord.js');
const { getAutoModSettings, normalize } = require('../../utils/autoModSettings');
const { recordCase } = require('../../utils/moderation');
const LogBuilder = require('../../utils/logBuilder');

const SPAM_MESSAGE_LIMIT = 5;
const SPAM_WINDOW_MS = 5000;
const SPAM_TIMEOUT_MS = 5 * 60 * 1000;
const NOTICE_LIFETIME_MS = 5000;
const SWEEP_INTERVAL_MS = 60_000;
const LOGGED_CONTENT_LENGTH = 1000;

const invitePattern = /(?:discord\.gg|discord(?:app)?\.com\/invite)\/[\w-]+/i;

const recentMessageTimes = new Map();

setInterval(() => {
    const cutoff = Date.now() - SPAM_WINDOW_MS;
    for (const [key, times] of recentMessageTimes) {
        if (times[times.length - 1] < cutoff) recentMessageTimes.delete(key);
    }
}, SWEEP_INTERVAL_MS).unref();

/** Records the message time and reports whether the author passed SPAM_MESSAGE_LIMIT inside SPAM_WINDOW_MS. */
const isSpamming = (key, now) => {
    let times = recentMessageTimes.get(key);
    if (!times) {
        times = [];
        recentMessageTimes.set(key, times);
    }

    while (times.length && now - times[0] > SPAM_WINDOW_MS) times.shift();
    times.push(now);

    if (times.length < SPAM_MESSAGE_LIMIT) return false;

    times.length = 0;
    times.push(now);
    return true;
};

/** Names the rule the message breaks, or returns null. */
const findViolation = (message, settings) => {
    if (settings.inviteFilter && invitePattern.test(message.content)) return 'Davet linki';
    if (settings.mentionLimit && message.mentions.users.size > settings.mentionLimit) return 'Toplu etiket';
    if (settings.bannedWordPattern?.test(normalize(message.content))) return 'Yasaklı kelime';
    return null;
};

/** Deletes the message, shows a short notice in the channel and writes the event to the log channel. */
const removeMessage = async (message, rule) => {
    await message.delete().catch(() => {});

    const notice = await message.channel.send(`${message.author}, mesajın otomod tarafından silindi: **${rule}**`).catch(() => null);
    if (notice) setTimeout(() => notice.delete().catch(() => {}), NOTICE_LIFETIME_MS).unref();

    await new LogBuilder(message.guild)
        .setTitle('🛡️ Otomod')
        .setDescription(`**${rule}** nedeniyle bir mesaj silindi.`)
        .addField('Kullanıcı', `${message.author.tag} (\`${message.author.id}\`)`, true)
        .addField('Kanal', `${message.channel}`, true)
        .addField('Mesaj', message.content.slice(0, LOGGED_CONTENT_LENGTH) || '-')
        .setColor('Orange')
        .send();
};

/**
 * Applies the guild's automod filters to a message. Bots, exempt channels and members with
 * Manage Messages are skipped. Runs on every message, so the settings come from the in-memory cache.
 * @param {Client} client
 * @param {Message} message
 */
module.exports = async (client, message) => {
    if (!message.inGuild() || message.author.bot || !message.member) return;

    try {
        const settings = await getAutoModSettings(message.guild.id);
        if (!settings || settings.exemptChannels.has(message.channel.id)) return;
        if (message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;

        const violation = findViolation(message, settings);
        if (violation) {
            await removeMessage(message, violation);
            return;
        }

        if (!settings.spamFilter || !isSpamming(`${message.guild.id}:${message.author.id}`, Date.now())) return;

        await removeMessage(message, 'Spam');

        if (message.member.moderatable) {
            const reason = 'Otomod: spam';
            await message.member.timeout(SPAM_TIMEOUT_MS, reason);
            await recordCase({ guild: message.guild, user: message.author, moderator: client.user, type: 'timeout', reason, durationMs: SPAM_TIMEOUT_MS });
        }
    } catch (error) {
        console.error('Automod failed on a message:', error);
    }
};
