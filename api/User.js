const express = require('express');
const router = express.Router();
//mongoose user model
const User = require('../models/User.js');

//mongoose UserVerification model
const UserVerification = require('../models/UserVerification.js');

//email handler
const nodeMailer = require('nodemailer');

//unique string generator
const { v4: uuidv4 } = require('uuid');

//env variables
require('dotenv').config();

//password hashing
const bcrypt = require('bcrypt');

// nodemailer stuff
let transporter = nodeMailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASS,
  },
});

//testing success
transporter.verify((error, success) => {
  if (error) {
    console.log(error);
  } else {
    console.log('Server is ready to take our messages');
    console.log(success);
  }
});

//Welcome
router.get('/', async (req, res, next) => {
  return res.status(200).json({
    title: 'Express Testing',
    message: 'The app is working properly!',
  });
});

//health check
router.get('/health', async (req, res, next) => {
  return res.status(200).json({
    title: 'HEASLTH CHECK',
    message: 'The app is working properly!',
  });
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
                verified: false,
              });
              newUser
                .save()
                .then((result) => {
                  //handle account verification
                  sendVerificationEmail(result, res);
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

//send verification email
const sendVerificationEmail = ({ _id, email }, res) => {
  //url to be used in email
  const currentUrl = 'http://localhost:9002/';
  //generate unique string
  const uniqueString = uuidv4() + _id;
  //mail options
  const mailOptions = {
    from: process.env.AUTH_EMAIL,
    to: email,
    subject: 'Account Verification',
    html: `Verify your account by clicking <a href="${
      currentUrl + 'user/verify/' + _id + '/' + uniqueString
    }">here</a>`,
  };

  //hash unique string
  const saltRounds = 10;
  bcrypt.hash(uniqueString, saltRounds).then((hashUniqueString) => {
    //set values in UserVerification collection
    const newVerification = new UserVerification({
      userId: _id,
      uniqueString: hashUniqueString,
      createAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    });

    newVerification
      .save()
      .then((result) => {
        transporter
          .sendMail(mailOptions)
          .then((result) => {
            //email sent and verification data saved
            return res.status(200).json({
              status: 'Success',
              msg: 'Verification email sent!',
            });
          })
          .catch((err) => {
            return res.status(500).json({
              status: 'Failed',
              msg: 'Verification email sent failed!',
            });
          });
      })
      .catch((err) => {
        console.log(err);
        res.json({
          status: 'Failed',
          msg: 'Could not save verification email data !',
        });
      })

      .catch((err) => {
        res.json({
          status: 'Failed',
          msg: 'Error while hashing unique string!',
        });
      });
  });
};

//verify Email

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
