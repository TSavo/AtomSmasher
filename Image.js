const https = require("https");
const fs = require("fs");
const exec = require('child_process').exec;

class Image{
    constructor(src){
        if(src){
            this.image = downloadImage(src);
        }
    }
    async toJPG(){
        return flattenImage(await this.image);
    }

    static async fromFile(file){
        const output = new Image();
        output.image = Promise.resolve(file);
        return output;
    }
}

async function downloadImage(url) {
    return new Promise(function (resolve, reject) {
        const randomFilename = "scratch/" + randomFileName();
        https.get(url, function (response) {
            var file = fs.createWriteStream(randomFilename);
            response.pipe(file);
            file.on("finish", () => {
                file.close();
                resolve(randomFilename);
            });
        });
    });
}

async function flattenImage(file) {
    return new Promise(function (resolve, reject) {
        const randomFilename = "scratch/" + randomFileName();
        var cmd = "magick convert " + file + " -background white -flatten -gravity Center -resize 1080x1080 -extent 1080x1080 " + randomFilename + ".jpg";
        exec(cmd, function (err) {
            if (err) {
                return reject(err);
            }
            resolve(randomFilename + ".jpg");
        });
    });
}

function randomFileName(){
    return (Math.random().toString(36)+'00000000000000000').slice(2, 8+2);
}
module.exports = Image;