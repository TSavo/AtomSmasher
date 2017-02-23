const fs = require("fs.promised");
const exec = require('child_process').exec;

class Image {
    constructor(src, parent) {
        this.image = src;
        this.flattened = false;
        if(parent){
           this.parent = parent;
        }
    }

    async toJPG() {
        if(this.flattened){
            return this.image;
        }else{
            return flattenImage(await this.image);
        }
    }

    async applyTemplate(template) {
        const img = new Image(compositeImage(await this.image, template), this);
        img.flattened = true;
        return img;
    }

    async cleanUp(chainable){
        if(!chainable){
            chainable = Promise.resolve();
        }
        if(this.parent){
            chainable = this.parent.cleanUp(chainable);
        }
        const self = this;
        chainable = chainable.then(async ()=> {
            return fs.unlink(await self.image);
        });
        return chainable;
    }
}

async function compositeImage(file, template) {
    return flattenImage(file + " " + template + " -composite");
}

async function flattenImage(file) {
    return new Promise(function (resolve, reject) {
        const randomFilename = "scratch/" + randomFileName();
        const cmd = "magick convert -resize 1080x1080 -extent 1080x1080 -gravity Center " + file + " -background white -flatten " + randomFilename + ".jpg";
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