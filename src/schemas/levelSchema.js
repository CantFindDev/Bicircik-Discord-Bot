const { Schema, model } = require('mongoose');

const levelSchema = new Schema({
    guildID: {
        type: String,
        required: true,
        unique: true,
    },
    userLevels: {
        userID: {
            type: String,
            required: true,
        },
        xp: {
            type: Number,
            default: 0,
        },
        level: {
            type: Number,
            default: 0,
        }
    }
})

module.exports = model('level', levelSchema);