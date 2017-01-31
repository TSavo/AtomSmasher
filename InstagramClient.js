const Instagram = require('instagram-private-api').V1;


class InstagramClient {
    constructor(db, session) {
        this.db = db;
        this.session = session;
    }

    async like(media) {
        const like = await Instagram.Like.create(this.session, media.id);
        await this.db.collection("instagram_likes").insertOne({mediaId:media.id});
        return like;
    }

    async search(hashtag) {
        return new Instagram.Feed.TaggedMedia(this.session, hashtag).get();
    }

    async comment(media, comment) {
        const commentData = await Instagram.Comment.create(this.session, media.id, comment);
        await this.db.collection("instagram_comments").insertOne({mediaId:media.id, comment:comment});
        return commentData;
    }

    async follow(account) {
        const relationship = Instagram.Relationship.create(this.session, account.id);
        await this.db.collection("instagram_relationships").insertOne({accountId:account.id});
        return relationship;
    }

    async findUser(username) {
        console.log(session);
        return Instagram.Account.searchForUser(this.session, username);
    }

    async inbox() {
        return new Instagram.Feed.Inbox(this.session).get();
    }

    async mediaComments() {
        return new Instagram.Feed.MediaComments(this.session).get();
    }

    async upload(path) {
        console.log(path);
        const upload = await Instagram.Upload.photo(this.session, path);
        await this.db.collection("instagram_uploads").insertOne({uploadId:upload.id, path:path});
        return upload;
    }

    async configurePhoto(uploadId, caption) {
        console.log(uploadId);
        const media = await Instagram.Media.configurePhoto(this.session, uploadId, caption);
        await this.db.collection("instagram_medias").insertOne({mediaId:media.id, uploadId: uploadId, caption:caption});
        return media;
    }

    async post(path, caption, link, imageSrc, hashtags){
        return this.configurePhoto((await this.upload(path))._params.uploadId, caption + "\n.\n.\n.\n" + hashtags);
    }

    static async create(db) {
        return new Promise(async(resolve, reject) => {
            const credentials = await db.collection("credentials").findOne({instagram:{$exists:true}});
            const device = new Instagram.Device(credentials.instagram.username);
            const storage = new Instagram.CookieFileStorage(__dirname + '/cookies.json');
            Instagram.Session.create(device, storage, credentials.instagram.username, credentials.instagram.password)
                .then((session) => {
                    resolve(new InstagramClient(db, session));
                }).catch(reject);
        });
    }
}

module.exports = InstagramClient;
