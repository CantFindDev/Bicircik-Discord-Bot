  const { Schema, model } = require('mongoose');

  const userAnswerSchema = new Schema({
      userID: { type: String, required: true },
      name: { type: String},
      surname: { type: String},
      joinReason: {type: String}
  });

  const registrationSchema = new Schema({
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
    userAnswers: [userAnswerSchema]
  });

  module.exports = model('registrationSettings', registrationSchema);
