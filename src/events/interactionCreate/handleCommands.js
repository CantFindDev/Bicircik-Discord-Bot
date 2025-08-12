const getLocalCommands = require('../../utils/getLocalCommands');
const { developers, testGuild } = require('../../../config.json');
const { Client, Interaction } = require('discord.js');
const LogBuilder = require("../../utils/logBuilder");

module.exports = async (client, interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const localCommands = getLocalCommands();

    try {
        const commandObject = localCommands.find((cmd) => cmd.name === interaction.commandName);
        if (!commandObject) return;

        if (!interaction.inGuild()) {
            interaction.reply({
                content: "Komutları sunucu dışında kullanamazsınız.",
                ephemeral: true,
            });
            return;
        }

        if (commandObject.devOnly) {
            if (!developers.includes(interaction.member.id)) {
                interaction.reply({
                    content: "Bu komutu sadece geliştiriciler kullanabilir!",
                    ephemeral: true,
                });
                return;
            }
        }

        if (commandObject.testOnly) {
            if (!(interaction.guild.id === testGuild)) {
                interaction.reply({
                    content: "Bu komut sadece test sunucusunda çalışabilir.",
                    ephemeral: true,
                });
                return;
            }
        }

        const requiredPerms = BigInt(commandObject.default_member_permissions || '0');
        if (!interaction.member.permissions.has(requiredPerms)) {
            return interaction.reply({
                content: 'Bu komutu kullanmak için yetkiniz yok.',
                ephemeral: true
            });
        }

        if (commandObject.botPermissions?.length) {
            for (const permission of commandObject.botPermissions) {
                const bot = interaction.guild.members.me;

                if (!bot.permissions.has(permission)) {
                    interaction.reply({
                        content: `Yeterli izinlere sahip değilim.`,
                        ephemeral: true,
                    });
                    break;
                }
            }
        }

        const subcommand = interaction.options.getSubcommand(false);
        if (commandObject.subcommand_permissions?.[subcommand]) {
            const requiredPerms = BigInt(commandObject.subcommand_permissions[subcommand]);

            if (!interaction.member.permissions.has(requiredPerms)) {
                return interaction.reply({
                    content: `\`${subcommand}\` alt komutunu çalıştırmak için ek izinlere ihtiyacınız var.`,
                    ephemeral: true
                });
            }
        }

        await new LogBuilder(interaction.guild)
            .setTitle("🛠 Komut Çalıştırıldı")
            .setDescription(`**/${interaction.commandName}** komutu çalıştırıldı`)
            .addField("Kullanıcı", `${interaction.user.tag} (\`${interaction.user.id}\`)`, true)
            .addField("Kanal", `${interaction.channel}`, true)
            .setColor("Blue")
            .send();

        await commandObject.callback(client, interaction);

    } catch (error) {
        console.error(`Bu komut çalıştırılırken hata oluştu:`, error);

        if (interaction.guild) {
            await new LogBuilder(interaction.guild)
                .setTitle("⚠️ Komut Hatası")
                .setDescription(`**/${interaction.commandName}** komutu çalıştırılırken hata oluştu.`)
                .addField("Kullanıcı", `${interaction.user.tag} (\`${interaction.user.id}\`)`, true)
                .addField("Hata Mesajı", `\`\`\`${error?.message || error}\`\`\``)
                .setColor("Red")
                .send();
        }
    }
};
