const { ActivityType } = require("discord.js");

module.exports = (client) => {
  client.user.setActivity({
    name: "BUG Zone members",
    type: ActivityType.Watching,
  });
};
