const { Schema, model } = require('mongoose');

let welcomeSchema = new Schema({
    guildID: {
        type: String,
        required: true,
        unique: true,
    },
    welcomeChannel: {
        type: String,
        required: false,
    },
    goodbyeChannel: {
        type: String,
        required: false,
    },
});

module.exports = model('welcomer', welcomeSchema);
