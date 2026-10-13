require("dotenv").config();
require("./utils/useImageFallback")();
const { Client, IntentsBitField, Partials } = require("discord.js");
const mongoose = require('mongoose');
const eventHandler = require("./handlers/eventHandler");

/**
 * A Discord request that would have to wait longer than this for a rate limit fails with an error
 * instead of waiting. Without it a long limit, such as the daily cap on command creations, makes the
 * bot sit silently for hours.
 */
const MAX_RATE_LIMIT_WAIT_MS = 60_000;

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
  allowedMentions: { parse: ["users"], repliedUser: true },
  rest: {
    rejectOnRateLimit: (rateLimit) => rateLimit.retryAfter > MAX_RATE_LIMIT_WAIT_MS,
  },
});

client.rest.on("rateLimited", (rateLimit) => {
  console.warn(`Rate limited on ${rateLimit.method} ${rateLimit.route}: retry in ${Math.ceil(rateLimit.retryAfter / 1000)}s (limit ${rateLimit.limit}).`);
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
