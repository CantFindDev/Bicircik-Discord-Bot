const { ActivityType } = require("discord.js");

module.exports = (client) => {
  client.user.setActivity({
    name: "BUG Zone için çalışıyor!",
    type: ActivityType.Custom,
  });
};
