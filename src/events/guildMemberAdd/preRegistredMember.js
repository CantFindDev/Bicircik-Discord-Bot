const signUpModel = require('../../schemas/registrationSchema');
const LogBuilder = require("../../utils/logBuilder");

/**
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').GuildMember} member
 */
module.exports = async (client, member) => {
    try {
        const data = await signUpModel.findOne({ guildID: member.guild.id });
        if (!data) return;

        const userData = data.userAnswers.find(u => u.userID === member.id);
        if (!userData) return;

        const nickname = `${userData.name} ${userData.surname || ''}`.trim();
        await member.setNickname(nickname).catch(console.error);

        if (data.kayıtRole) {
            const role = member.guild.roles.cache.get(data.kayıtRole);
            if (role) await member.roles.add(role).catch(console.error);
        }

        await new LogBuilder(member.guild)
            .setTitle("✅ Kullanıcı Otomatik Kayıt Oldu")
            .setDescription(`**${member.user.tag}** sunucuya katıldı ve otomatik olarak kayıt edildi.`)
            .addField("Yeni İsim", nickname, true)
            .addField("Verilen Rol", `<@&${data.kayıtRole}>`, true)
            .addField("BUG Zone'yi Nereden Öğrendiniz?", userData.joinReason || "Bilinmiyor", true)
            .setColor("Green")
            .send();

        console.log(`${member.user.tag} otomatik olarak kayıt edildi ve log gönderildi.`);

    } catch (err) {
        console.error('Otomatik kayıt hatası:', err);
        await new LogBuilder(member.guild)
            .setTitle("⚠️ Otomatik Kayıt Hatası")
            .setDescription(`**${member.user.tag}** kullanıcı otomatik kayıt edilirken hata oluştu.`)
            .addField("Hata", err.message || "Bilinmeyen hata", true)
            .setColor("Red")
            .send();
    }
};
