const { EmbedBuilder } = require('discord.js');
const settingsSchema = require('../schemas/settingsSchema');

class LogBuilder {
    constructor(guild) {
        this.guild = guild;
        this.embed = new EmbedBuilder()
            .setTimestamp()
            .setFooter({
                text: `${guild.name} • ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}`,
                iconURL: guild.iconURL({ dynamic: true })
            });
    }

    setAuthor(user) {
        this.embed.setAuthor({
            name: user.tag,
            iconURL: user.displayAvatarURL({ dynamic: true })
        });
        return this;
    }

    setAction(actionText, channel) {
        const channelMention = channel ? `${channel}` : '';
        this.embed.setDescription(`**${actionText}** ${channelMention}`);
        return this;
    }

    setTitle(title) {
        this.embed.setTitle(title);
        return this;
    }

    setDescription(description) {
        this.embed.setDescription(description);
        return this;
    }

    addField(name, value, inline = false) {
        this.embed.addFields({
            name: String(name ?? ''),
            value: String(value ?? ''),
            inline
        });
        return this;
    }

    setColor(color) {
        this.embed.setColor(color);
        return this;
    }

    addAttachment(url) {
        this.embed.setImage(url);
        return this;
    }

    async send() {
        const settings = await settingsSchema.findOne({ guildID: this.guild.id });
        if (!settings) return;

        const logChannel = this.guild.channels.cache.get(settings.logChannelID);
        if (!logChannel) return;

        await logChannel.send({ embeds: [this.embed] });
    }
}

module.exports = LogBuilder;
