const _ = require("underscore");
const fs = require("fs");
const AbstractClient = require("./Client");

class FacebookClient extends AbstractClient{

    constructor(db, credentials, facebookApi) {
        super(db, credentials._id);
        this.facebookApi = facebookApi;
        this.credentials = credentials;
        const self=this;
        self.refreshAccessToken().then((token)=>{
            self.updateAccessToken(token);
        });
        setInterval(()=>{
            self.refreshAccessToken().then((token)=>{
                self.updateAccessToken(token);
            });
        }, 1000 * 60 * 15);
        this.identity = "App ID: " + credentials.facebook.client_id + " [Facebook]";
    }

    static async create(db, credential) {
        const facebookApi = require("fb").extend({});
        facebookApi.setAccessToken(credential.facebook.access_token);
        return new FacebookClient(db, credential, facebookApi);
    }

    async updateAccessToken(token){
        console.log("[" + new Date() + "] " + this.identity + " token updated: " + token);
        const credentials = this.credentials;
        credentials.facebook.access_token = token;
        this.facebookApi.setAccessToken(token);
        return this.db.collection("credentials").replaceOne({_id:this.id}, credentials);
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
        return new Promise(async function (resolve, reject) {
            self.facebookApi.api('/me/photos', 'post', {
                source: fs.createReadStream(await productPost.image.image),
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