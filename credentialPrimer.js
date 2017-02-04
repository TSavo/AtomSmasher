"use strict";

const fs = require("fs");
const mp = require("mongodb");
var credentials = JSON.parse(fs.readFileSync(".credentials.json", {encoding: "UTF-8"}));
mp.MongoClient.connect(credentials.mongodb).then((db) => {
    return db.collection("credentials").insertOne(
        {
            facebook:credentials.facebook
        }
    ).then(() => {
        db.close();
    });
}).catch(console.log);
