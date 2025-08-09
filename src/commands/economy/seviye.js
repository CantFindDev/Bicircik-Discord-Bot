const { Client, Interaction, ApplicationCommandOptionType, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const levelSchema = require('../../schemas/levelSchema');
const canvacord = require('canvacord');
const calculateLevelXp = require('../../utils/calculateLevelXp');

module.exports = {
    name: 'seviye',
    description: 'Seçilen kişinin aktif seviyesini ve sunucudaki sıralamasını gösterir',
    options: [
        {
            name: 'hedef-kullanıcı',
            description: 'Seviyesini görmek istediğiniz kullanıcı',
            type: ApplicationCommandOptionType.Mentionable,
        }
    ],

    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const mentionUserID = interaction.options.get('hedef-kullanıcı')?.value;
        const targetUserID = mentionUserID || interaction.member.id;
        const targetUserObj = await interaction.guild.members.fetch(targetUserID);

        const guildData = await levelSchema.findOne({ guildID: interaction.guild.id });

        if (!guildData || !Array.isArray(guildData.userLevels) || guildData.userLevels.length === 0) {
            await interaction.editReply("Sunucuda şu anda kimsenin seviyesi bulunmamaktadır.");
            return;
        }

        const fetchedLevel = guildData.userLevels.find(u => u.userID === targetUserID);

        if (!fetchedLevel) {
            await interaction.editReply(
                mentionUserID
                    ? `${targetUserObj.user.tag} henüz seviye kazanmadı. Biraz daha sohbet edince tekrar deneyin!`
                    : "Henüz seviyeniz bulunmamaktadır. Biraz daha sohbet edin ve tekrar deneyin!"
            );
            return;
        }

        const allLevels = [...guildData.userLevels];
        allLevels.sort((a, b) => {
            if (a.level === b.level) return b.xp - a.xp;
            return b.level - a.level;
        });

        const currentRank = allLevels.findIndex(u => u.userID === targetUserID) + 1;

        const { Font } = require('canvacord');
        Font.loadDefault();

        const rank = new canvacord.RankCardBuilder()
            .setTextStyles({
                level: "SEVİYE:",
                xp: "XP:",
                rank: "SIRALAMA:",
            })
            .setAvatar(
                targetUserObj.user.displayAvatarURL({
                    size: 256,
                    forceStatic: true,
                })
            )
            .setRank(currentRank)
            .setLevel(fetchedLevel.level)
            .setCurrentXP(fetchedLevel.xp)
            .setRequiredXP(calculateLevelXp(fetchedLevel.level))
            .setStatus(targetUserObj.presence?.status || "offline")
            .setUsername(targetUserObj.user.username)
            .setDisplayName(targetUserObj.displayName);

        const image = await rank.build({ format: 'png' });
        const attachment = new AttachmentBuilder(image, { name: 'rank.png' });
        await interaction.editReply({ files: [attachment] });
    }
};
