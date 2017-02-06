var PinterestDK = require('node-pinterest');
const fs = require("fs");
const _ = require("underscore");
const Client = require("./Client");


class PinterestClient extends Client {
    constructor(db, id, pinterestApi, name) {
        super(db, id);
        this.pinterestApi = pinterestApi;
        this.identity = name + " [Pinterest]";
    }

    static async create(db, credential) {
        return new PinterestClient(db, credential._id, PinterestDK.init(credential.pinterest.access_token), credential.pinterest.username);
    }

    async findBestBoards(hashtags) {
        const boards = (await this.pinterestApi.api('me/boards')).data;
        var bestBoards = [];
        hashtags.split(" ").map(function (tag) {
            return tag.trim().replace(/[#\s-]/g, "").toLowerCase();
        }).forEach(function (tag) {
            var found = _(boards).find(function (board) {
                return board.name.trim().replace(/\s/g, "").replace(/-/g, "").toLowerCase().startsWith(tag);
            });
            if (found) {
                bestBoards.push(found);
            }
        });
        return _.unique(bestBoards);
    }

    async post(post) {
        const self = this;
        return Promise.all((await self.findBestBoards(post.hashtags))
            .map(async(board) => {
                const posted = await self.pinterestApi.api('pins', {
                        method: 'POST',
                        body: {
                            board: board.id,
                            note: post.caption,
                            link: post.link,
                            image_url: post.imgUrl
                        }
                    }
                );
                await self.db.collection("pinterest_pins_" + self.id).insertOne(posted);
                return posted;
            }));
    }
}

if (!global.classes) {
    global.classes = {};
}
global.classes.PinterestClient = PinterestClient;

module.exports = PinterestClient;