const Instagram = require('instagram-private-api').V1;
const Client = require("./Client");
const _ = require("underscore");
const findHashtags = require("find-hashtags");


class InstagramClient extends Client {
    constructor(db, id, session, name) {
        super(db, id);
        this.session = session;
        this.identity = name + " [Instagram]";
    }

    async hashtag(query, maxResults) {
        await this.enabledCheck();
        const searchTerms = generateSearchTerms(query);
        const self = this;
        const hashtags = await Promise.all(searchTerms.map((term, index) => {
            return new Promise((resolve) => {
                setTimeout(resolve, 1000 * index);
            }).then(() => {
                return Instagram.Hashtag.search(self.session, term)
            });
        }));
        const results = _(hashtags).chain().flatten().pluck("_params").unique(false, (item) => {
            return item.id;
        }).sortBy("mediaCount").reverse().value();
        const hashtagsCollection = this.db.collection("instagram_hashtags");
        hashtagsCollection.bulkWrite(results.map((hashtag) => {
            return {
                updateOne: {
                    filter: {id: hashtag.id},
                    update: hashtag,
                    upsert: true
                }
            };
        }));

        return _(searchTerms.concat(_(results).pluck("name"))).chain().unique().first(maxResults || 10);
    }


    async like(media) {
        await this.enabledCheck();
        const accountId = await this.getAccountId();
        const likedCollection = this.db.collection("instagram_likes_" + accountId);
        if (await likedCollection.findOne({id: media.id})) {
            throw "We already liked " + media.id;
        }
        return Instagram.Like.create(this.session, media.id).then((like) => {
            likedCollection.insertOne({media: media._params, like: like._params});
            return like;
        });
    }

    async search(hashtag) {
        await this.enabledCheck();
        const self = this;
        return new Instagram.Feed.TaggedMedia(this.session, hashtag).get().then((medias) => {
            if (medias.length == 0) {
                return medias;
            }
            self.db.collection("instagram_media").bulkWrite(medias.map((media) => {
                return {
                    updateOne: {
                        filter: {id: media._params.id},
                        update: {
                            id: media._params.id,
                            media: media._params,
                            account: media.account._params,
                            createdOn: new Date()
                        },
                        upsert: true
                    }
                };
            }));
            self.db.collection("instagram_accounts").bulkWrite(medias.map((media) => {
                media.account._params.updatedOn = new Date();
                return {
                    updateOne: {
                        filter: {id: media.account.id},
                        update: media.account._params,
                        upsert: true
                    }
                };
            }));
            return medias;
        });
    }

    async comment(media, comment) {
        await this.enabledCheck();
        const accountId = await this.getAccountId();
        const commentCollection = this.db.collection("instagram_comments_" + accountId);
        if (await commentCollection.findOne({media: {id: media.id}})) {
            throw "We already commented on " + media.id;
        }
        return Instagram.Comment.create(this.session, media.id, comment).then((commentData) => {
            commentCollection.insertOne({media: media._params, comment: comment, data: commentData._params});
            return commentData;
        });
    }

    async shouldEngage(media) {
        await this.enabledCheck();
        const accountId = await this.getAccountId();
        if (media.account.id == accountId) {
            return false;
        }
        const commentCollection = this.db.collection("instagram_comments_" + accountId);
        const likedCollection = this.db.collection("instagram_likes_" + accountId);
        const followingCollection = this.db.collection("instagram_following_" + accountId);
        const followersCollection = this.db.collection("instagram_followers_" + accountId);
        return !(await Promise.all([commentCollection.findOne({media: {id: media.id}}),
            likedCollection.findOne({id: media.id}),
            followingCollection.findOne({id: media.account.id}),
            followersCollection.findOne({id: media.account.id})
        ])).reduce((left, right) => {
            return left || right;
        });
    }

    async followMedia(media){
        return this.follow(media.account);
    }

    async follow(account) {
        await this.enabledCheck();
        const accountId = await this.getAccountId();
        if (account.id == accountId) {
            throw "We don't need to follow ourselves.";
        }
        const followedCollection = this.db.collection("instagram_following_" + await this.session.getAccountId());
        if (await followedCollection.findOne({id: account.id})) {
            throw "Already following: " + account.id;
        }
        return Instagram.Relationship.create(this.session, account.id).then((relationship) => {
            followedCollection.insertOne(relationship._params);
            return relationship;
        });
    }

