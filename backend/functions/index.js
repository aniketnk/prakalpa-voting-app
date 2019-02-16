const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
var cors = require('cors');
var bodyParser = require('body-parser');

admin.initializeApp()


// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions

// Express instance
const app = express();

app.use(cors())
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

// Setting up routes
require("./routes/index")(app);

// Run express as a firebase cloud function
exports.app = functions.https.onRequest(app);