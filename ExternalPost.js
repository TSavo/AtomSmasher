const Image = require("./Image");
const _ = require("underscore");

async function staticHashtags(db) {
    return _(await db.collection("static_hashtags").find().toArray()).pluck("hashtag");
}

class ExternalPost {
    constructor(caption, link, imgUrl, hashtags, image) {
        this.caption = caption;
        this.link = link;
        this.imgUrl = imgUrl;
        this.hashtags = hashtags;
        this.image = image;
    }

    static async fromUrl(db, url, caption, hashtagger) {
        const message = caption;
        const staticHash = await staticHashtags(db);
        const tags = hashtagger.hashtag(caption, 10);
        const image = new Image(url).toJPG();
        return new ExternalPost(message, url, url, (await tags).map((tag) => {
                return "#" + tag;
            }).join(" ") + " " + staticHash.join(" "), await image);
    }

    static async fromFile(db, file, caption, hashtagger) {
        var message = caption.replace(/Sent from my iPhone./g, "");
        message = message.substring(0, message.indexOf("#")).trim();
        const staticHash = await staticHashtags(db);
        const tags = hashtagger.hashtag(caption, 10);
        const image = await Image.fromFile(file);
        return new ExternalPost(message, "https://worlds-colliding.myshopify.com", "", (await tags).map((tag) => {
                return "#" + tag;
            }).join(" ") + " " + staticHash.join(" "), await image);
    }
}

module.exports = ExternalPost;