const Twitter = require("twitter");
const fs = require("fs");
const _ = require("underscore");
const AbstractClient = require("./Client");

class TwitterClient extends AbstractClient {

    constructor(db, id, twitterApi) {
        super(db, id);
        this.twitterApi = twitterApi;
    }

    static async create(db, credential) {
        return new TwitterClient(db, credential._id, new Twitter(credential.twitter));
    }

    async post(productPost) {
        const self = this;
        return new Promise(async(resolve, reject) => {
            if (!self.enabled()) {
                return resolve("Skipping because this Twitter API is disabled.");
            }
            self.twitterApi.post('media/upload', {media: fs.readFileSync(await productPost.image.image)}, function (error, media) {
                if (error) return reject(error);
                const status = {
                    status: productPost.caption + " " + shortenTags(productPost.hashtags) + " " + productPost.link,
                    media_ids: media.media_id_string
                };
                self.twitterApi.post('statuses/update', status, function (error, tweet, response) {
                    if (error) return reject(error);
                    resolve(tweet);
                });
            });
        });
    }
}

function shortenTags(tags) {
    return _(tags.split(" ")).first(3).join(" ");
}

if (!global.classes) {
    global.classes = {};
}
global.classes.TwitterClient = TwitterClient;

module.exports = TwitterClient;