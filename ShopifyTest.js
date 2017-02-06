
var fs = require("fs");
const mp = require("mongodb");
const Shopify = require("./ShopifyClient");
const ProductPost = require("./ProductPost");
const _ = require("underscore");

var credentials = JSON.parse(fs.readFileSync(".credentials.json", {encoding: "UTF-8"}));
mp.MongoClient.connect(credentials.mongodb).then((db) => {
    return Shopify.create(db).then(
        async (shop) => {
            const product = await shop.getFreshProduct();
            const post = await ProductPost.fromProduct(db, product);
            post.applyTemplate("assets/" + _(fs.readdirSync("assets")).chain().shuffle().first());
            console.log(await post.image.image);
            db.close();

        }
    );
}).catch(console.log);