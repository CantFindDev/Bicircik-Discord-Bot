module.exports = {
    name: 'ping',
    description: 'Says pong and sends the ping',

    callback: (client, interaction) => {
        interaction.reply(`Pong! ${client.ws.ping}ms`);
    }
}