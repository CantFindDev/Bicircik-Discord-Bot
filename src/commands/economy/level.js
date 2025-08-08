const { Client, Interaction, ApplicationCommandOptionType, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const Level = require('../../models/level')
const canvacord = require('canvacord');
const calculateLevelXp = require('../../utils/calculateLevelXp');

module.exports = {
    name: 'level',
    description: 'Shows yours/someones level/rank card',
    options: [
        {
            name: 'target-user',
            description: 'The user',
            type: ApplicationCommandOptionType.Mentionable,
        }
    ],

    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        await interaction.deferReply();
        
        const mentionUserID = interaction.options.get('target-user')?.value;
        const targetUserID = mentionUserID || interaction.member.id;
        const targetUserObj = await interaction.guild.members.fetch(targetUserID);

        const fetchedLevel = await Level.findOne({
            userID: targetUserID,
            guildID: interaction.guild.id,
        })

        if (!fetchedLevel) {
            interaction.editReply(
                mentionUserID ? `${targetUserObj.user.tag} doesn't have any levels yet. Try again when they chat a little more!` : "You don't have any levels yet. Chat a little more and try again!"
            );
            return;
        }

        let allLevels = await Level.find({ guild: interaction.guild.id }).select('-_id userID level xp');
        allLevels.sort((a, b) => {
            if (a.level === b.level) return b.xp - a.xp;
            return b.level - a.level;
        })

        let currentRank = allLevels.findIndex((lvl) => lvl.userID === targetUserID) + 1;

        const { Font } = require('canvacord');
        Font.loadDefault();

        const rank = new canvacord.RankCardBuilder()
            .setTextStyles({
                level: "LEVEL:",
                xp: "EXP:",
                rank: "RANK:",
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
            .setStatus(targetUserObj.presence.status)
            .setUsername(targetUserObj.user.username)
            .setDisplayName(targetUserObj.user.displayName)

        const image = await rank.build({ format: 'png', });
        const attachment = new AttachmentBuilder(image);
        interaction.editReply({ files: [attachment] });

    }
}