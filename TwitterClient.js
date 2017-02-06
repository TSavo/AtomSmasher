const Twitter = require("twitter");
const fs = require("fs");
const _ = require("underscore");
const AbstractClient = require("./Client");

class TwitterClient extends AbstractClient {

    constructor(db, id, twitterApi, name) {
        super(db, id);
        this.twitterApi = twitterApi;
        this.identity = name + " [Twitter]";
    }

    static async create(db, credential) {
        return new TwitterClient(db, credential._id, new Twitter(credential.twitter), credential.twitter.username);
    }

    async search(term) {
        return this.twitterApi.get("search/tweets", {q: term, result_type: "recent"}).then((result) => {
            return result.statuses;
        });
    }

    async shouldEngage() {
        return true;
    }

    async followMedia(media) {
        return this.follow(media.user);
    }

    async follow(user) {
        return this.twitterApi.post("friendships/create", {user_id: user.id_str});
    }

    async unfollow(account) {
        return this.twitterApi.post("friendships/destroy", {user_id: account.id_str});
    }

    async notFollowedBack() {
        return this.twitterApi.get("friends/list", {count: 200}).then((followers) => {
            return followers.users;
        });
    }

    async rateLimitStatus() {
        return this.twitterApi.get("application/rate_limit_status", {resources: "statuses,friends,trends,help"});
    }

    async like(media) {
        return this.twitterApi.post("favorites/create", {id: media.id_str});
    }
    async unlike(media){
        return this.twitterApi.post("favorites/destroy", {id:media.id_str});
    }

   async likes() {
        return this.twitterApi.get("favorites/list", {count: 200}).then((items) => {
            return _(items).reverse();
        });
    }

    async comment(media, comment) {
        return Promise.resolve();
    }

    async post(productPost) {
        const self = this;
        return new Promise(async(resolve, reject) => {
            if (!(await self.enabled())) {
                reject("Skipping because this Twitter API is disabled.");
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