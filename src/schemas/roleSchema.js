// roleSchema.js
const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  guildID: String,
  channelID: String,
  messageID: String,
  roles: [
    {
      roleId: String,
      label: String,
      emoji: String,
      description: String,
    }
  ],
});

module.exports = mongoose.model('rolal', roleSchema);
