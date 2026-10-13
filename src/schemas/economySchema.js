const { Schema, model } = require('mongoose');

const economySchema = new Schema({
    guildID: { type: String, required: true },
    userID: { type: String, required: true },
    balance: { type: Number, default: 0 },
    lastDaily: { type: Date, default: null },
    dailyStreak: { type: Number, default: 0 },
    lastWork: { type: Date, default: null },
    lastHunt: { type: Date, default: null },
    rewardedLevel: { type: Number, default: 0 },
    animals: { type: Map, of: Number, default: {} },
});

economySchema.index({ guildID: 1, userID: 1 }, { unique: true });
economySchema.index({ guildID: 1, balance: -1 });

module.exports = model('economy', economySchema);
