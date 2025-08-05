module.exports = {
    name: 'ping',
    description: 'Says pong and sends the ping',
    testOnly: true,
    devOnly: true,
    deleted: false,

    callback: (client, interaction) => {
        interaction.reply(`Pong! ${client.ws.ping}ms`);
    }
}