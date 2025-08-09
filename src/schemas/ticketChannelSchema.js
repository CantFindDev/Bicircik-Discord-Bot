const { Guild } = require('discord.js');
const { Schema, model } = require('mongoose');

let ticketChannelSchema = new Schema({
    channelID: {
        type: String,
        required: true,
    },
    userID: {
        type: String,
        required: true
    }
});

module.exports = model('ticketChannel', ticketChannelSchema);