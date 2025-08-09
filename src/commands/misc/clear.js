const {Client,Interaction, ApplicationCommandOptionType,PermissionFlagsBits,Guild, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'clear',
    description: 'Clears amount of chat you provide hepsi yazılırsa bütün mesajlar silinir',

    memberPermissions: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages],
    botPermissions: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages],
    
    options: [
        {
            name: 'amount',
            description: 'Silinecek mesaj sayısı (1 ile 100 arası ve bütün mesajları silmek için hepsi',
            required: true,
            type: ApplicationCommandOptionType.String,
        }
    ],

    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        
        const channelToClear = interaction.channel;
        const messageToClear = interaction.options.get('amount').value;
        const messageToClearAsInt = parseInt(messageToClear);

        await interaction.deferReply({ ephemeral: true });

        if (messageToClear.toLowerCase() === "hepsi") {

            const nameOfChannelToClear = channelToClear.name;
            const typeOfChannelToClear = channelToClear.type;
            const parentOfChannelToClear = channelToClear.parent;

            interaction.channel.delete();

            const newChannelID = (await interaction.guild.channels.create({
                name: nameOfChannelToClear,
                type: typeOfChannelToClear,
                parent: parentOfChannelToClear,})).id

            const embed = new EmbedBuilder()
                .setTitle("Başarıyla Temizlendi")
                .setDescription(`Kanaldaki bütün mesajlar başarıyla temizlendi`)
                .setColor('Random')

            client.channels.cache.get(newChannelID).send({ embeds: [embed] }).then((message) => {
                setTimeout(() => { message?.delete() }, 1000 * 5)
            });
           
            return;
        }

         if (messageToClearAsInt <= 0 || messageToClearAsInt > 100 || isNaN(messageToClearAsInt)) {
             interaction.editReply(`Girilen sayı ne yazık ki uygun değil lütfen 1-100 arasında bir sayı giriniz ya da bütün mesajları silmek için hepsi yazınız!`)
             return;
        }

        await interaction.channel.bulkDelete(messageToClearAsInt);
        interaction.editReply(`${messageToClearAsInt} mesaj başarıyla silindi`);
    }
}