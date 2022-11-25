const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserVerificationSchema = new Schema({
  userId: {
    type: String,
    required: true,
  },
  uniqueString: {
    type: String,
    required: true,
  },

  createAt: {
    type: Date,
    required: true,
  },
  expartAt: {
    type: Date,
    required: true,
  },
});

const UserVerification = mongoose.model(
  'UserVerification',
  UserVerificationSchema
);

module.exports = UserVerification;
