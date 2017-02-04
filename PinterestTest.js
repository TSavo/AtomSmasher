require("babel-core/register");
require("babel-polyfill");
var fs = require("fs");
const mp = require("mongodb");
const Pinterest = require("./PinterestClient");

var credentials = JSON.parse(fs.readFileSync(".credentials.json", {encoding: "UTF-8"}));
mp.MongoClient.connect(credentials.mongodb).then((db) => {
    //db.collection("credentials").insertOne({pinterest:credentials.pinterest});
    return Pinterest.create(db).then(
        function (pin) {
            console.log(pin);
                db.close();
        }
    );
}).catch(console.log);