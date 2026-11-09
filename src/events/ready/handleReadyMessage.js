module.exports = (client) => {
  console.log(`✔️  ${client.user.username} is succesfully up and running on ${require('os').hostname()} (pid ${process.pid})!`);
};
