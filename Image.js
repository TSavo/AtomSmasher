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
        https.get(url, function (response) {
            var file = fs.createWriteStream("downloadedImage");
            response.pipe(file);
            file.on("finish", () => {
                file.close();
                resolve("downloadedImage");
            });
        });
    });
}

async function flattenImage(file) {
    return new Promise(function (resolve, reject) {
        var cmd = "magick convert " + file + " -background white -flatten flattened.jpg";
        exec(cmd, function (err) {
            if (err) {
                return reject(err);
            }
            resolve("flattened.jpg");
        });
    });
}

module.exports = Image;