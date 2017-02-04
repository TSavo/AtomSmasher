const imaps = require('imap-simple');
const mp = require("mongodb");
const InstagramClient = require("./InstagramClient");
const FacebookClient = require("./FacebookClient");
const TwitterClient = require("./TwitterClient");
const PinterestClient = require("./PinterestClient");

const findHashtags = require("find-hashtags");

var fs = require('fs');
const ExternalPost = require("./ExternalPost");

const credentials = JSON.parse(fs.readFileSync(".credentials.json", {encoding: "UTF-8"}));

async function getEmails() {
    const db = await mp.MongoClient.connect(credentials.mongodb);
    const config = await db.collection("credentials").findOne({type:"email", imap:{$exists:true}});
    const connection = await imaps.connect(config);
    await connection.openBox("INBOX");
    const searchCriteria = ['UNSEEN'];
    const fetchOptions = {markSeen: true, bodies: ['HEADER', "TEXT"], struct: true};
    const messages = await connection.search(searchCriteria, fetchOptions);
    const attachments = await Promise.all(messages.map(async(message) => {
        const output = {text: ""};
        return Promise.all(imaps.getParts(message.attributes.struct).map((part) => {
            if (part.disposition && (part.disposition.type == 'INLINE' || part.disposition.type == "ATTACHMENT")) {
                return connection.getPartData(message, part).then((itemData) => {
                    output.data = itemData;
                });
            } else {
                return connection.getPartData(message, part).then((itemData) => {
                    output.text += itemData;
                });
            }
        })).then(() => {
            return output;
        });
    }));
    let count = 0;
    const instagram = await InstagramClient.create(db, await db.collection("credentials").findOne({
        instagram: {$exists: true},
        enabled: true
    }));
    const writtenAttachments = await Promise.all(attachments.map((post) => {
        return new Promise((resolve, reject) => {
            const currentCount = count++;
            fs.writeFile(currentCount + "", post.data, () => {
                post.file = currentCount;
                resolve(post);
            });
        })
    }));
    const externalPosts = await Promise.all(writtenAttachments.map((post) => {
        return ExternalPost.fromFile(db, post.file, post.text, instagram);
    }));
    console.log(externalPosts);
    Promise.all(await db.collection("credentials").find({
        type: "social",
        socialPosting: true,
        enabled: true
    }).map(async(credential) => {
        console.log(credential);
        return global.classes[credential.className].create(db, credential);
    }).toArray()).then(async(clients) => {
        console.log(clients);
        return Promise.all(clients.map(async (client) => {
            return Promise.all(externalPosts.map(async (post) => {
                return await client.post(post);
            }));
        }));
    }).catch(console.log);
}

getEmails().catch(console.log);
