const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const cors = require('cors')

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

//Testing conecction
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("DB conected!");
});

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

/*
// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})
*/

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

///////////////////////////////////////////

const userSchema = new mongoose.Schema({
  username: String,
  exercises: Array
});

const UserModel = mongoose.model("UserModel",userSchema);

app.post("/api/exercise/new-user",(req,res) => {
  let username = req.body.username;
  const um = new UserModel({
    username: username
  });
  
  um.save((err,data) => {
    if(err) console.error(err);
    res.json({
      username: username,
      _id: data.id
    });
  }); 
});

app.get("/api/exercise/users",(req,res) => {
  UserModel.find({},(err,data) => { //{} == no filters, match all
    if(err) console.error(err);
    res.json(data);
  });
});

app.post("/api/exercise/add",(req,res) => {
  let userId = (req.body.userId != '') ? req.body.userId : res.send("User Id is required!");
  let desc = (req.body.description != '') ? req.body.description : res.send("Description is required!");
  let duration = (req.body.duration != '') ? parseInt(req.body.duration,10) : res.send("Duration is required!");
  let date = (req.body.date != '') ? new Date(req.body.date).toDateString() : new Date().toDateString();
  
  UserModel.findById(userId,(err,user) => {
    if(err) res.json({error: "User not found"})
      const em = {
        description: desc,
        duration: duration,
        date: date
      };
    
      user.exercises.push(em)
    
      user.save((err,data) => {
        if(err) console.error(err);  
        res.json({
          username: user.username,
          _id: user._id,
          description: desc,
          duration: duration,
          date: date
        });
      });  
  });
});

app.get("/api/exercise/log?",(req,res) => {
  let qId = req.query.userId === '' ? res.send("userId is required") : req.query.userId;
  let qFrom = req.query.from === '' ? undefined : req.query.from;
  let qTo = req.query.to === '' ? undefined : req.query.to;
  let qLimit = req.query.limit === '' ? undefined : parseInt(req.query.limit,10);
  let dateReg = /^[\d]{4}-{1}([0]?[1-9]{1}|[1]{1}[0-2]{1})-{1}([0]?[1-9]{1}|[1]{1}[\d]{1}|[2]{1}[\d]{1}|[3]{1}[0-1]{1})$/i;
  let opts = (qFrom || qTo || qLimit);
  UserModel.findById(qId,(err,user) => {
    if(err) console.log(err);
    let result={"_id":qId,userName:user.username,log:user.exercises,count: user.exercises.length};
    if(opts) {
      let nLog = [];
      if(qFrom && qTo && qLimit) {
        user.exercises.forEach(n => {
          if((new Date(n.date).getTime >= new Date(qFrom).getTime()) && (new Date(n.date).getTime <= new Date(qTo).getTime())) {
            nLog.push(n);
          }
        });
        nLog = nLog.slice(0,qLimit);
      } else if (qFrom && qTo) {
        user.exercises.forEach(n => {
          if((new Date(n.date).getTime >= new Date(qFrom).getTime()) && (new Date(n.date).getTime <= new Date(qTo).getTime())) {
            nLog.push(n);
          }
        });
      } else if (qFrom && qLimit) {
        user.exercises.forEach(n => {
          if(new Date(n.date).getTime >= new Date(qFrom).getTime()) {
            nLog.push(n);
          }
        });
        nLog = nLog.slice(0,qLimit);
      } else if (qFrom) {
        user.exercises.forEach(n => {
          if(new Date(n.date).getTime >= new Date(qFrom).getTime()) {
            nLog.push(n);
          }
        });
      } else if (qLimit && qTo) {
        user.exercises.forEach(n => {
          if(new Date(n.date).getTime <= new Date(qTo).getTime()) {
            nLog.push(n);
          }
        });
        nLog = nLog.slice(0,qLimit);
      } else if (qLimit) {
        nLog = user.exercises.slice(0,qLimit);
      } else if (qTo) {
        user.exercises.forEach(n => {
          if(new Date(n.date).getTime <= new Date(qTo).getTime()) {
            nLog.push(n);
          }
        });
      }
      
      if(nLog.length > 0) result = {"_id":user._id,userName:user.username,log:nLog,count: nLog.length};
    } 
    res.json(result)
  });
});

/*
1)qFrom,!qTo,!qLimit
2)qFrom,qTo,!qLimit
3)qFrom,!qTo,qLimit
4)qFrom,qTo,qLimit
5)!qFrom,!qTo,qLimit
6)!qFrom,qTo,qLimit
7)!qFrom,qTo,!qLimit
*/