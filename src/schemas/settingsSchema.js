const { Schema, model } = require('mongoose');

const settingsSchema = new Schema({
    guildID: { type: String, required: true, unique: true },
    logChannelID: {type: String, required: true}
});

module.exports = model('settings', settingsSchema);
