const fs = require("fs");
const mp = require("mongodb");
const Grid = require('gridfs-stream');

class DBFile {
    constructor(db, filename){
        this.gfs = Grid(db, mp);
        this.filename = filename;
    }

    async exists(){
        return this.db.collection("fs.files").findOne({filename:this.filename});
    }

    async toDB(){
        const self = this;
        return new Promise(async (resolve)=>{
            const existing = await self.exists();
            const writestreamOptions = {filename:file};
            if(existing){
                writestreamOptions._id = existing._id;
            }
            const writestream = gfs.createWriteStream(writestreamOptions);
            fs.createReadStream(self.filename).pipe(writestream);
            writestream.on('close', resolve);
        });
    }

    async toTempFile(){
        const self = this;
        return new Promise(async (resolve)=>{
            const tempName = "scratch/" + randomFileName() + ".png";
            const readStream = self.gfs.createReadStream({filename:self.filename});
            const writeStream = fs.createWriteStream(tempName);
            readStream.pipe(writeStream);
            writeStream.on("close", ()=>{
                resolve(tempName);
            });
        });
    }
}

function randomFileName() {
    return (Math.random().toString(36) + '00000000000000000').slice(2, 8 + 2);
}

if(!global.classes){
    global.classes = {};
}

global.classes.DBFile = DBFile;

module.exports = DBFile;