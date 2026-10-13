const { Schema, model } = require('mongoose');

const autoModSchema = new Schema({
    guildID: { type: String, required: true, unique: true },
    inviteFilter: { type: Boolean, default: false },
    spamFilter: { type: Boolean, default: false },
    mentionLimit: { type: Number, default: 0 },
    bannedWords: { type: [String], default: [] },
    exemptChannels: { type: [String], default: [] },
});

module.exports = model('autoMod', autoModSchema);
