const imaps = require('imap-simple');
const mp = require("mongodb");
const InstagramClient = require("./InstagramClient");
const FacebookClient = require("./FacebookClient");
const TwitterClient = require("./TwitterClient");
const PinterestClient = require("./PinterestClient");
const fs = require('fs');
const ExternalPost = require("./ExternalPost");
const IMAPClient = require("./IMAPClient");

const credentials = JSON.parse(fs.readFileSync(".credentials.json", {encoding: "UTF-8"}));

async function getEmails() {
    const db = await mp.MongoClient.connect(credentials.mongodb);
    const imapClient = await db.collection("credentials").findOne({
        imap: {$exists: true},
        type: "email"
    }).then((credential) => {
        return global.classes[credential.className].create(db, credential);
    });
    const attachments = await imapClient.getUnseenMessages();
    const hashtagger = await db.collection("credentials").findOne({
        hashtagger: true,
        enabled: true
    }).then((credential) => {
        return global.classes[credential.className].create(db, credential);
    });
    const writtenAttachments = await Promise.all(attachments.map((post) => {
        return new Promise((resolve, reject) => {
            const filename = "scratch/" + randomFileName();
            fs.writeFile(filename, post.data, () => {
                post.file = filename;
                resolve(post);
            });
        })
    }));
    const externalPosts = await Promise.all(writtenAttachments.map((post) => {
        return ExternalPost.fromFile(db, post.file, post.text, hashtagger);
    })).catch(console.log);
    console.log(externalPosts);
    await Promise.all(await db.collection("credentials").find({
        type: "social",
        socialPosting: true,
        enabled: true
    }).map(async(credential) => {
        return global.classes[credential.className].create(db, credential);
    }).toArray()).then(async(clients) => {
        return Promise.all(clients.map(async(client) => {
            return Promise.all(externalPosts.map(async(post) => {
                return client.post(post).then(() => {
                    console.log(client.identity + " posted " + post.caption);
                });
            }));
        }));
    }).then(() => {
        externalPosts.forEach((post)=>{
            post.cleanUp();
        });
    }).catch(console.log);
    db.close();
    //connection.end();
}

function randomFileName() {
    return (Math.random().toString(36) + '00000000000000000').slice(2, 8 + 2);
}

getEmails().catch(console.log);
