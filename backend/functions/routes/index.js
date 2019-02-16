const fsUtils = require('./../fireStoreUtils');
const firebase = require('firebase-admin');
const uuid = require('uuid/v1');
const db = firebase.firestore();
const Utils = require('./../userUtils');
var verifyToken = require('./../middleware/verifyToken').verifyToken;
var requireRole = require('./../middleware/verifyToken').requireRole;

var cors = require('cors');
var bodyParser = require('body-parser');


// Routes
module.exports = (app) => {

    app.use(cors());
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(bodyParser.json());

    app.get('/helloWorld', verifyToken, (req, res) => {
        return res.send("Hello " + req.usn + " from Firebase!");
    });

    app.get('/ssoRedirectUrl', (req, res) => {
        let returnUrl = req.query.returnUrl;
        let nonce = uuid();
        var data = {
            nonce,
            timestamp: (new Date).getTime(),
            count: 0
        };

        db.collection('nonce').doc(nonce).set(data);
        let redirectUrl = Utils.getRedirectUrl(nonce, returnUrl);
        return res.send(redirectUrl);
    });

    app.post('/signin', (req, res) => {
        try {
            req.body = JSON.parse(req.body);
        }
        catch (e) {
            // console.log(e);      
        }
        var sso = req.body["sso"];
        var sig = req.body.sig;
        let decodedSSO = Utils.verifySignature(sso, sig);

        if (!decodedSSO)
            return res.status(403).json({
                success: false,
                message: "Signature does not match",
            });

        let nonce = decodedSSO.nonce;
        // Check if nonce in decodedSSO exists in database
        return db.collection('nonce').doc(nonce).get()
            .then(doc => {
                let tenMinutes = 10 * 60 * 1000;
                if (!doc.exists || ((new Date).getTime() - doc.data().timestamp > tenMinutes) || (doc.data().count > 0)) {
                    // TODO: Increase nonce count
                    throw Object.assign({}, {
                        message: "Nonce is invalid",
                        name: 'Forbidden',
                    });
                }
                else {
                    return doc.id;
                }
            })
            .then((docId) => {
                // Increase nonce count
                return;
            })
            .then(() => {
                let token = Utils.generateToken(decodedSSO);
                var data = {
                    token,
                    timestamp: (new Date).getTime()
                };
                // console.log("New Token: ", token);

                db.collection('sessions').doc(String(token)).set(data, { merge: false });
                return token;
            })
            .then((token) => {
                return res.status(200).json({
                    success: true,
                    message: "User signed in.",
                    token
                });
            })
            .catch((error) => {
                // console.log(error);
                if (error.name === "Forbidden") {
                    return res.status(403).json({
                        success: false,
                        message: error.message
                    });
                }
                return res.status(500).json({
                    success: false,
                    message: 'Session not created',
                    error: error
                });
            });
    });

    app.get('/myRating', verifyToken, (req, res) => {
        let usn = req.usn;
        return db.collection('rating').doc(usn).get()
            .then(doc => {
                if (!doc.exists) {
                    // console.log('No such document!');
                    return res.status(200).send("{}");
                } else {
                    console.log('Document data:', doc.data());
                    return res.status(200).send(JSON.stringify(doc.data().teamsVoted));
                }
            })
            .catch((error) => {
                // console.log(error);
                return res.status(500).json({
                    success: false,
                    message: 'Error getting document',
                    error: error
                });
            });
    })

    app.get('/stats', requireRole("admin"), (req, res) => {
        teams = {};
        ratings = [];
        db.collection('teams').where('isVerified', '==', true).get()
            .then(snapshot => {
                if (snapshot.empty) {
                    // console.log('No matching documents.');
                    return teams;
                }
                snapshot.forEach(doc => {
                    // console.log(doc.id, '=>', doc.data());
                    // teams.push(Object.assign({ id: doc.id }, doc.data()));
                    teams[doc.id] = doc.data();
                });
                // console.log(teams);
                return teams;
            })
            .then((teams) => {
                let ratings = [];
                return db.collection('rating').get()
                    .then(snapshot => {
                        if (snapshot.empty) {
                            // console.log('No matching documents.');
                            return { teams, ratings };
                        }
                        snapshot.forEach(doc => {
                            // console.log(doc.id, '=>', doc.data());
                            ratings.push(Object.assign({ id: doc.id }, doc.data()));
                        });
                        // console.log(ratings)
                        return { teams, ratings };
                    })
            })
            .then(obj => {
                let teams = obj.teams;
                let ratings = obj.ratings;

                for (let rating of ratings) {
                    for (let team in rating.teamsVoted) {
                        if (rating.teamsVoted[team] === true) {
                            if (!teams[team]) {
                                // Team deleted from database
                                continue;
                            }
                            if (!teams[team].votes)
                                teams[team].votes = [];
                            teams[team].votes.push(rating.usn);
                            // console.log(rating.usn + ": " + team);
                        }
                    }
                }

                let returnObj = {};
                for (team in teams) {
                    returnObj[teams[team].name] = teams[team].votes || [];
                }

                return res.status(200).json(returnObj);
            })
            .catch(error => {
                // console.log('Error getting documents', error);
                return res.status(500).json({
                    success: false,
                    error: error.message
                });
            });
    });

    app.post('/newTeam', (req, res) => {
        try {
            req.body = JSON.parse(req.body);
        }
        catch (e) {
            // console.log(e);      
        }
        // console.log(req.body);
        var data = Object.assign({ isVerified: false }, {
            name: req.body.name || "Unknown",
            description: req.body.description || "(No description provided.)",
            photoUrl: req.body.photoUrl || "",
            createdAt: (new Date).getTime()
        });
        var teamName = data.name;
        return db.collection('teams').add(data)
            .then(() => {
                // console.log("success");
                return res.status(200).json({
                    success: true,
                    message: "Team created.",
                });
            })
            .catch((error) => {
                // console.log(error);
                return res.status(500).json({
                    success: false,
                    message: 'Entry not created',
                    error: error
                });
            });
    });

    app.post('/addUsn', (req, res) => {
        try {
            req.body = JSON.parse(req.body);
        }
        catch (e) {
            // console.log(e);      
        }
        // console.log(req.body);
        var data = Object.assign({}, {
            usn: req.body.usn,
            pid: req.body.pid,
        });

        let encodedData = Utils.b64EncodeUnicode(JSON.stringify(data));
        data["lastModifiedAt"] = (new Date).getTime();
        // console.log(data);
        return db.collection('attendance').doc(encodedData).set(data)
            .then(() => {
                // console.log("success");
                return res.status(200).json({
                    success: true,
                    message: "USN added.",
                });
            })
            .catch((error) => {
                // console.log(error);
                return res.status(500).json({
                    success: false,
                    message: 'USN not added',
                    error: error
                });
            });

    });
    app.post('/registerId', (req, res) => {
        try {
            req.body = JSON.parse(req.body);
        }
        catch (e) {
            // console.log(e);      
        }
        // console.log(req.body);
        var data = Object.assign({ isVerified: true }, {
            pid: req.body.pid,
            createdAt: (new Date).getTime()
        });
        var usn = data.usn;
        return db.collection('registerId').add(data)
            .then(() => {
                // console.log("success");
                return res.status(200).json({
                    success: true,
                    message: "ID added.",
                });
            })
            .catch((error) => {
                // console.log(error);
                return res.status(500).json({
                    success: false,
                    message: 'ID not added',
                    error: error
                });
            });

    });


    app.get("/teams", (req, res) => {
        return db.collection('teams').where('isVerified', '==', true).get()
            .then(snapshot => {
                if (snapshot.empty) {
                    // console.log('No matching documents.');
                    return res.status(404).json({
                        success: true,
                        message: "No teams found",
                    });
                }
                teams = [];
                snapshot.forEach(doc => {
                    // console.log(doc.id, '=>', doc.data());
                    teams.push(Object.assign({ id: doc.id }, doc.data()));
                });
                return res.status(200).json(teams);
            })
            .catch(error => {
                // console.log('Error getting documents', error);
                return res.status(500).json({
                    success: false,
                    error: error.message
                });
            });
    });


    app.post('/rating', verifyToken, (req, res) => {
        // Not finalized yet.
        try {
            req.body = JSON.parse(req.body);
        }
        catch (e) {
            // console.log(e);      
        }
        // console.log("Data:" + req.body)
        var data = Object.assign({ usn: req.usn }, { teamsVoted: JSON.parse(req.body) });
        var usn = req.usn;
        data.timestamp = (new Date).getTime();
        db.collection('rating').doc(String(usn)).set(data, { merge: false })
            .then(() => {
                // console.log("success");
                return res.status(200).json({
                    success: true,
                    message: "Ratings recorded",
                });
            })
            .catch((error) => {
                // console.log(error);
                return res.status(500).json({
                    success: false,
                    message: 'Entry not created',
                    error: error
                });
            });
    });
}
