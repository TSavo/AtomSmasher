const _ = require("underscore");
const fs = require("fs");
const mp = require("mongodb");
const InstagramClient = require("./InstagramClient");
const credentials = JSON.parse(fs.readFileSync(".credentials.json", {encoding: "UTF-8"}));
const ExternalPost = require("./ExternalPost");


mp.MongoClient.connect(credentials.mongodb).then((db) => {
    return new Promise((resolve, reject) => {
        resolve(db.collection("credentials").findOne({instagram: {$exists: true}}));
    }).then((credentials) => {
        return [db, credentials];
    });
}).then((args) => {
    console.log(args);
    var db = args[0];
    var credential = args[1];
    return global.classes[credential.className].create(db, credential).then((client) => {
        return client.notFollowedBack().then(console.log);
    });
}).catch(console.log);
