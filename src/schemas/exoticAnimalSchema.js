const { Schema, model } = require('mongoose');

/** One animal bought from the daily shop, with the attributes it was listed with. */
const exoticAnimalSchema = new Schema({
    guildID: { type: String, required: true },
    userID: { type: String, required: true },
    shopDate: { type: String, required: true },
    slot: { type: Number, required: true },
    species: { type: String, required: true },
    tier: { type: String, required: true },
    trait: { type: String, required: true },
    power: { type: Number, required: true },
    speed: { type: Number, required: true },
    luck: { type: Number, required: true },
    price: { type: Number, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

/** A member can buy each listing once, enforced by the database. */
exoticAnimalSchema.index({ guildID: 1, userID: 1, shopDate: 1, slot: 1 }, { unique: true });
exoticAnimalSchema.index({ guildID: 1, userID: 1, price: -1 });

module.exports = model('exoticAnimal', exoticAnimalSchema);
