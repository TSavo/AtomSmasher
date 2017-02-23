"use strict";
const _ = require("underscore");
const fs = require("fs.promised");
const mp = require("mongodb");
const DBFile = require("./DBFile");

async function test(){
    const dbCredentials = JSON.parse(await fs.readFile(".credentials.json", {encoding: "UTF-8"}));
    const db = await mp.MongoClient.connect(dbCredentials.mongodb);
    return new DBFile(db, _(await db.collection("ad_template_assets").find({}).toArray()).chain().shuffle().first().value().filename).toTempFile();
}

test().then(console.log);