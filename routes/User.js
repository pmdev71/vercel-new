const express = require('express');
const router = express.Router();
//mongoose user model
const User = require('../models/User.js');

//password hashing
const bcrypt = require('bcrypt');

//Welcome
router.get('/', async (req, res, next) => {
  return res.status(200).json({
    title: 'Express Testing',
    message: 'The app is working properly!',
  });
});

//health check
router.get('/health', (req, res) => {
  res.send('User API is healthy');
});

//Signup
router.post('/signup', (req, res) => {
  let { name, email, password, dateOfBirth } = req.body;
  name = name.trim();
  email = email.trim();
  password = password.trim();
  dateOfBirth = dateOfBirth.trim();

  if (!name || !email || !password || !dateOfBirth) {
    return res
      .status(400)
      .json({ status: 'Failed', msg: 'Empty input fields!' });
  } else if (password.length < 6) {
    return res.status(400).json({
      status: 'Failed',
      msg: 'Password must be at least 6 characters!',
    });
  } else if (!/^[a-zA-Z ]*$/.test(name)) {
    return res
      .status(400)
      .json({ status: 'Failed', msg: 'Name must contain only letters!' });
  } else if (!/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(email)) {
    return res
      .status(400)
      .json({ status: 'Failed', msg: 'Invalid email address!' });
  } else if (!new Date(dateOfBirth).getTime()) {
    return res
      .status(400)
      .json({ status: 'Failed', msg: 'Invalid date of birth!' });
  } else {
    //check if email already exists
    User.find({ email })
      .then((result) => {
        if (result.length > 0) {
          //An user already exists with this email
          return res.status(400).json({
            status: 'Failed',
            msg: 'User already exists with this email!',
          });
        } else {
          //password hashing
          const saltRounds = 10;
          bcrypt
            .hash(password, saltRounds)
            .then((hashPassword) => {
              //create new user
              const newUser = new User({
                name,
                email,
                password: hashPassword,
                dateOfBirth,
              });
              newUser
                .save()
                .then((result) => {
                  return res.status(200).json({
                    status: 'Success',
                    msg: 'Signup successful!',
                    data: result,
                  });
                })
                .catch((err) => {
                  return res.status(500).json({
                    status: 'Failed',
                    msg: 'Internal server error when create new user!',
                  });
                });
            })
            .catch((err) => {
              res.json({
                status: 'Failed',
                msg: 'Error while hashing password!',
              });
            });
        }
      })
      .catch((err) => {
        console.log(err);
        res.json({
          status: 'Failed',
          msg: 'An error occer while checking for existing user!',
        });
      });
  }
});

//Signin
router.post('/signin', (req, res) => {
  let { email, password } = req.body;
  email = email.trim();
  password = password.trim();

  if (!email || !password) {
    return res
      .status(400)
      .json({ status: 'Failed', msg: 'Empty input fields!' });
  } else {
    //check if email exists
    User.find({ email })
      .then((result) => {
        if (result.length > 0) {
          //email exists
          //check password
          bcrypt
            .compare(password, result[0].password)
            .then((isMatch) => {
              if (isMatch) {
                //password matched
                return res.status(200).json({
                  status: 'Success',
                  msg: 'User signin successful!',
                  data: result[0],
                });
              } else {
                //password not matched
                return res
                  .status(400)
                  .json({ status: 'Failed', msg: 'Invalid password!' });
              }
            })
            .catch((err) => {
              return res.status(500).json({
                status: 'Failed',
                msg: 'Internal server error while comparing password!',
              });
            });
        } else {
          //email not exists
          return res
            .status(400)
            .json({ status: 'Failed', msg: 'Email not registered!' });
        }
      })
      .catch((err) => {
        return res.status(500).json({
          status: 'Failed',
          msg: 'Internal server error while checking for existing user!',
        });
      });
  }
});

//Signout
router.get('/signout', (req, res) => {
  res.send('Signout');
});

module.exports = router;
