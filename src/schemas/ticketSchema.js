const { Guild } = require('discord.js');
const { Schema, model } = require('mongoose');

let ticketSchema = new Schema({
    guildID: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true
    },
    transcriptsChannel: {
        type: String,
        required: true
    }
});

module.exports = model('ticket', ticketSchema);