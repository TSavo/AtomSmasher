var Shopify = require('shopify-node-api');
var _ = require("underscore");

class ShopifyClient {
    constructor(db, shopifyApi) {
        console.log(db);
        this.db = db;
        this.shopifyApi = shopifyApi;
    }

    static async create(db) {
        const credentials = await db.collection("credentials").findOne({shopify: {$exists: true}});
        const shopifyApi = new Shopify(credentials.shopify);
        return new ShopifyClient(db, shopifyApi);
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
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const staleIds = _(await this.db.collection("posted_products").find({createdOn: {$gt: freshness || oneWeekAgo}}).toArray()).pluck("productId");
        return _.chain(await this.products())
            .reject((product) => {
                return staleIds.includes(product.id);
            })
            .shuffle()
            .first()
            .value();
    }
}
module.exports = ShopifyClient;