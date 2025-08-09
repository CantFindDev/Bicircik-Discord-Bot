const { Client, Interaction, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, ActionRowBuilder } = require('discord.js');

module.exports = {
    name: 'kayıt',
    description: 'Kayıt olmak için',

    botPermissions: [PermissionFlagsBits.ManageNicknames],

    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        try {

            const modal = new ModalBuilder()
                .setTitle('Kayıt Formu')
                .setCustomId(`modal-${interaction.user.id}`)
        
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

            const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
            const secondActionRow = new ActionRowBuilder().addComponents(surnameInput);

            modal.addComponents(firstActionRow, secondActionRow);

            await interaction.showModal(modal);

            const filter = i => i.customId === `modal-${interaction.user.id}` && i.user.id === interaction.user.id;

            const modalInteraction = await interaction.awaitModalSubmit({ filter, time: 30_000 });

            const nameInputValue = modalInteraction.fields.getTextInputValue('nameInput');
            const surnameInputValue = modalInteraction.fields.getTextInputValue('surnameInput');

            try {
                await modalInteraction.member.setNickname(nameInputValue + " " + surnameInputValue);
                const roleId = '680841858833711108';

                await modalInteraction.member.roles.add(roleId);
                await modalInteraction.reply({ content: "Nickname değiştirildi ve rol başarıyla verildi!", ephemeral: true });
            } catch (error) {
                if (error.code === 50013) {
                    await modalInteraction.reply({ content: "Botun işlem yapmak için yeterli izni yok veya kullanıcı rolü çok yüksek.", ephemeral: true });
                } else {
                    console.error(error);
                    await modalInteraction.reply({ content: "Bir hata oluştu, lütfen daha sonra tekrar deneyin.", ephemeral: true });
                }
            }
        } catch (error) {
            if (error.code === 'INTERACTION_COLLECTOR_ERROR' || error.code === 'INTERACTION_TIMEOUT') {
                return interaction.followUp({ content: "Form doldurma süresi doldu.", ephemeral: true });
            }
            console.error(error);
        }
    }
};
