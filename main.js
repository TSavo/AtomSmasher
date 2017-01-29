var Client = require('instagram-private-api').V1;
var device = new Client.Device('worldscollidingstore');
var _ = require("underscore");
var storage = new Client.CookieFileStorage(__dirname + '/cookies/worldscollidingstore.json');
var csp = require("js-csp");
var http = require("https")
var shopifyAPI = require('shopify-node-api');
var fs = require("fs");
var exec = require('child_process').exec;
var fb = require("fb");
var messages = ["This is so great.", "This is great!", "Love this!", "I love this.", "Fantastic!", "Love it!", "More like this please!", ":)", "<3", "Please, more like it! :)", "We need more like this. <3"];
var suffix = ["", "", "", "", "", "", "", "", "", "", " :)", " <3", " <3 <3 <3", " Yes!", " Thank you!", " Can we get more like it?", "👍👋", "😍", "❤"];
var searchHashtags = ["thewalkingdead", "walkingdead", "gameofthrones", "residentevil", "harrypotter", "mrrobot"];
var marketingMessage1 = ["Tag someone who needs this!", "Now available in the Worlds Colliding Store:", "Follow us for the latest sales and newest products!", "Do you love it?", "Need one just like it? We got you covered.", "Tag someone who would rock this!", "Like to be entered in our weekly giveaways!", "Want to win a free one? Follow us for our weekly giveaways!"];
var marketingMessage2 = "]\n\nOn SALE for only ";
var marketingMessage3 = "!\nPLUS Use promo code: RESIDENTEVIL to get $10 off your order.\n\n";
var staticHashTags = "#worldscollding #worldscollidingstore #shop #instagood #shopsmall ";

var credentials = JSON.parse(fs.readFileSync(".credentials.json", {encoding:"UTF-8"}));

fb.setAccessToken(credentials.facebook.access_token);

function refreshFacebookCredentials() {
    fb.api('oauth/access_token', {
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
        fb.setAccessToken(accessToken);
        credentials.facebook.access_token = accessToken;
        fs.writeFileSync(".credentials.json", JSON.stringify(credentials));

    })
}
refreshFacebookCredentials();
setInterval(refreshFacebookCredentials, 1000 * 60 * 15);


var Shopify = new shopifyAPI({
    shop: credentials.shopify.shop, // MYSHOP.myshopify.com
    shopify_api_key: credentials.shopify.shopify_api_key, // Your API key
    access_token: credentials.shopify.access_token, // Your API password
    verbose: false
});


function parseTags(tags) {
    return _.unique(tags.split(",").map(function (tag) {
        return "#" + tag.replace(/\s/g, "").replace(/-/g, "").toLowerCase();
    })).join(" ");
}

console.log(parseTags("The Walking Dead, Mr Robot, Hoodies, T-Shirts"));

function selectRandom(list) {
    return list[parseInt(Math.random() * list.length)];
}
function uploadProduct(session) {

    Products().then(function (products) {
        var product = products[parseInt(Math.random() * products.length)];
        http.get(product.image.src, function (res) {
            var file = fs.createWriteStream("in");
            res.pipe(file);
            file.on("finish", function () {
                file.close();
                var cmd = "magick convert in -background white -flatten test.jpg";
                exec(cmd, function (err) {
                    PostAdvertisementToFacebook("test.jpg", selectRandom(marketingMessage1) + "\n" + product.title + "\n\n" + getProductLink(product) + "\n\n" + staticHashTags + parseTags(product.tags), getProductLink(product));
                    PostAdvertisementToInstagram(session, "test.jpg", selectRandom(marketingMessage1) + "\n\n[" + product.title + marketingMessage2 + product.variants[0].price + marketingMessage3 + staticHashTags + parseTags(product.tags));
                });
            });
        });
    });

    setTimeout(function () {
        uploadProduct(session);
    }, (1000 * 60 * 60 * 2) + Math.random() * (1000 * 60 * 60 * 2));
}

function PostAdvertisementToInstagram(session, filename, caption) {
    Upload(session, filename).then(function (upload) {
        ConfigurePhoto(session, upload._params.uploadId, caption);
        console.log("Posted to Instagram: " + caption);
    });
}

function PostAdvertisementToFacebook(file, caption, link) {
    fb.api('/me/photos', 'post', {source:fs.createReadStream(file), options: { contentType: 'image/jpeg' }, caption: caption, link: link}, function (res) {
        console.log("Posted to Facebook: " + caption + " " + link + " [" + res + "]");
    });
}

function getProductLink(product) {
    return "https://worlds-colliding.myshopify.com/products/" + product.title.replace(/\s/g, "-");
}


function engageAudience(session) {
    new Client.Feed.TaggedMedia(session, selectRandom(searchHashtags)).get().then(function (media) {
        var choice = selectRandom(media);
        console.log("Found: " + choice.id + " [" + choice._params.caption + "] by " + choice.account._params.username);
        if (Math.random() > 0.2) {
            delay(function () {
                Follow(session, choice.account);
            });
        }
        delay(function () {
            Like(session, choice);
        });
        if (Math.random() > 0.5) {
            delay(function () {
                Comment(session, choice, selectRandom(messages) + selectRandom(suffix));
            });
        }
    });
    setTimeout(function () {
        engageAudience(session);
    }, 100000 + Math.random() * 100000)
}

Client.Session.create(device, storage, 'worldscollidingstore', 'Zabbas4242!').then(function (session) {
    engageAudience(session);
    uploadProduct(session);
});


function delay(fun) {
    setTimeout(fun, 15000 + (Math.random() * 80000));
}

function Like(instagramSession, media) {
    console.log("Liked: " + media._params.caption);
    return Client.Like.create(instagramSession, media.id)
}

function Search(instagramSession, hashtag) {
    return new Client.Feed.TaggedMedia(instagramSession, hashtag).get()
}

function Comment(instagramSession, media, comment) {
    console.log("Commented: " + comment);
    return Client.Comment.create(instagramSession, media.id, comment);
}

function Follow(instagramSession, account) {
    console.log("Followed: " + account._params.username);
    return Client.Relationship.create(instagramSession, account.id);
}

function FindUser(instagramSession, username) {
    return Client.Account.searchForUser(instagramSession, username);
}

function Inbox(instagramSession) {
    return new Client.Feed.Inbox(instagramSession).get();
}

function MediaComments(instagramSession) {
    return new Client.Feed.MediaComments(instagramSession).get();
}

function Upload(instagramSession, path) {
    return Client.Upload.photo(instagramSession, path);
}

function ConfigurePhoto(instagramSession, uploadId, caption) {
    return Client.Media.configurePhoto(instagramSession, uploadId, caption);
}

function Products() {
    return new Promise(function (resolve, reject) {
        Shopify.get('/admin/products.json', {limit: 250}, function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data.products);
            }
        });
    });
}