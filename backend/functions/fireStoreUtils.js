const firebase = require('firebase-admin');
const db = firebase.firestore();

var fetchAllDocs = (collection) => {
    var data = [];
    const query = new Promise((resolve, reject) => {
        db.collection(collection).get()
            .then(querySnapshot => {
                querySnapshot.forEach(doc => {
                    data.push(doc.data());
                });
                // console.log({ data });
                return resolve({ data });
            })
            .catch(err => {
                console.log(err);
                return reject(err);
            });
    })
        .catch(err => {
            console.log(err);
        });
    return query;
}

var fetchOneDoc = (collection, document) => {
    const query = new Promise((resolve, reject) => {
        db.collection(collection).doc(document).get()
            .then(doc => {
                if(!doc.exists){
                    console.log("Document does not exist");
                    throw(new Error("Document does not exist"));
                }
                else{
                    data = [];
                    data.push(doc.data());
                    // console.log(doc.data());
                    return resolve({ data });
                }
            })
            .catch(err => {
                console.log(err);
                return reject(err);
            });
    })
        .catch(err => {
            console.log(err);
        });
    return query;
}

var setDoc = (collection, document, info, isMerge) => {
    const query = new Promise((resolve, reject) => {
        var setNewDoc = db.collection(collection).doc(document).set(info, {merge: isMerge});
        return resolve(true);
    })
        .catch(err => {
            console.log(err);
        });
    return query;
}

var updateDoc = (collection, document, info) => {
    const query = new Promise((resolve, reject) => {
        var updateDoc = db.collection(collection).doc(document).update(info);
        return resolve(true);
    })
        .catch(err => {
            console.log(err);
        });
    return query;
}

var newDoc = (collection, document, info, isMerge) => {
    const query = new Promise((resolve, reject) => {
        if(document === 'auto') {
            var addDoc = db.collection(collection).add(info)
            .then(ref => {
                // console.log(ref.id);
                return resolve(ref.id);
            });
        }
        else {
            db.collection(collection).doc(document).set(info);
            // console.log(document);
            return resolve(document);
        }
        var newDoc = db.collection(collection).doc(document).set(info, {merge: isMerge});
        return resolve(true);
    })
    .catch(err => {
        console.log(err);
    });
    return query;
}

module.exports = { fetchAllDocs, fetchOneDoc, setDoc, updateDoc, newDoc };