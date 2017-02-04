const _ = require("underscore");
const fs = require("fs");
const mp = require("mongodb");
const Image = require("./Image");
const InstagramClient = require("./InstagramClient");
const ShopifyClient = require("./ShopifyClient");
const PinterestClient = require("./PinterestClient");
const TwitterClient = require("./TwitterClient");
const FacebookClient = require("./FacebookClient");
const messages = ["This is so great.", "This is great!", "Love this!", "I love this.", "Love it!", "I love this so much!", "Thank you for sharing!", ":)", "<3", "Please, more like it! :)", "We need more like this. <3"];
const suffix = ["", "", "", "", "", "", "", "", "", "", " :)", " <3", " <3 <3 <3", " Yes!", " Thank you!", " Can we get more like it?", "👍👋", "😍", "❤", "❤❤❤", "😍😍😍", "😍❤😍", "❤😍❤"];
const searchHashtags = ["thewalkingdead", "walkingdead", "gameofthrones", "westeros", "residentevil", "harrypotter", "mrrobot", "fsociety", "follow", "follow4follow", "like", "followback", "amc", "breakingbad", "bettercallsaul"];

const credentials = JSON.parse(fs.readFileSync(".credentials.json", {encoding: "UTF-8"}));

function selectRandom(list) {
    return list[parseInt(Math.random() * list.length)];
}

async function uploadProduct(shopify, clients) {
    const product = await shopify.getFreshProduct();
    const productPost = await product.toPost().catch(console.log);
    clients.forEach(async(client) => {
        if (!(await client.enabled() && await client.mediaPosting())) {
            return console.log("Skipping posting on " + client.constructor.name + " because it is disabled.");
        }
        client.post(productPost).catch(console.log);
    });
    shopify.addRecentlyPosted(product);
    setTimeout(function () {
        uploadProduct(shopify, clients);
    }, (1000 * 60 * 45) + Math.random() * (1000 * 60 * 60 * 2));
}

async function engageAudience(session) {
    const timerDelay = 5000;
    if (!(await session.enabled() && await session.audienceEngagement())) {
        console.log("Skipping audience engagement with " + session.constructor.name + " because the session isn't enabled.");
        return setTimeout(() => {
            engageAudience(session);
        }, 1000 * 60);
    }
    session.search(selectRandom(searchHashtags)).then(async(media) => {
        media = _(media).first(5);
        media = _(await Promise.all(media.map(async(item) => {
            item.shouldEngage = await session.shouldEngage(item);
            return item;
        }))).filter((item) => {
            return item.shouldEngage;
        });
        const delayFactor = 1000 * (await session.delayFactor()) * media.length;
        media.forEach(async(choice) => {
            console.log("Found: " + choice.id + " [" + choice._params.caption + "] by " + choice.account._params.username);
            if (await session.shouldFollow()) {
                delay(function () {
                    session.follow(choice.account).then((result) => {
                        console.log("Followed: " + choice.account._params.username);
                    }).catch(console.log);
                }, delayFactor);
            }
            if (await session.shouldLike()) {

                delay(function () {
                    session.like(choice).then(() => {
                        console.log("Liked: " + choice.id);
                    }).catch(console.log);
                }, delayFactor);
            }
            if (await session.shouldComment() && Math.random() < await session.commentFactor()) {
                delay(function () {
                    let message = selectRandom(messages) + selectRandom(suffix);
                    session.comment(choice, message).then(() => {
                        console.log("Commented on " + choice.id + ": " + message);
                    }).catch(console.log);
                }, delayFactor);
            }
        });
        setTimeout(async() => {
            await engageAudience(session);
        }, timerDelay + delayFactor);
    }).catch(console.log);
}

mp.MongoClient.connect(credentials.mongodb).then(async(db) => {
    return Promise.all(await db.collection("credentials").find({type: "social"}).map(async(credential) => {
        return global.classes[credential.className].create(db, credential);
    }).toArray()).then(async(items) => {
        const clients = _(items).flatten();
        clients.forEach(engageAudience);
        return uploadProduct(await ShopifyClient.create(db), clients);
    });
}).catch(console.log);

function delay(fun, delayFactor) {
    setTimeout(fun, 5000 + (Math.random() * delayFactor));
}