    async unfollow(account){
        await this.enabledCheck();
        const accountId = await this.getAccountId();
        if (account.id == accountId) {
            throw "We don't need to unfollow ourselves.";
        }
        const followedCollection = this.db.collection("instagram_following_" + accountId);
        return Instagram.Relationship.destroy(this.session, account.id).then((relationship) =>{
            followedCollection.removeMany({id:account.id});
            return relationship;
        });
    }

    async findUser(username) {
        await this.enabledCheck();
        return Instagram.Account.searchForUser(this.session, username);
    }

    async inbox() {
        await this.enabledCheck();
        return downloadFeed(new Instagram.Feed.Inbox(this.session));
    }

    async mediaComments() {
        await this.enabledCheck();
        return new Instagram.Feed.MediaComments(this.session).get();
    }

    async followers() {
        await this.enabledCheck();
        return downloadFeed(new Instagram.Feed.AccountFollowers(this.session, await this.session.getAccountId()));
    }

    async following() {
        await this.enabledCheck();
        return downloadFeed(new Instagram.Feed.AccountFollowing(this.session, await this.session.getAccountId()));
    }

    async refreshFollowers() {
        await this.enabledCheck();
        const accountId = await this.session.getAccountId();
        const followers = this.db.collection("instagram_followers_" + accountId);
        await followers.deleteMany();
        return followers.insertMany(_(await this.followers()).pluck("_params"));
    }

    async refreshFollowing() {
        await this.enabledCheck();
        const accountId = await this.session.getAccountId();
        const following = this.db.collection("instagram_following_" + accountId);
        await following.deleteMany();
        return following.insertMany(_(await this.following()).pluck("_params"));
    }

    async notFollowedBack(){
        const accountId = await this.session.getAccountId();
        await this.refreshFollowers();
        await this.refreshFollowing();
        const followerIds = _(await this.db.collection("instagram_followers_" + accountId).find().project({id:true}).toArray()).pluck("id");
        return this.db.collection("instagram_following_" + accountId).find({id:{$nin:followerIds}}).toArray();
    }

    async upload(path) {
        await this.enabledCheck();
        const upload = await Instagram.Upload.photo(this.session, path);
        await this.db.collection("instagram_uploads_" + await this.session.getAccountId()).insertOne({
            upload: upload._params,
            path: path
        });
        return upload;
    }

    async configurePhoto(upload, caption) {
        await this.enabledCheck();
        const media = await Instagram.Media.configurePhoto(this.session, upload._params.uploadId, caption);
        await this.db.collection("instagram_medias_" + await this.session.getAccountId()).insertOne({
            media: media._params,
            upload: upload._params,
            caption: caption
        });
        return media;
    }

    async post(post) {
        await this.enabledCheck();
        const image = await post.image.toJPG();
        return this.configurePhoto(await this.upload(image), post.caption + "\n.\n.\n.\n" + post.hashtags);
    }

    async getAccountId() {
        return this.session.getAccountId();
    }

    static async create(db, credential) {
        const device = new Instagram.Device(credential.instagram.username);
        const storage = new Instagram.CookieMemoryStorage();
        return Instagram.Session.create(device, storage, credential.instagram.username, credential.instagram.password)
            .then((session) => {
                return new InstagramClient(db, credential._id, session, credential.instagram.username);
            });
    }
}

function generateSearchTerms(str) {
    return require("find-hashtags")(str);
}

function generateNGrams(str, windowSize) {
    const output = [];
    const input = str.split(" ");
    for (let x = 0; x < input.length - windowSize; x++) {
        let current = "";
        for (let y = 0; y <= windowSize; y++) {
            current += " " + input[x + y];
        }
        output.push(current.trim());
    }
    return output;
}

async function downloadFeed(feed) {
    let output = await feed.get();
    while (feed.isMoreAvailable()) {
        output = output.concat(await feed.get());
    }
    return output;
}

if (!global.classes) {
    global.classes = {};
}
global.classes.InstagramClient = InstagramClient;

module.exports = InstagramClient;
