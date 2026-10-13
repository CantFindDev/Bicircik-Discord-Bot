const { Schema, model } = require('mongoose');

const moderationCaseSchema = new Schema({
    guildID: { type: String, required: true },
    userID: { type: String, required: true },
    moderatorID: { type: String, required: true },
    type: { type: String, required: true, enum: ['warn', 'timeout', 'untimeout', 'kick', 'ban', 'unban'] },
    reason: { type: String, default: 'Sebep belirtilmedi.' },
    durationMs: { type: Number, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

moderationCaseSchema.index({ guildID: 1, userID: 1, createdAt: -1 });

module.exports = model('moderationCase', moderationCaseSchema);
