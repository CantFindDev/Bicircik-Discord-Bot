require("dotenv").config();
require("./utils/useImageFallback")();
const { Client, IntentsBitField, Partials } = require("discord.js");
const mongoose = require('mongoose');
const eventHandler = require("./handlers/eventHandler");

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.DirectMessages,
    IntentsBitField.Flags.GuildPresences,
  ],
  partials: [
    Partials.Channel
  ],
});

(async () => {
  try {
    eventHandler(client);
    mongoose.set('strictQuery', false);
    await mongoose.connect(process.env.DB_CONNECTION_URI);
    console.log("Connected to Database")
  }
  catch (error) {
    console.log(`Error: ${error}`);
  }
})();

client.login(process.env.BOT_TOKEN);
