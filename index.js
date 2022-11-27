//mongodb
require('./config/db.js');

// Import packages
const express = require('express');
const UserRouter = require('./api/User.js');

// Middlewares
const app = express();
app.use(express.json());

// Routes
app.use('/user', UserRouter);

// connection
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening to port ${port}`));
