const { Schema, model } = require('mongoose');

let ticketSchema = new Schema({
    guildID: {
        type: String,
        required: true,
        unique: true,
    },
    category: {
        type: String,
        required: true,
    },
    transcriptsChannel: {
        type: String,
        required: true,
    },
    tickets: [
        {
            channelID: { type: String, required: true },
            userID: { type: String, required: true },
            createdAt: { type: Date, default: Date.now }
        }
    ]
});

module.exports = model('ticket', ticketSchema);
