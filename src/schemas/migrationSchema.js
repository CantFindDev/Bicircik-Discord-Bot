const { Schema, model } = require('mongoose');

/** One document per one-time data change that has finished, named with the guild it ran for. */
const migrationSchema = new Schema({
    name: { type: String, required: true, unique: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = model('migration', migrationSchema);
