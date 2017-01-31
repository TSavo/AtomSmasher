require("babel-core/register");
require("babel-polyfill");
var fs = require("fs");
const mp = require("mongodb");
const Shopify = require("./ShopifyClient");

var credentials = JSON.parse(fs.readFileSync(".credentials.json", {encoding: "UTF-8"}));
mp.MongoClient.connect(credentials.mongodb).then((db) => {
    return Shopify.create(db).then(
        function (shop) {
            return shop.getFreshProduct().then(shop.addRecentlyPosted.bind(shop)).then(() => {
                db.close();
            });
        }
    );
}).catch(console.log);