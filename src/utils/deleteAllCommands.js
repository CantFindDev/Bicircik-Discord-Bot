const { REST, Routes } = require('discord.js');
const { botID, testGuild } = require('../../config.json');
require("dotenv").config();

const rest = new REST().setToken(process.env.BOT_TOKEN);

	// for guild-based commands
	rest.put(Routes.applicationGuildCommands(botID, testGuild), { body: [] })
		.then(() => console.log('Successfully deleted all guild commands.'))
		.catch(console.error);

	// for global commands
	rest.put(Routes.applicationCommands(botID), { body: [] })
		.then(() => console.log('Successfully deleted all application commands.'))
		.catch(console.error);
