const { Client, Message } = require('discord.js');
const levelSchema = require('../../models/levelSchema');
const calculateLevelXp = require('../../utils/calculateLevelXp');
const cooldowns = new Set();

function getRandomXP(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * @param {Client} client
 * @param {Message} message
 */
module.exports = async (client, message) => { 
    if (!message.inGuild() || message.author.bot || cooldowns.has(message.author.id)) return;

    const xpToGive = getRandomXP(5, 15);

    const query = {
        userID: message.author.id,
        guildID: message.guild.id,
    }

    try {
        const level = await levelSchema.findOne(query);

        if (level) {
            level.xp += xpToGive;

            if (level.xp > calculateLevelXp(level.level)) {
                level.xp = 0;
                level.level += 1;

                message.channel.send(`${message.member} you have leveled up to **level ${level.level}**.`)
            }

            await level.save().catch((e) => {
                console.log(`Error saving updated level ${e}`);
                return;
            });
        }
        else {
            const newLevel = new levelSchema({
                userID: message.author.id,
                guildID: message.guild.id,
                xp: xpToGive
            })

            await newLevel.save()
        }

        cooldowns.add(message.author.id);
        setTimeout(() => {
            cooldowns.delete(message.author.id);
        }, 30000)
    } catch (error) {
        console.log(`Error giving xp: ${error}`)
    }
}