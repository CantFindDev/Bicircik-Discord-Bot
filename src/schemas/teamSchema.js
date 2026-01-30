const { Schema, model } = require('mongoose');

const teamSchema = new Schema({
    guildID: { type: String, required: true },
    teamOwnerID: { type: String, required: true },
    teamName: { type: String, required: true },
    teamRoleID: { type: String },
    teamCategoryID: { type: String },
    teamMembers: [
        { type: String }
    ],
    createdAt: { type: Date, default: Date.now }
});

teamSchema.index({ guildID: 1, teamOwnerID: 1 });

module.exports = model('Team', teamSchema);