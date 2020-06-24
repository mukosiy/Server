const express = require("express");
const app = express();
const cors = require("cors");

const mongoose = require("mongoose");
require("dotenv").config();
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.connection.once("open", () => {
  console.log("FINALLY");
});
const User = require(__dirname + "/userModel.js");
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});
app.post("/api/exercise/new-user", (req, res, next) => {
  const username = req.body.username;
  if (username) {
    const newUser = { username: username, count: 0, log: [] };
    User.findOne({ username: newUser.username }, (error, data) => {
      if (error) return next(error);
      if (data) {
        res.send("That username is already taken.");
      } else {
        User.create(newUser, (error, user) => {
          if (error) return next(error);
          res.json({ username: user.username, id: user._id });
        });
      }
    });
  } else {
    res.send("You need to provide a username.");
  }
});
app.post("/api/exercise/add", (req, res, next) => {
  const userId = req.body.userId;
  const description = req.body.description;
  const duration = req.body.duration;
  const requiredFieldsCompleted = userId && description && duration;
  if (requiredFieldsCompleted) {
    User.findById(userId, (error, user) => {
      if (error) return next(error);
      if (user) {
        const date = req.body.date ? new Date(req.body.date) : new Date();
        user.count = user.count + 1;
        const newExercise = {
          description: description,
          duration: duration,
          date: date
        };
        user.log.push(newExercise);
        user.save((error, user) => {
          if (error) return next(error);
          const dataToShow = {
            username: user.username,
            _id: user._id,
            description: description,
            duration: duration,
            date: date.toDateString()
          };
          res.json(dataToShow);
        });
      } else {
        next();
      }
    });
  } else {
    let message = "Please complete all the required fields.";
    res.send(message);
  }
});
app.get("/api/exercise/log:userId", (req, res, next) => {
  let userId = req.query.userId;
  let from = new Date(req.query.from);
  let to = new Date(req.query.to);
  let limit = req.query.limit;
  User.findById(userId).then(user => {
    if (from && to) {
      let resultArray = user.log.filter(element => {
        return element.date >= from && element.date <= to;
      });
      res.json({ exercises: resultArray });
    }
  });
});
app.post("/api/exercise/login", (req, res, next) => {
  let inputUsername = req.body.username;
  User.findOne({ username: inputUsername }, (error, data) => {
    if (error) return next(error);
    if (data) {
      res.send(data);
    }
  });
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
