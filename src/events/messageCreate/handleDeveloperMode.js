const { Client, Message } = require('discord.js');
const isDeveloper = require('../../utils/isDeveloper');
const LogBuilder = require('../../utils/logBuilder');
const developerModeSchema = require('../../schemas/developerModeSchema');

const developerModePattern = /^(?:(ENABLE|DISABLE)_DEVELOPER_MODE=<?(?:@&)?(\d{17,20})>?|DEVELOPER_MODE|(ROLES_LIST_DEVMODE))$/;
const messageLengthLimit = 2000;

/**
 * Sends the author a DM listing every role the bot can assign in the guild, then reacts to the message with a robot.
 * A chat message cannot get an ephemeral reply, so the list goes to DMs to stay private.
 * @param {Message} message
 */
const sendAssignableRoles = async (message) => {
    const lines = message.guild.roles.cache
        .filter((role) => role.editable && role.id !== message.guild.id)
        .sort((a, b) => b.position - a.position)
        .map((role) => `${role.name}: ${role.id}`);

    const pages = [];
    let page = `${message.guild.name} sunucusunda verebileceğim roller:`;
    for (const line of lines) {
        if (page.length + line.length + 1 > messageLengthLimit) {
            pages.push(page);
            page = line;
        } else {
            page += `\n${line}`;
        }
    }
    pages.push(lines.length ? page : `${message.guild.name} sunucusunda verebileceğim rol yok.`);

    try {
        for (const content of pages) await message.author.send(content);
    } catch {
        await message.reply('Sana DM gönderemiyorum, bu sunucudan gelen DM\'leri açman gerekiyor.');
        return;
    }

    await message.react('🤖');
};

/**
 * Replies with `DEVMODE=ACTIVE` when the author still holds the role stored by the last enable, otherwise `DEVMODE=INACTIVE`.
 * @param {Message} message
 */
const replyStatus = async (message) => {
    const record = await developerModeSchema.findOne({ guildID: message.guild.id, userID: message.author.id });
    const isActive = Boolean(record) && message.member.roles.cache.has(record.roleID);

    await message.reply(isActive ? 'DEVMODE=ACTIVE' : 'DEVMODE=INACTIVE');
};

/**
 * Adds or removes the role on the author, replies with the new state and stores it for later status checks.
 * @param {Message} message
 * @param {boolean} isEnabling
 * @param {string} roleId
 */
const switchMode = async (message, isEnabling, roleId) => {
    const role = message.guild.roles.cache.get(roleId);
    if (!role) {
        await message.reply('Bu sunucuda böyle bir rol yok.');
        return;
    }

    if (!role.editable) {
        await message.reply('Bu rolü yönetemiyorum. Rolüm bu rolün üstünde olmalı ve Rolleri Yönet yetkim bulunmalı.');
        return;
    }

    const owner = { guildID: message.guild.id, userID: message.author.id };

    if (isEnabling) {
        await message.member.roles.add(role);
        await message.reply('DEVMODE=ACTIVE');
        await developerModeSchema.findOneAndUpdate(owner, { roleID: roleId }, { upsert: true });
    } else {
        await message.member.roles.remove(role);
        await message.reply('DEVMODE=INACTIVE');
        await developerModeSchema.deleteOne({ ...owner, roleID: roleId });
    }

    await new LogBuilder(message.guild)
        .setTitle('🛠 Geliştirici Modu')
        .setDescription(`Geliştirici modu ${isEnabling ? 'açıldı' : 'kapatıldı'}.`)
        .addField('Kullanıcı', `${message.author.tag} (\`${message.author.id}\`)`, true)
        .addField('Rol', role.name, true)
        .setColor(isEnabling ? 'Green' : 'Red')
        .send();
};

/**
 * Handles `ENABLE_DEVELOPER_MODE=<roleId>`, `DISABLE_DEVELOPER_MODE=<roleId>`, `DEVELOPER_MODE` and `ROLES_LIST_DEVMODE` chat messages.
 * Messages from anyone who is not a developer are ignored without a reply.
 * @param {Client} client
 * @param {Message} message
 */
module.exports = async (client, message) => {
    if (!message.inGuild() || message.author.bot || !message.member) return;

    const match = developerModePattern.exec(message.content.trim());
    if (!match || !isDeveloper(message.author.id)) return;

    const [, action, roleId, isRoleListRequest] = match;

    try {
        if (action) await switchMode(message, action === 'ENABLE', roleId);
        else if (isRoleListRequest) await sendAssignableRoles(message);
        else await replyStatus(message);
    } catch (error) {
        console.error('Geliştirici modu işlenirken hata oluştu:', error);
    }
};
