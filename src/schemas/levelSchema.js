const { Schema, model } = require('mongoose');

const userLevelSchema = new Schema({
    userID: { type: String, required: true },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 0 }
});

const levelSchema = new Schema({
    guildID: { type: String, required: true, unique: true },
    userLevels: [userLevelSchema]
});

module.exports = model('level', levelSchema);
