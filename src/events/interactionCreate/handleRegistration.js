const {
    Client,
    Interaction,
    ModalBuilder,
    TextInputBuilder,
    ActionRowBuilder,
    TextInputStyle
} = require("discord.js");

const signUpModel = require('../../schemas/registrationSchema');
const LogBuilder = require("../../utils/logBuilder");

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */
module.exports = async (client, interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'registerButton') return;

    try {
        const data = await signUpModel.findOne({ guildID: interaction.guild.id });
        if (!data) {
            await new LogBuilder(interaction.guild)
                .setTitle("⚠️ Kayıt Başarısız")
                .setDescription(`**${interaction.user.tag}** kayıt olmaya çalıştı ancak kayıt ayarları yapılmamış.`)
                .setColor("Red")
                .send();

            return interaction.reply({ content: 'Kayıt ayarları yapılmamış. Yönetici kayıt setup komutunu kullansın.', ephemeral: true });
        }

        const kayıtKanalı = interaction.guild.channels.cache.get(data.kayıtChannel);
        if (interaction.channelId !== data.kayıtChannel) {
            await new LogBuilder(interaction.guild)
                .setTitle("⚠️ Kayıt Başarısız")
                .setDescription(`**${interaction.user.tag}** yanlış kanalda kayıt olmaya çalıştı.`)
                .addField("Bulunduğu Kanal", `<#${interaction.channelId}>`, true)
                .addField("Gerekli Kanal", kayıtKanalı ? `<#${kayıtKanalı.id}>` : "Bilinmiyor", true)
                .setColor("Red")
                .send();

            return interaction.reply({ content: `Bu buton sadece "${kayıtKanalı?.name}" kanalında çalışır.`, ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setTitle('Kayıt Formu')
            .setCustomId(`modal-${interaction.user.id}`);

        const nameInput = new TextInputBuilder()
            .setCustomId('nameInput')
            .setRequired(true)
            .setPlaceholder('BUG')
            .setLabel('Lütfen adınızı giriniz')
            .setStyle(TextInputStyle.Short);

        const surnameInput = new TextInputBuilder()
            .setCustomId('surnameInput')
            .setRequired(true)
            .setPlaceholder('Zone')
            .setLabel('Lütfen soyadınızı giriniz')
            .setStyle(TextInputStyle.Short);

        const reasonInput = new TextInputBuilder()
            .setCustomId('reasonInput')
            .setRequired(false)
            .setPlaceholder('BUG Zone\'yi nasıl keşfettiniz?')
            .setLabel('BUG Zone\'yi Nereden Öğrendiniz?')
            .setStyle(TextInputStyle.Paragraph);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(surnameInput),
            new ActionRowBuilder().addComponents(reasonInput)
        );

        await interaction.showModal(modal);

        try {
            const filter = i => i.customId === `modal-${interaction.user.id}` && i.user.id === interaction.user.id;
            const modalInteraction = await interaction.awaitModalSubmit({ filter, time: 90_000 });

            const nameValue = modalInteraction.fields.getTextInputValue('nameInput');
            const surnameValue = modalInteraction.fields.getTextInputValue('surnameInput');
            const reasonValue = modalInteraction.fields.getTextInputValue('reasonInput');

            await modalInteraction.deferReply({ ephemeral: true });

            await modalInteraction.member.setNickname(`${nameValue} ${surnameValue || ''}`.trim());
            await modalInteraction.member.roles.add(data.kayıtRole);

            data.userAnswers.push({
                userID: modalInteraction.user.id,
                name: nameValue,
                surname: surnameValue || '',
                joinReason: reasonValue
            });
            await data.save();

            await modalInteraction.user.send(`✅ Başarıyla kayıt oldunuz!\nYeni isminiz: **${nameValue} ${surnameValue || ''}**\nRolünüz verildi!\nBUG Zone'yi Nereden Öğrendiniz?: ${reasonValue || "Belirtilmedi"}`);

            await new LogBuilder(interaction.guild)
                .setTitle("✅ Yeni Kayıt Yapıldı")
                .setDescription(`**${modalInteraction.user.tag}** sunucuya başarıyla kayıt oldu.`)
                .addField("• Yeni İsim", `${nameValue} ${surnameValue || ''}`.trim(), true)
                .addField("• Verilen Rol", `<@&${data.kayıtRole}>`, true)
                .addField("• Kayıt Kanalı", kayıtKanalı ? `<#${kayıtKanalı.id}>` : "Bilinmiyor", true)
                .addField("• BUG Zone'yi Nereden Öğrendiniz?", reasonValue || "Belirtilmedi", false)
                .setColor("Green")
                .send();

            await modalInteraction.editReply({ content: "Kayıt işleminiz tamamlandı! Detaylar DM'den gönderildi." });

        } catch (err) {
            if (err.code === 'InteractionCollectorError') {
                await new LogBuilder(interaction.guild)
                    .setTitle("ℹ️ Kayıt İptal Edildi")
                    .setDescription(`**${interaction.user.tag}** kayıt formunu doldurmadı: süre doldu.`)
                    .setColor("Yellow")
                    .send();

                return interaction.followUp({ content: "⏳ Kayıt işlemi zaman aşımına uğradı.", ephemeral: true });
            } else {
                throw err; // diğer hatalar üstteki catch'e gidecek
            }
        }

    } catch (error) {
        let hataSebebi = (error.code === 'InteractionCollectorError') ? 'Form doldurma süresi doldu' : 'Bilinmeyen hata';

        await new LogBuilder(interaction.guild)
            .setTitle("⚠️ Kayıt Başarısız")
            .setDescription(`**${interaction.user.tag}** kayıt olurken hata aldı.`)
            .addField("Sebep", hataSebebi, true)
            .setColor("Red")
            .send();

        console.error(error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: `❌ Kayıt yapılamadı: ${hataSebebi}`, ephemeral: true });
        }
    }
};
