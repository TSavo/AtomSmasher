var _ = require("underscore");
var fs = require("fs");
var Facebook = require("fb");
var Twitter = require("twitter");

var Image = require("./Image");
const mp = require("mongodb");
const InstagramClient = require("./InstagramClient");
const ShopifyClient = require("./ShopifyClient");
const PinterestClient = require("./PinterestClient");
var messages = ["This is so great.", "This is great!", "Love this!", "I love this.", "Love it!", "I love this so much!", "Thank you for sharing!", ":)", "<3", "Please, more like it! :)", "We need more like this. <3"];
var suffix = ["", "", "", "", "", "", "", "", "", "", " :)", " <3", " <3 <3 <3", " Yes!", " Thank you!", " Can we get more like it?", "👍👋", "😍", "❤", "❤❤❤", "😍😍😍", "😍❤😍", "❤😍❤"];
var searchHashtags = ["thewalkingdead", "walkingdead", "gameofthrones", "westeros", "residentevil", "harrypotter", "mrrobot", "fsociety"];
var marketingMessage1 = ["Tag someone who needs this!", "Tell us why you love this for a chance to win a free one:", "Now available in the Worlds Colliding Store:", "Do you need one?", "Do you love it?", "Need one just like it? We got you covered.", "Tag someone who would rock this!"];
var marketingMessage2 = "]\n\nOn SALE for only ";
var marketingMessage3 = "!\nPLUS Use promo code: RESIDENTEVIL to get $10 off your order.\n\n";
var staticHashTags = "#worldscollding #worldscollidingstore #shop #instagood #shopsmall #follow #love #followme #tbt #like #fun #like4like #fashion #instalike";

var credentials = JSON.parse(fs.readFileSync(".credentials.json", {encoding: "UTF-8"}));

var twitterClient = new Twitter(credentials.twitter);

Facebook.setAccessToken(credentials.facebook.access_token);

function refreshFacebookCredentials() {
    Facebook.api('oauth/access_token', {
        client_id: credentials.facebook.client_id,
        client_secret: credentials.facebook.client_secret,
        grant_type: 'fb_exchange_token',
        fb_exchange_token: credentials.facebook.access_token
    }, function (res) {
        if (!res || res.error) {
            console.log(!res ? 'error occurred' : res.error);
            return;
        }

        var accessToken = res.access_token;

        console.log("Facebook credentials refreshed: " + accessToken);
        Facebook.setAccessToken(accessToken);
        credentials.facebook.access_token = accessToken;
        fs.writeFileSync(".credentials.json", JSON.stringify(credentials));

    })
}
refreshFacebookCredentials();
setInterval(refreshFacebookCredentials, 1000 * 60 * 15);

function parseTags(tags) {
    return _.unique(tags.split(",").map(function (tag) {
        return "#" + tag.replace(/\s/g, "").replace(/-/g, "").toLowerCase();
    })).join(" ");
}

function shortenTags(tags) {
    return _(tags.split(" ")).first(3).join(" ");
}


function selectRandom(list) {
    return list[parseInt(Math.random() * list.length)];
}

async function uploadProduct(shopify, clients) {
    const product = await shopify.getFreshProduct();
    const flattened = await new Image(product.image.src).toJPG();
    PostAdvertisementToTwitter(flattened, selectRandom(marketingMessage1) + " " + product.title + " " + getProductLink(product) + " " + shortenTags(parseTags(product.tags))).catch(console.log);
    PostAdvertisementToFacebook(flattened, selectRandom(marketingMessage1) + "\n" + product.title + "\n\n" + getProductLink(product) + "\n\n" + parseTags(product.tags) + " " + staticHashTags, getProductLink(product)).catch(console.log);

    const caption = product.title + " \n" + selectRandom(marketingMessage1);
    clients.forEach((client)=>{
        client.push(flattened, caption, getProductLink(product), product.image.src, parseTags(product.tags));
    });

    pinterest.post(flattened, product.title, getProductLink(product), product.image.src, parseTags(product.tags) + " " + staticHashTags).then(console.log).catch(console.log);
    setTimeout(function () {
        uploadProduct(session);
    }, (1000 * 60 * 45) + Math.random() * (1000 * 60 * 60 * 2));
}

async function PostAdvertisementToTwitter(filename, caption) {
    return new Promise(function (resolve, reject) {
        twitterClient.post('media/upload', {media: fs.readFileSync(filename)}, function (error, media, response) {
            if (error) return reject(error);
            var status = {
                status: caption,
                media_ids: media.media_id_string
            };
            twitterClient.post('statuses/update', status, function (error, tweet, response) {
                if (error) return reject(error);
                console.log("Tweeted: " + JSON.stringify(tweet));
                resolve("Tweeted: " + JSON.stringify(tweet));
            });
        });
    });
}

async function PostAdvertisementToFacebook(file, caption, link) {
    return new Promise(function (resolve, reject) {
        Facebook.api('/me/photos', 'post', {
            source: fs.createReadStream(file),
            options: {contentType: 'image/jpeg'},
            caption: caption,
            link: link
        }, function (res) {
            console.log("Posted to Facebook: " + caption + " " + link + " [" + res + "]");
            resolve("Posted to Facebook: " + caption + " " + link + " [" + res + "]");
        });
    });
}


function getProductLink(product) {
    return "https://worlds-colliding.myshopify.com/products/" + product.title.replace(/\s/g, "-").replace(/[\(\)]/g, "");
}

async function engageAudience(session) {
    var timerDelay = 15000;
    session.search(selectRandom(searchHashtags)).then(function (media) {
        var choice = selectRandom(media);
        console.log("Found: " + choice.id + " [" + choice._params.caption + "] by " + choice.account._params.username);
        if (Math.random() > 0.2) {
            delay(function () {
                session.follow(choice.account).then(() => {
                    console.log("Followed: " + choice.account._params.username);
                });
            });
        }
        delay(function () {
            session.like(choice).then(() => {
                console.log("Liked: " + choice.id);
            });
        });
        if (Math.random() > 0.8) {
            delay(function () {
                let message = selectRandom(messages) + selectRandom(suffix);
                session.comment(choice, message).then(() => {
                    console.log("Commented on " + choice.id + ": " + message);
                });
            });
        }
    }).catch((e) => {
        console.log(e);
        timerDelay = 1000 * 60 * 15;
    });
    setTimeout(async() => {
        await engageAudience(session);
    }, timerDelay + Math.random() * 60000)
}

mp.MongoClient.connect(credentials.mongodb).then(async(db) => {
    InstagramClient.create(db).then(async(instagram) => {
        engageAudience(instagram);
        uploadProduct(await ShopifyClient.create(db), [instagram, await PinterestClient.create(db)]);
    });
});

function delay(fun) {
    setTimeout(fun, 15000 + (Math.random() * 8000));
}

