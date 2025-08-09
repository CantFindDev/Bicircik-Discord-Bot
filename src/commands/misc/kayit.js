const { Client, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const signUpModel = require('../../schemas/signUpSchema');

module.exports = {
  name: 'kayıt',
  description: 'Kayıt olma formunu açar',
  botPermissions: [PermissionFlagsBits.ManageNicknames, PermissionFlagsBits.ManageRoles],

  callback: async (client, interaction) => {
    try {
      const data = await signUpModel.findOne({ guildID: interaction.guild.id });
      if (!data) {
        return interaction.reply({ content: 'Kayıt ayarları yapılmamış. Lütfen yönetici kayıt setup komutunu kullansın.', ephemeral: true });
      }

      // Kanal etiketini kaldırıp isim gösteriyoruz
      const kayıtKanalı = interaction.guild.channels.cache.get(data.kayıtChannel);
      if (interaction.channelId !== data.kayıtChannel) {
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
      } catch (error) {
        if (error.code === 50013) {
          await modalInteraction.reply({ content: 'Botun işlem yapmak için yeterli izni yok veya kullanıcı rolü çok yüksek.', ephemeral: true });
        } else {
          console.error(error);
          await modalInteraction.reply({ content: 'Bir hata oluştu, lütfen daha sonra tekrar deneyin.', ephemeral: true });
        }
      }
    } catch (error) {
      if (error.code === 'INTERACTION_COLLECTOR_ERROR' || error.code === 'INTERACTION_TIMEOUT') {
        return interaction.followUp({ content: 'Form doldurma süresi doldu.', ephemeral: true });
      }
      console.error(error);
    }
  }
};
