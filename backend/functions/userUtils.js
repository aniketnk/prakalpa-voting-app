const CryptoJS = require("crypto-js");
const atob = require('atob');
const btoa = require('btoa');
const jwt = require('jsonwebtoken');
var config = require('./config');

const redirectBaseUrl = config.redirectBaseUrl;
const appId = config.appId;
const secretkey = config.secretkey;

const queryStringToJSON = (queryString) => {
    if (queryString.indexOf('?') > -1) {
        queryString = queryString.split('?')[1];
    }
    var pairs = queryString.split('&');
    var result = {};
    pairs.forEach((pair) => {
        pair = pair.split('=');
        result[pair[0]] = decodeURIComponent(pair[1] || '');
    });
    return result;
}

const generateSig = (payload) => {
    let hash = CryptoJS.HmacSHA256(payload, secretkey);
    hash = String(hash);
    return hash;
}

const b64EncodeUnicode = (str) => {
    // first we use encodeURIComponent to get percent-encoded UTF-8,
    // then we convert the percent encodings into raw bytes which
    // can be fed into btoa.\
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        (match, p1) => {
            return String.fromCharCode('0x' + p1);
        }));
}

const generateToken = (payload) => {
    let token = jwt.sign(payload, secretkey, { expiresIn: "2d" });
    return token;
}

const jwtVerify = (token) => {
    return jwt.verify(token, secretkey, (err, decoded) => {
        if (decoded)
            return decoded;
        if (err)
            return false;
    });
}

const generateSSO = (nonce, returnUrl) => {
    let payload = nonce + "&returnUrl=" + returnUrl;
    let encodedPayload = b64EncodeUnicode(payload);
    // console.log("sso:" + encodedPayload);
    return encodedPayload;
}

const shuffle = (arr) => {
    var ctr = arr.length, temp, index;

    // While there are elements in the array
    while (ctr > 0) {
        // Pick a random index
        index = Math.floor(Math.random() * ctr);
        // Decrease ctr by 1
        ctr--;
        // And swap the last element with it
        temp = arr[ctr];
        arr[ctr] = arr[index];
        arr[index] = temp;
    }
    return arr;
}

const b64DecodeUnicode = (str) => {
    // Going backwards: from bytestream, to percent-encoding, to original string.
    return decodeURIComponent(atob(str).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

const verifySignature = (sso, sig) => {
    // console.log("SIG:" + sig);
    if (generateSig(sso) === sig) {
        let decodedSSO = queryStringToJSON("nonce=" + b64DecodeUnicode(sso));
        return decodedSSO;
    }
    return false;
}

const getRedirectUrl = (nonce, returnUrl) => {
    let sso = generateSSO(nonce, returnUrl);
    let sig = generateSig(sso);
    let redirectUrl = redirectBaseUrl + "?sso=" + sso + "&sig=" + sig + "&appId=" + appId;
    return redirectUrl;
}

module.exports = { shuffle, queryStringToJSON, generateSig, verifySignature, generateToken, jwtVerify, getRedirectUrl, b64DecodeUnicode, b64EncodeUnicode };