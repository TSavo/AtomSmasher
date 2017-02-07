const https = require("https");
const fs = require("fs");
const exec = require('child_process').exec;

class Image {
    constructor(src) {
        if (src) {
            this.image = downloadImage(src);
        }
    }

    async toJPG() {
        return this.image;
    }

    static async fromFile(file) {
        const output = new Image();
        output.image = Promise.resolve(file);
        return output;
    }

    async applyTemplate(template) {
        this.image = compositeImage(await this.image, template);
    }
}

async function downloadImage(url) {
    return new Promise(function (resolve, reject) {
        const randomFilename = "scratch/" + randomFileName();
        https.get(url, function (response) {
            const file = fs.createWriteStream(randomFilename);
            response.pipe(file);
            file.on("finish", () => {
                file.close();
                resolve(randomFilename);
            });
        });
    });
}

async function compositeImage(file, template) {
    return flattenImage(file + " " + template + " -composite");
}

async function flattenImage(file) {
    return new Promise(function (resolve, reject) {
        const randomFilename = "scratch/" + randomFileName();
        const cmd = "magick convert -resize 1080x1080 -extent 1080x1080 " + file + " -background white -flatten -gravity Center " + randomFilename + ".jpg";
        exec(cmd.replace(/\//g, "\\"), function (err) {
            if (err) {
                return reject(err);
            }
            resolve(randomFilename + ".jpg");
        });
    });
}

function randomFileName() {
    return (Math.random().toString(36) + '00000000000000000').slice(2, 8 + 2);
}
module.exports = Image;