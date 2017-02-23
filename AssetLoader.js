const fs = require("fs.promised");
const mp = require("mongodb");
const Grid = require('gridfs-stream');


async function load() {
    const dbCredentials = JSON.parse(await fs.readFile(".credentials.json", {encoding: "UTF-8"}));
    const db = await mp.MongoClient.connect(dbCredentials.mongodb);
    const files = await fs.readdir("assets");
    const gfs = Grid(db, mp);
    db.command({ convertToCapped: "instagram_media", size: 2500000, length:10000 });
    await db.collection("fs.files").deleteMany({});
    await db.collection("fs.chunks").deleteMany({});
    await db.collection("ad_template_assets").deleteMany({});

    Promise.all(files.map((file) => {
        return new Promise(async (resolve)=> {
            const existing = await db.collection("fs.files").findOne({filename:file});
            const writestreamOptions = {filename:file};
            if(existing){
                writestreamOptions._id = existing._id;
            }
            const writestream = gfs.createWriteStream(writestreamOptions);
            fs.createReadStream("assets/" + file).pipe(writestream);
            writestream.on('close', resolve);
        }).then((file)=>{
            console.log(file);
            return db.collection("ad_template_assets").replaceOne({filename:file.filename}, file, {upsert:true});
        });
    }));
}

load();