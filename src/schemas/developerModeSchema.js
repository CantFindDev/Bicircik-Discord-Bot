const { Schema, model } = require('mongoose');

const developerModeSchema = new Schema({
    guildID: { type: String, required: true },
    userID: { type: String, required: true },
    roleID: { type: String, required: true }
});

developerModeSchema.index({ guildID: 1, userID: 1 }, { unique: true });

module.exports = model('developerMode', developerModeSchema);
