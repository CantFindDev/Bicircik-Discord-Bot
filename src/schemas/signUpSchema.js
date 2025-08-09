const { Schema, model } = require('mongoose');

const signUpSchema = new Schema({
  guildID: {
    type: String,
    required: true,
    unique: true,
  },
  kayıtChannel: {
    type: String,
    required: true,
  },
  kayıtRole: {
    type: String,
    required: true,
  },
});

module.exports = model('signupSettings', signUpSchema);
