var Shopify = require('shopify-node-api');
var ProductPost = require("./ProductPost");
var _ = require("underscore");

class ShopifyClient {
    constructor(db, shopifyApi, id) {
        this.db = db;
        this.shopifyApi = shopifyApi;
        this.id = id;
    }

    static async create(db) {
        const credentials = await db.collection("credentials").findOne({shopify: {$exists: true}});
        const shopifyApi = new Shopify(credentials.shopify);
        return new ShopifyClient(db, shopifyApi, credentials._id);
    }

    async products() {
        const self = this;
        return new Promise(function (resolve, reject) {

            self.shopifyApi.get('/admin/products.json', {limit: 250}, function (err, data) {
                if (err) {
                    reject(err);
                } else {
                    resolve(data.products);
                }
            });
        });
    }

    async addRecentlyPosted(product) {
        return this.db.collection("posted_products").insertOne({productId: product.id, createdOn: new Date()});
    }

    async getFreshProduct(freshness) {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        const staleIds = _(await this.db.collection("posted_products").find({createdOn: {$gt: freshness || oneDayAgo}}).toArray()).pluck("productId");
        const product =_.chain(await this.products())
            .reject((product) => {
                return staleIds.includes(product.id);
            })
            .shuffle()
            .first()
            .value();
        const self = this;
        product.toPost = async () => {
            return ProductPost.fromProduct(self.db, product);
        };
        return product;
    }
}

if(!global.classes){
    global.classes = {};
}
global.classes.ShopifyClient = ShopifyClient;
module.exports = ShopifyClient;