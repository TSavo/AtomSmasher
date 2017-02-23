const Image = require("./Image");
const _ = require("underscore");
const https = require("https");
const fs = require("fs");
async function staticHashtags(db){
    return _(await db.collection("static_hashtags").find().toArray()).pluck("hashtag").join(" ");
}

async function randomMarketingMessage(db){
    return _(await db.collection("marketing_messages").find().toArray()).chain().pluck("message").shuffle().first().value();
}

function parseTags(tags) {
    return _.unique(tags.split(",").map(function (tag) {
        return "#" + tag.replace(/[\s\-#']/g, "").toLowerCase();
    })).join(" ");
}

function createProductLink(product) {
    return "https://worlds-colliding.myshopify.com/products/" + product.title.replace(/\s/g, "-").replace(/[\(\)]/g, "");
}

class ProductPost {
    constructor(caption, link, imgUrl, hashtags, image) {
        this.caption = caption;
        this.link = link;
        this.imgUrl = imgUrl;
        this.hashtags = hashtags;
        this.image = image;
    }

    static async fromProduct(db, product){
        const message = randomMarketingMessage(db);
        const tags = staticHashtags(db);
        const image = new Image(downloadImage(product.image.src));
        return new ProductPost(product.title + " \n" + await message, createProductLink(product), product.image.src, parseTags(product.tags) + " " + await tags, image);
    }

    async applyTemplate(template){
        this.image = await this.image.applyTemplate(template);
    }

    async cleanUp(){
        return this.image.cleanUp();
    }

}

async function downloadImage(url) {
    return new Promise(function (resolve, reject) {
        const randomFilename = "scratch/" + randomFileName();
        https.get(url, function (response) {
            const file = fs.createWriteStream(randomFilename);
            response.pipe(file);
            file.on("finish", () => {
                file.close();
                resolve(randomFilename);
            });
        });
    });
}

function randomFileName() {
    return (Math.random().toString(36) + '00000000000000000').slice(2, 8 + 2);
}


module.exports = ProductPost;