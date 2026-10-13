const { Client, Interaction, ApplicationCommandOptionType, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { getTranslator } = require('../../utils/language');
const autoModSchema = require('../../schemas/autoModSchema');
const { invalidateAutoModSettings, normalize } = require('../../utils/autoModSettings');

const MAX_BANNED_WORDS = 200;
const MAX_WORD_LENGTH = 40;
const MAX_MENTION_LIMIT = 50;
const MAX_EXEMPT_CHANNELS = 50;

const toggleOption = {
    name: 'aktif',
    description: 'Filtre açık mı',
    type: ApplicationCommandOptionType.Boolean,
    required: true,
};

const wordOption = {
    name: 'kelime',
    description: 'Yasaklı kelime',
    type: ApplicationCommandOptionType.String,
    required: true,
    min_length: 2,
    max_length: MAX_WORD_LENGTH,
};

/** Writes the change, creating the guild's settings on first use, and drops the cached copy. */
const updateSettings = async (guildID, update) => {
    const settings = await autoModSchema.findOneAndUpdate({ guildID }, update, { upsert: true, new: true, setDefaultsOnInsert: true });
    invalidateAutoModSettings(guildID);
    return settings;
};

const formatToggle = (t, isEnabled) => t(isEnabled ? 'automod.on' : 'automod.off');

module.exports = {
    name: 'otomod',
    description: 'Otomatik moderasyon ayarları',
    aliases: [{ name: 'automod', description: 'Automatic moderation settings', language: 'en' }],

    mainOnly: true,

    memberPermissions: [PermissionFlagsBits.Administrator],
    botPermissions: [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ModerateMembers],

    options: [
        {
            name: 'durum',
            description: 'Otomod ayarlarını gösterir',
            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: 'davet-filtresi',
            description: 'Discord davet linklerini siler',
            type: ApplicationCommandOptionType.Subcommand,
            options: [toggleOption],
        },
        {
            name: 'spam-filtresi',
            description: 'Art arda çok hızlı mesaj atanı 5 dakika susturur',
            type: ApplicationCommandOptionType.Subcommand,
            options: [toggleOption],
        },
        {
            name: 'etiket-limiti',
            description: 'Tek mesajda etiketlenebilecek en fazla kişi sayısı',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'limit',
                    description: 'Kişi sayısı, kapatmak için 0',
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    min_value: 0,
                    max_value: MAX_MENTION_LIMIT,
                },
            ],
        },
        {
            name: 'kelime-ekle',
            description: 'Yasaklı kelime ekler',
            type: ApplicationCommandOptionType.Subcommand,
            options: [wordOption],
        },
        {
            name: 'kelime-sil',
            description: 'Yasaklı kelimeyi kaldırır',
            type: ApplicationCommandOptionType.Subcommand,
            options: [wordOption],
        },
        {
            name: 'muaf-kanal',
            description: 'Kanalı otomoddan muaf tutar, tekrar seçilirse muafiyeti kaldırır',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'kanal',
                    description: 'Muaf tutulacak kanal',
                    type: ApplicationCommandOptionType.Channel,
                    required: true,
                    channel_types: [ChannelType.GuildText],
                },
            ],
        },
    ],

    /**
     * Shows or changes the guild's automod settings. Members with Manage Messages are never filtered.
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const t = getTranslator(interaction);
        const subcommand = interaction.options.getSubcommand();
        const guildID = interaction.guild.id;

        await interaction.deferReply({ ephemeral: true });

        switch (subcommand) {
            case 'durum': {
                const settings = await autoModSchema.findOne({ guildID });
                if (!settings) {
                    await interaction.editReply({ content: t('automod.notConfigured') });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setTitle(t('automod.title'))
                    .addFields(
                        { name: t('automod.field.invite'), value: formatToggle(t, settings.inviteFilter), inline: true },
                        { name: t('automod.field.spam'), value: formatToggle(t, settings.spamFilter), inline: true },
                        { name: t('automod.field.mention'), value: settings.mentionLimit ? t('automod.mentionValue', { limit: settings.mentionLimit }) : t('automod.off'), inline: true },
                        { name: t('automod.field.words'), value: String(settings.bannedWords.length), inline: true },
                        { name: t('automod.field.exempt'), value: settings.exemptChannels.map((id) => `<#${id}>`).join(' ') || t('automod.none') },
                    )
                    .setColor('Blue');

                await interaction.editReply({ embeds: [embed] });
                return;
            }

            case 'davet-filtresi': {
                const isEnabled = interaction.options.getBoolean('aktif');
                await updateSettings(guildID, { $set: { inviteFilter: isEnabled } });
                await interaction.editReply({ content: t('automod.inviteSet', { state: formatToggle(t, isEnabled) }) });
                return;
            }

            case 'spam-filtresi': {
                const isEnabled = interaction.options.getBoolean('aktif');
                await updateSettings(guildID, { $set: { spamFilter: isEnabled } });
                await interaction.editReply({ content: t('automod.spamSet', { state: formatToggle(t, isEnabled) }) });
                return;
            }

            case 'etiket-limiti': {
                const limit = Math.min(Math.max(interaction.options.getInteger('limit'), 0), MAX_MENTION_LIMIT);
                await updateSettings(guildID, { $set: { mentionLimit: limit } });
                await interaction.editReply({ content: limit ? t('automod.mentionSet', { limit }) : t('automod.mentionOff') });
                return;
            }

            case 'kelime-ekle': {
                const word = normalize(interaction.options.getString('kelime').trim()).slice(0, MAX_WORD_LENGTH);
                if (word.length < 2) {
                    await interaction.editReply({ content: t('automod.wordTooShort') });
                    return;
                }

                const settings = await autoModSchema.findOne({ guildID });
                if (settings && settings.bannedWords.length >= MAX_BANNED_WORDS) {
                    await interaction.editReply({ content: t('automod.wordLimit', { max: MAX_BANNED_WORDS }) });
                    return;
                }

                await updateSettings(guildID, { $addToSet: { bannedWords: word } });
                await interaction.editReply({ content: t('automod.wordAdded') });
                return;
            }

            case 'kelime-sil': {
                const word = normalize(interaction.options.getString('kelime').trim());
                await updateSettings(guildID, { $pull: { bannedWords: word } });
                await interaction.editReply({ content: t('automod.wordRemoved') });
                return;
            }

            case 'muaf-kanal': {
                const channel = interaction.options.getChannel('kanal');
                const settings = await autoModSchema.findOne({ guildID });
                const isExempt = settings?.exemptChannels.includes(channel.id) ?? false;

                if (!isExempt && settings && settings.exemptChannels.length >= MAX_EXEMPT_CHANNELS) {
                    await interaction.editReply({ content: t('automod.exemptLimit', { max: MAX_EXEMPT_CHANNELS }) });
                    return;
                }

                await updateSettings(guildID, isExempt ? { $pull: { exemptChannels: channel.id } } : { $addToSet: { exemptChannels: channel.id } });
                await interaction.editReply({ content: t(isExempt ? 'automod.exemptRemoved' : 'automod.exemptAdded', { channel }) });
                return;
            }

            default:
                await interaction.editReply({ content: t('automod.unknownSubcommand') });
        }
    }
};
