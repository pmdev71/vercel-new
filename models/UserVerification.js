const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserVerificationSchema = new Schema({
  userId: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  uniqueString: {
    type: String,
  },

  createAt: {
    type: Date,
  },
  expiresAt: {
    type: Date,
  },
});

const UserVerification = mongoose.model(
  'UserVerification',
  UserVerificationSchema
);

module.exports = UserVerification;
