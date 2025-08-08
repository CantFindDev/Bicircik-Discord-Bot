const { Guild } = require('discord.js');
const { Schema, model } = require('mongoose');

let ticketSchema = new Schema({
    Guild: {
        type: String,
        required: true
    },
    Category: {
        type: String,
        required: true
    },
});