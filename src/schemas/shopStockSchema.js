const { Schema, model } = require('mongoose');

const KEPT_SECONDS = 3 * 24 * 60 * 60;

/** How many of one daily shop listing the guild has bought. Old days are deleted by the TTL index on createdAt. */
const shopStockSchema = new Schema({
    guildID: { type: String, required: true },
    date: { type: String, required: true },
    slot: { type: Number, required: true },
    sold: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now, expires: KEPT_SECONDS },
});

shopStockSchema.index({ guildID: 1, date: 1, slot: 1 }, { unique: true });

module.exports = model('shopStock', shopStockSchema);
