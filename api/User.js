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

//path for static verification page
const path = require('path');

const AUTH_EMAIL = 'pmdev71@gmail.com';
const AUTH_PASS = 'ffdepgcgsuothxah';

// nodemailer stuff
let transporter = nodeMailer.createTransport({
  service: 'gmail',
  auth: {
    user: AUTH_EMAIL,
    pass: AUTH_PASS,
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
  dateOfBirth = dateOfBirth?.trim();

  if (!name || !email || !password) {
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
  }
  // else if (!new Date(dateOfBirth).getTime()) {
  //   return res
  //     .status(400)
  //     .json({ status: 'Failed', msg: 'Invalid date of birth!' });
  // }
  else {
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
      userEmail: email,
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
              status: 'Pending',
              msg: 'Verification email sent!, wait for verify your account!',
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
router.get('/verify/:userId/:uniqueString', (req, res) => {
  const { userId, uniqueString } = req.params;
  UserVerification.find({ userId })
    .then((result) => {
      if (result.length > 0) {
        //user verification data found so proceed
        const { expiresAt } = result[0];
        const hashedUniqueString = result[0].uniqueString;

        //check if verification link is expired
        if (expiresAt < Date.now()) {
          //record has expired so delete it
          UserVerification.deleteOne({ userId })
            .then((result) => {
              User.deleteOne({ _id: userId })
                .then(() => {
                  let message = 'Link has expaire , Please signup again!';
                  res.redirect(`user/verified/error=true&message=${message}`);
                })
                .catch((err) => {
                  console.log(err);
                  let message = 'Clearing user with expaire unique string!';
                  res.redirect(`user/verified/error=true&message=${message}`);
                });
            })

            .catch((error) => {
              console.log(error);
              let message =
                'An error occer while deleting expired verification record!';
              res.redirect(`user/verified/error=true&message=${message}`);
            });
        } else {
          //valid recore exists so we validate the unique string
          //first compare the hashed unique string

          bcrypt
            .compare(uniqueString, hashedUniqueString)
            .then((result) => {
              if (result) {
                //string matched
                User.updateOne({ _id: userId }, { verified: true })
                  .then(() => {
                    UserVerification.deleteOne({ userId })
                      .then(() => {
                        res.sendFile(
                          path.join(__dirname, './../views/verified.html')
                        );
                      })
                      .catch((error) => {
                        console.log(error);
                        let message =
                          'An error occer while finalized success verified!';
                        res.redirect(
                          `user/verified/error=true&message=${message}`
                        );
                      });
                  })
                  .catch((error) => {
                    console.log(error);
                    let message =
                      'An error occer while updating user record to show verified!';
                    res.redirect(`user/verified/error=true&message=${message}`);
                  });
              } else {
                //existing record but incorrect varification details passed
                let message =
                  'Invalid verification details passed. Please, check inbox!';
                res.redirect(`user/verified/error=true&message=${message}`);
              }
            })
            .catch((err) => {
              let message =
                'An error occer while compareing hashed unique string!';
              res.redirect(`user/verified/error=true&message=${message}`);
            });
        }
      } else {
        //user verification data not found
        let message =
          'Account record does not exist or user already verified! Please signup or login!';
        res.redirect(`user/verified/error=true&message=${message}`);
      }
    })

    .catch((err) => {
      console.log(err);
      let message = 'An error occer while checking for verification data!';
      res.redirect(`user/verified/error=true&message=${message}`);
    });
});

//Verified page rhouter
router.get('/verified', (req, res) => {
  res.sendFile(path.join(__dirname, './../views/verified.html'));
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
      .then((data) => {
        if (data.length) {
          //email exists

          if (!data[0].verified) {
            res.json({
              status: 'Pending',
              msg: 'Email hasnot been verified yeat. Please, check your mail inbox!',
            });
          } else {
            //check password
            bcrypt
              .compare(password, data[0].password)
              .then((isMatch) => {
                if (isMatch) {
                  //password matched
                  return res.status(200).json({
                    status: 'Success',
                    msg: 'User signin successful!',
                    data: data[0],
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
          }
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
