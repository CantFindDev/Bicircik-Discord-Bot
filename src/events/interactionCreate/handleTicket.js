const {
    Client,
    Interaction,
    ModalBuilder,
    TextInputBuilder,
    ActionRowBuilder,
    TextInputStyle,
    ChannelType,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField
} = require("discord.js");

const ticketSchema = require('../../schemas/ticketSchema');
const { createTranscript } = require('discord-html-transcripts');

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */
module.exports = async (client, interaction) => {
    const user = interaction.user;
    const guildData = await ticketSchema.findOne({ guildID: interaction.guild.id });

    const kullaniciBiletiniGetir = () => guildData?.tickets.find(t => t.userID === user.id);

    switch (interaction.customId) {

        // --- Create ticket menu ---
        case 'ticketCreateSelect': {
            if (kullaniciBiletiniGetir()) {
                return interaction.reply({
                    content: `Zaten <#${kullaniciBiletiniGetir().channelID}> kanalında açık bir biletin var.`,
                    ephemeral: true
                });
            }

            const modal = new ModalBuilder()
                .setTitle('Biletinizi oluşturun')
                .setCustomId('createTicketModal')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('ticketCreationReason')
                            .setLabel('Neden bu bileti oluşturuyorsunuz?')
                            .setPlaceholder('Bilet oluşturma sebebinizi yazınız')
                            .setRequired(true)
                            .setStyle(TextInputStyle.Paragraph)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('additionalInformation')
                            .setLabel('Eklemek istediğiniz başka bir bilgi var mı?')
                            .setPlaceholder('İsterseniz boş bırakabilirsiniz')
                            .setRequired(false)
                            .setStyle(TextInputStyle.Paragraph)
                    )
                );

            return interaction.showModal(modal);
        }

        // --- Create ticket modal ---
        case 'createTicketModal': {
            if (!guildData) {
                return interaction.reply({
                    content: `Üzgünüz! Bu sunucuda bilet sistemi henüz ayarlanmadı.`,
                    ephemeral: true
                });
            }

            const sebep = interaction.fields.getTextInputValue('ticketCreationReason');
            const ekBilgi = interaction.fields.getTextInputValue('additionalInformation');
            const kategori = interaction.guild.channels.cache.get(guildData.category);

            const biletKanali = await interaction.guild.channels.create({
                name: `bilet-${user.username}`,
                type: ChannelType.GuildText,
                topic: `Bilet sahibi: ${user.username} | Sebep: ${sebep}`,
                parent: kategori?.id || null,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    {
                        id: user.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory
                        ]
                    }
                ]
            });

            await ticketSchema.updateOne(
                { guildID: interaction.guild.id },
                { $push: { tickets: { channelID: biletKanali.id, userID: user.id, createdAt: new Date() } } }
            );

            const embed = new EmbedBuilder()
                .setColor("Blurple")
                .setTitle(`${user.username} kullanıcısından bilet`)
                .setDescription(`**Sebep:** ${sebep}\n\n**Ek Bilgi:** ${ekBilgi || "Yok"}`)
                .setTimestamp();

            const butonlar = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('closeTicket')
                    .setLabel('Bileti Kapat')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('ticketTranscript')
                    .setLabel('Döküm')
                    .setStyle(ButtonStyle.Primary)
            );

            await biletKanali.send({ embeds: [embed], components: [butonlar] });
            return interaction.reply({ content: `Biletiniz ${biletKanali} kanalında açıldı.`, ephemeral: true });
        }

        // --- Close ticket button ---
        case 'closeTicket': {
            const kapatmaModal = new ModalBuilder()
                .setTitle('Bilet Kapatma')
                .setCustomId('closeTicketModal')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('closeTicketReason')
                            .setLabel('Kapatma sebebinizi belirtin')
                            .setPlaceholder('Bu bilet neden kapatılıyor?')
                            .setRequired(true)
                            .setStyle(TextInputStyle.Paragraph)
                    )
                );

            return interaction.showModal(kapatmaModal);
        }

        // --- Close ticket modal ---
        case 'closeTicketModal': {
            if (!guildData) {
                return interaction.reply({ content: 'Bu sunucu için bilet verisi bulunamadı.', ephemeral: true });
            }

            const biletKaydi = guildData.tickets.find(t => t.channelID === interaction.channel.id);
            if (!biletKaydi) {
                return interaction.reply({ content: 'Bu kanal için açık bir bilet bulunamadı.', ephemeral: true });
            }

            const uye = interaction.guild.members.cache.get(biletKaydi.userID);
            const kapatmaSebebi = interaction.fields.getTextInputValue('closeTicketReason');
            await interaction.reply({ content: 'Bilet kısa süre içinde kapatılacak...' });

            const dokumKanal = interaction.guild.channels.cache.get(guildData.transcriptsChannel);
            if (!dokumKanal) {
                return interaction.followUp({ content: 'Döküm kanalı bulunamadı.', ephemeral: true });
            }

            const finalDokum = await createTranscript(interaction.channel, {
                limit: -1,
                returnBuffer: false,
                filename: `${interaction.channel.name}.html`
            });

            setTimeout(async () => {
                await ticketSchema.updateOne(
                    { guildID: interaction.guild.id },
                    { $pull: { tickets: { channelID: interaction.channel.id } } }
                );

                await dokumKanal.send({
                    content: `**${uye?.user.username || "Bilinmiyor"}** kullanıcısının bileti **${interaction.user.username}** tarafından kapatıldı.\nSebep: \`${kapatmaSebebi}\``,
                    files: [finalDokum]
                });

                await interaction.channel.delete().catch(() => {});
                if (uye) {
                    await uye.send(
                        `**${interaction.guild.name}** sunucusundaki biletiniz kapatıldı.\nSebep: \`${kapatmaSebebi}\``
                    ).catch(() => {});
                }
            }, 5000);

            break;
        }

        // --- Transcript button ---
        case 'ticketTranscript': {
            const dokum = await createTranscript(interaction.channel, {
                limit: -1,
                returnBuffer: false,
                filename: `${interaction.channel.name}.html`
            });

            return interaction.reply({
                content: `İşte bilet dökümünüz:`,
                files: [dokum],
                ephemeral: true
            });
        }
    }
};
