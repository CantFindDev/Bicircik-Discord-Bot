const { Schema, model } = require('mongoose');

const chatBotSchema = new Schema({
    guildID: { type: String, required: true, unique: true },
    channelID: { type: String, required: true }
});

module.exports = model('chatBotSettings', chatBotSchema);
