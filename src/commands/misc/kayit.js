const { Client, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const signUpModel = require('../../schemas/signUpSchema');
const LogBuilder = require("../../utils/logBuilder");

module.exports = {
  name: 'kayıt',
  description: 'Kayıt olma formunu açar',
  mainOnly: true,
  botPermissions: [PermissionFlagsBits.ManageNicknames, PermissionFlagsBits.ManageRoles],

  callback: async (client, interaction) => {
    try {
      const data = await signUpModel.findOne({ guildID: interaction.guild.id });
      if (!data) {
        await new LogBuilder(interaction.guild)
          .setTitle("⚠️ Kayıt Başarısız")
          .setDescription(`**${interaction.user.tag}** kayıt olmaya çalıştı ancak kayıt ayarları yapılmamış.`)
          .setColor("Red")
          .send();

        return interaction.reply({ content: 'Kayıt ayarları yapılmamış. Lütfen yönetici kayıt setup komutunu kullansın.', ephemeral: true });
      }

      const kayıtKanalı = interaction.guild.channels.cache.get(data.kayıtChannel);
      if (interaction.channelId !== data.kayıtChannel) {
        await new LogBuilder(interaction.guild)
          .setTitle("⚠️ Kayıt Başarısız")
          .setDescription(`**${interaction.user.tag}** kayıt olmaya çalıştı ancak yanlış kanalda komut kullandı.`)
          .addField("Bulunduğu Kanal", `<#${interaction.channelId}>`, true)
          .addField("Gerekli Kanal", kayıtKanalı ? `<#${kayıtKanalı.id}>` : "Bilinmiyor", true)
          .setColor("Red")
          .send();

        return interaction.reply({ content: `Bu komut sadece "${kayıtKanalı?.name}" kanalında kullanılabilir.`, ephemeral: true });
      }

      const modal = new ModalBuilder()
        .setTitle('Kayıt Formu')
        .setCustomId(`modal-${interaction.user.id}`);

      const nameInput = new TextInputBuilder()
        .setCustomId('nameInput')
        .setRequired(true)
        .setPlaceholder('John')
        .setLabel('Lütfen adınızı giriniz')
        .setStyle(TextInputStyle.Short);

      const surnameInput = new TextInputBuilder()
        .setCustomId('surnameInput')
        .setRequired(false)
        .setPlaceholder('Doe')
        .setLabel('Lütfen soyadınızı giriniz')
        .setStyle(TextInputStyle.Short);

      modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(surnameInput)
      );

      await interaction.showModal(modal);

      const filter = i => i.customId === `modal-${interaction.user.id}` && i.user.id === interaction.user.id;
      const modalInteraction = await interaction.awaitModalSubmit({ filter, time: 30_000 });

      const nameInputValue = modalInteraction.fields.getTextInputValue('nameInput');
      const surnameInputValue = modalInteraction.fields.getTextInputValue('surnameInput');

      try {
        await modalInteraction.member.setNickname(`${nameInputValue} ${surnameInputValue || ''}`.trim());
        await modalInteraction.member.roles.add(data.kayıtRole);

        await modalInteraction.user.send(`✅ Başarıyla kayıt oldunuz!\nYeni isminiz: **${nameInputValue} ${surnameInputValue || ''}**\nRolünüz verildi!`);
        await modalInteraction.reply({ content: 'Kayıt işleminiz tamamlandı. Detaylar DM’den gönderildi.', ephemeral: true });

        await new LogBuilder(interaction.guild)
          .setTitle("✅ Yeni Kayıt Yapıldı")
          .setDescription(`**${modalInteraction.user.tag}** adlı kullanıcı kayıt oldu.`)
          .addField("Yeni İsim", `${nameInputValue} ${surnameInputValue || ''}`.trim(), true)
          .addField("Verilen Rol", `<@&${data.kayıtRole}>`, true)
          .addField("Kayıt Kanalı", kayıtKanalı ? kayıtKanalı.name : "Bilinmiyor", true)
          .setColor("Green")
          .send();

      } catch (error) {
        let sebep = 'Bilinmeyen hata';
        if (error.code === 50013) {
          sebep = 'Botun izni yok veya kullanıcı rolü çok yüksek';
          await modalInteraction.reply({ content: 'Botun işlem yapmak için yeterli izni yok veya kullanıcı rolü çok yüksek.', ephemeral: true });
        } else {
          console.error(error);
          await modalInteraction.reply({ content: 'Bir hata oluştu, lütfen daha sonra tekrar deneyin.', ephemeral: true });
        }

        await new LogBuilder(interaction.guild)
          .setTitle("⚠️ Kayıt Başarısız")
          .setDescription(`**${modalInteraction.user.tag}** adlı kullanıcı kayıt olamadı.`)
          .addField("Sebep", sebep, true)
          .addField("İsim Girişi", `${nameInputValue} ${surnameInputValue || ''}`.trim(), true)
          .setColor("Red")
          .send();
      }
    } catch (error) {
      let hataSebebi = 'Bilinmeyen hata';
      if (error.code === 'INTERACTION_COLLECTOR_ERROR' || error.code === 'INTERACTION_TIMEOUT') {
        hataSebebi = 'Form doldurma süresi doldu';
        await interaction.followUp({ content: 'Form doldurma süresi doldu.', ephemeral: true });
      }
      console.error(error);

      await new LogBuilder(interaction.guild)
        .setTitle("⚠️ Kayıt Başarısız")
        .setDescription(`**${interaction.user.tag}** kayıt olurken hata aldı.`)
        .addField("Sebep", hataSebebi, true)
        .setColor("Red")
        .send();
    }
  }
};
