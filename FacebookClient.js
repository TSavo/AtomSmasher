const _ = require("underscore");
const fs = require("fs");
const AbstractClient = require("./Client");

class FacebookClient extends AbstractClient{

    constructor(db, credentials, facebookApi) {
        super(db, credentials._id);
        this.facebookApi = facebookApi;
        this.credentials = credentials;
        const self=this;
        setInterval(async ()=>{
            self.updateAccessToken(await self.refreshAccessToken());
        }, 1000 * 60 * 15);
    }

    static async create(db, credential) {
        const facebookApi = require("fb").extend({});
        facebookApi.setAccessToken(credential.facebook.access_token);
        return new FacebookClient(db, credential, facebookApi);
    }

    async updateAccessToken(token){
        const credentials = this.credentials;
        credentials.facebook.access_token = token;
        this.facebookApi.setAccessToken(token);
        return this.db.collection("credentials").replaceOne({facebook: {$exists: true}}, credentials);
    }

    async refreshAccessToken(){
        const self = this;
        return new Promise((resolve, reject)=>{
            self.facebookApi.api('oauth/access_token', {
                client_id: self.credentials.facebook.client_id,
                client_secret: self.credentials.facebook.client_secret,
                grant_type: 'fb_exchange_token',
                fb_exchange_token: self.credentials.facebook.access_token
            }, function (res) {
                if (!res || res.error) {
                    return reject(res.error || "Error refreshing Facebook credentials: No reply given.");
                }
                resolve(res.access_token);
            })
        });
    }

    async post(productPost){
        const self = this;
        this.enabledCheck();
        return new Promise(function (resolve, reject) {
            self.facebookApi.api('/me/photos', 'post', {
                source: fs.createReadStream(productPost.jpg),
                options: {contentType: 'image/jpeg'},
                caption: productPost.caption + "\n\n" + productPost.hashtags,
                link: productPost.link
            }, function (res) {
                if(!res || res.error){
                    return reject(res.error || "Error posting to Facebook: No reply given.");
                }
                resolve("Posted to Facebook: " + productPost.caption + " " + productPost.link + " [" + res + "]");
            });
        });
    }
}

if(!global.classes){
    global.classes = {};
}
global.classes.FacebookClient = FacebookClient;

module.exports = FacebookClient;