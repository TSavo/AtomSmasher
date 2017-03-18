const _ = require("underscore");
const fs = require("fs.promised");
const mp = require("mongodb");
const Image = require("./Image");
const InstagramClient = require("./InstagramClient");
const ShopifyClient = require("./ShopifyClient");
const PinterestClient = require("./PinterestClient");
const TwitterClient = require("./TwitterClient");
const FacebookClient = require("./FacebookClient");
const DBFile = require("./DBFile");

const messages = ["This is so great.", "This is great!", "Love this!", "I love this.", "Love it!", "I love this so much!", "Thank you for sharing!", ":)", "<3", "Please, more like it! :)", "We need more like this. <3"];
const suffix = ["", "", "", "", "", "", "", "", "", "", " :)", " <3", " <3 <3 <3", " Yes!", " Thank you!", " Can we get more like it?", "👍👋", "😍", "❤", "❤❤❤", "😍😍😍", "😍❤😍", "❤😍❤"];
const searchHashtags = ["thewalkingdead", "walkingdead", "gameofthrones", "westeros", "residentevil", "harrypotter", "mrrobot", "fsociety", "follow", "follow4follow", "like", "followback", "amc", "breakingbad", "bettercallsaul"];


function selectRandom(list) {
    return list[parseInt(Math.random() * list.length)];
}

async function uploadProduct(shopify, client, db) {
    const product = await shopify.getFreshProduct();
    const productPost = await product.toPost();
    if (!(await client.enabled() && await client.mediaPosting())) {
        return console.log("Skipping posting on " + client.constructor.name + " because it is disabled.");
    }
    //const template = await new DBFile(db, _(await db.collection("ad_template_assets").find({}).toArray()).chain().shuffle().first().value().filename).toTempFile();
    //await productPost.applyTemplate(template);
    setTimeout(() => {
        uploadProduct(shopify, client, db);
    }, (1000 * 60 * 90) + Math.random() * (1000 * 60 * 100));
    return client.post(productPost).then(() => {
        log(client.identity + " posted: " + productPost.caption);
    }).then(async () => {
        await productPost.cleanUp();
      //  await fs.unlink(template);
        return shopify.addRecentlyPosted(product);
    }).catch(async (error)=>{
        await productPost.cleanUp();
        //await fs.unlink(template);
        log(error);
    });

}

async function engageAudience(session, notFollowedBack, likes) {

    if (!(await session.enabled() && await session.audienceEngagement())) {
        return setTimeout(() => {
            engageAudience(session);
        }, 1000 * 60);
    }
    return session.search(selectRandom(searchHashtags)).then(async(media) => {
        media = _(media).chain().shuffle().first(5).value();
        media = _(await Promise.all(media.map(async(item) => {
            item.shouldEngage = await session.shouldEngage(item);
            return item;
        }))).filter((item) => {
            return item.shouldEngage;
        });
        const delayFactor = 1000 * (await session.delayFactor()) * media.length;
        const commentFactor = await session.commentFactor();
        const shouldLike = await session.shouldLike();
        const shouldComment = await session.shouldComment();
        const shouldFollow = await session.shouldFollow();
        const shouldUnfollow = await session.shouldUnfollow();
        const shouldUnlike = await session.shouldUnlike();

        let actions = media.map((choice) => {
            if (shouldFollow) {
                return randomDelay(function () {
                    return session.followMedia(choice).then((follow) => {
                        log(session.identity + " Followed: " + choice.id);
                        return follow;
                    });
                }, delayFactor);
            } else {
                return Promise.resolve();
            }
        });
        if (shouldLike) {
            actions = actions.concat(media.map((choice) => {
                return randomDelay(function () {
                    return session.like(choice).then((like) => {
                        log(session.identity + " Liked: " + choice.id);
                        return like;
                    });
                }, delayFactor);
            }));
        }
        if (shouldComment) {
            actions = actions.concat(media.map((choice) => {
                if (Math.random() < commentFactor) {
                    return randomDelay(function () {
                        let message = selectRandom(messages) + selectRandom(suffix);
                        return session.comment(choice, message).then((comment) => {
                            log(session.identity + " Commented on " + choice.id + ": " + message);
                            return comment;
                        });
                    }, delayFactor);
                } else {
                    return Promise.resolve();
                }
            }));
        }
        if (shouldUnfollow) {
            actions = actions.concat(media.map(() => {
                const unfollow = notFollowedBack.pop();
                return randomDelay(() => {
                    session.unfollow(unfollow).then((unfollowed) => {
                        log(session.identity + " Unfollowed: " + unfollow.id);
                        return unfollowed;
                    })
                }, delayFactor)
            }));
        }
        if (shouldUnlike && likes.length > 0) {
            actions = actions.concat(media.map(() => {
                const like = likes.pop();
                return randomDelay(() => {
                    session.unlike(like).then((unliked) => {
                        log(session.identity + " Unliked: " + unliked.id);
                        return unliked;
                    })
                }, delayFactor)
            }));
        }
        setTimeout(() => {
            engageAudience(session, notFollowedBack, likes).catch(log);
        }, delayFactor);
        return Promise.all(actions);
    }).catch((e)=>{
        log(e);
    });
}


async function main() {
    const dbCredentials = JSON.parse(await fs.readFile(".credentials.json", {encoding: "UTF-8"}));
    const db = await mp.MongoClient.connect(dbCredentials.mongodb);
    const shopify = await ShopifyClient.create(db);
    const credentials = await db.collection("credentials").find({type: "social", enabled:true}).toArray();
    const clients = await Promise.all(credentials.map((credential) => {
        return global.classes[credential.className].create(db, credential);
    }));
    return _(clients.map(async(item) => {
        return [
            randomDelay(async() => {
                return engageAudience(item, item.notFollowedBack ? await item.notFollowedBack() : [], await item.shouldUnlike() ? await item.likes() : []);
            }, 1000 * 120),
            randomDelay(() => {
                return uploadProduct(shopify, item, db);
            }, 1000 * 120)
        ];
    })).flatten();
}
async function randomDelay(fun, delayFactor) {
    return new Promise((resolve) => {
        setTimeout(resolve, Math.random() * delayFactor);
    }).then(fun);
}

function log(message) {
    console.log("[" + new Date() + "] " + (typeof message == "string" ? message : JSON.stringify(message)));
}

main().then((mainPromises)=>{
    return Promise.all(mainPromises);
}).catch(log);