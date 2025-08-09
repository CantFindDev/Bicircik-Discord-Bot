const { Client, GatewayIntentBits } = require('discord.js');
const signUpSettings = require('../../schemas/signUpSchema');

module.exports = (client) => {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    const settings = await signUpSettings.findOne({ guildID: message.guild.id });
    if (!settings) return;

    if (message.channel.id !== settings.kayıtChannel) return;

    try {
      await message.delete();
    } catch (error) {
      console.error('Mesaj silinirken hata:', error);
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.guild) return;

    const settings = await signUpSettings.findOne({ guildID: interaction.guild.id });
    if (!settings) return;

    if (interaction.channelId !== settings.kayıtChannel) return;

    if (interaction.commandName !== 'kayıt') {
      try {
        await interaction.reply({ content: 'Bu kanalda sadece /kayıt komutu kullanılabilir.', ephemeral: true });
      } catch (err) {
        console.error('Interaction yanıtlanırken hata:', err);
      }
    }
  });
};
