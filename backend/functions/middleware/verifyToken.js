// var dPayload = Utils.b64DecodeUnicode("eyJub25jZSI6IjIwYjcxODkwLTI5N2EtMTFlOS04ZjAyLWU1ZWFhZGE4ZTlkOCIsInVzZXJuYW1lIjoiUEVTMTIwMTcwMTEwMyIsImVtYWlsIjoiZ2F1cmFuZ3Blc3VAZ21haWwuY29tIiwiZXh0ZXJuYWxfaWQiOiIzMmEyNTY4ZC03YzQ4LTRhNDktYjZlZi1iMjUxZTRmN2EyMjQiLCJuYW1lIjoiR2F1cmFuZyJ9");
// console.log(dPayload + "aa");
// var ss = Utils.generateSig(dPayload);
// console.log(ss);
const Utils = require('./../userUtils');

const firebase = require('firebase-admin');
const db = firebase.firestore();

var verifyToken = (req, res, next) => {
    var token = (req.body && req.body.token) || (req.query && req.query.token) || (req.headers && req.headers['x-access-token']) || null;
    if (!token) {
        return res.status(403).send({
            success: false,
            message: 'No token provided',
            token: token
        });
    }
    token = token.trim();
    var decodedToken = Utils.jwtVerify(token);

    return db.collection('sessions').doc(token).get()
        .then(doc => {
            if (!doc.exists || !decodedToken) {
                return res.status(403).send({
                    success: false,
                    message: 'Forbidden',
                });
            } else {
                // console.log(decodedToken);
                req.usn = decodedToken.username;
                req.role = doc.data().role || "user";
                return next();
            }
        })
        .catch(err => {
            console.log('Error getting document', err);
            return res.status(403).send({
                success: false,
                message: 'Forbidden',
            });
        });
}

var requireRole = (role) => {
    return (req, res, next) => {
        return verifyToken(req, res, () => {
            if (req.role !== role) {
                return res.status(403).send({
                    success: false,
                    message: "Error: Forbidden request."
                });
            }
            return next();
        });
    }
}

module.exports = { verifyToken, requireRole };
