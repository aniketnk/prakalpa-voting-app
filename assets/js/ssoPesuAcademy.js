export function generateNonce() {
    var dt = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (dt + Math.random() * 16) % 16 | 0;
        dt = Math.floor(dt / 16);
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    uuid = uuid.replace(/-/g, "");
    console.log("uuid:", uuid);
    sessionStorage.setItem("nonce", uuid);
    return uuid;
}

export function b64EncodeUnicode(str) {
    // first we use encodeURIComponent to get percent-encoded UTF-8,
    // then we convert the percent encodings into raw bytes which
    // can be fed into btoa.\
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
        }));
}

export function generateSSO(nonce, returnUrl) {
    let payload = nonce + "&returnUrl=" + returnUrl;
    let encodedPayload = b64EncodeUnicode(payload);
    console.log("sso:" + encodedPayload);
    return encodedPayload;
}

export function b64DecodeUnicode(str) {
    // Going backwards: from bytestream, to percent-encoding, to original string.
    return decodeURIComponent(atob(str).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

export function generateSig(sso) {
    let hash = CryptoJS.HmacSHA256(sso, "CCkSuYc7OulB4Cf");
    hash = hash + "";
    console.log("Hash:", hash);
    return hash;
}

export function getRedirectUrl() {
    let url = "https://pesuacademy.com/Academy/login/forum";
    let returnUrl = "http://localhost:8000/authenticate.html";
    let nonce = generateNonce();
    let sso = generateSSO(nonce, returnUrl);
    let sig = generateSig(sso);
    return url + "?sso=" + sso + "&sig=" + sig + "&appId=" + "prakalpa";
}
