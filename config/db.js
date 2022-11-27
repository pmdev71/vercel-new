require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI =
  'mongodb+srv://login_server_user:oJojLUZ2oUtMKBQ9@loginservercluster.sdvbifp.mongodb.net/?retryWrites=true&w=majority';

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((db) => console.log('DB is connected'))
  .catch((err) => console.error(err));
