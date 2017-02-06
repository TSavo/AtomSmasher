const mp = require("mongodb");
const InstagramClient = require("./InstagramClient");
const FacebookClient = require("./FacebookClient");
const TwitterClient = require("./TwitterClient");
const PinterestClient = require("./PinterestClient");
const fs = require('fs');
const ExternalPost = require("./ExternalPost");
const IMAPClient = require("./IMAPClient");

const credentials = JSON.parse(fs.readFileSync(".credentials.json", {encoding: "UTF-8"}));

async function getTweets() {
    const db = await mp.MongoClient.connect(credentials.mongodb);
    const twitter = await db.collection("credentials").findOne({twitter: {$exists: true}}).then((credential) => {
        return global.classes[credential.className].create(db, credential);
    });
    twitter.likes().then(async (likes)=>{
        "use strict";
        console.log(likes);
        await twitter.unlike(likes[0]).then(log);
    });
}
getTweets();

function log(message){
    "use strict";
    console.log(JSON.stringify(message, null, "  "));
}
