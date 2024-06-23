const express = require('express')
const APP = express();

const dotenv = require('dotenv').config();
const HOST = process.env.HOST;
const PORT = process.env.PORT;

const bodyParser = require('body-parser');
APP.use(bodyParser.urlencoded({ extended: true }));

////// templates, public
const path = require('path');
APP.set('views', path.join(__dirname, 'templates'));
APP.set('view engine', 'ejs');
APP.use(express.static('public'));
////////////////////

////// Database
const mongoclient = require('mongodb').MongoClient;
const ObjId = require('mongodb').ObjectId;
const DB_URI = dotenv.parsed.DB_URI;
let mydb;

mongoclient.connect(DB_URI).then(client => {
    mydb = client.db('myboard');
    APP.listen(PORT, function () {
        console.log(`SERVER READY! http://${HOST}:${PORT}`);
    });
}).catch((err) => {
    console.log(err);
});
////////////////////

////// Session
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

let session = require('express-session');
const MongoStore = require('connect-mongo');
const sha = require('sha256');

APP.use(session({
    secret: 'dkufe8938493j4e08349u',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: DB_URI
    })
}));
APP.use(passport.initialize());
APP.use(passport.session());

passport.serializeUser(function (user, done) {
    done(null, user.userid);
});

passport.deserializeUser(function (puserid, done) {
    mydb.collection('account').findOne({ userid: puserid }).then((result) => {
        done(null, result);
    });
});

passport.use(new LocalStrategy({
    usernameField: "userid",
    passwordField: "userpw",
    session: true,
    passReqToCallback: false,
}, function (inputid, inputpw, done) {
    mydb.collection('account').findOne({ userid: inputid }).then((result) => {
        if (result == null) {
            return done(null, false, { message: "아이디가 존재하지 않습니다" });;
        }

        if (result.userpw == sha(inputpw)) {
            return done(null, result); // 새로운 로그인
        }

        return done(null, false, { message: "비밀번호 틀렸어요" });
    });
}));
////////////////////

////// Routes
APP.use('/', require('./routes/amm.js'));
APP.use('/', require('./routes/budongsan.js'));
APP.use('/', require('./routes/auth.js'));
////////////////////

////// server route
APP.get('/', function (req, res) {
    let user;
    if (req.session.passport) { user = req.session.passport; } else { user = req.user; }
    res.render('index.ejs', { user: user });
});
////////////////////