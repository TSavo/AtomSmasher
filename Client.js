class Client {
    constructor(db, id){
        this.db = db;
        this.id = id;
    }
    async load(){
        return this.db.collection("credentials").findOne({_id:this.id});
    }
    async enabled(){
        return (await this.load()).enabled;
    }
    async enabledCheck(){
        if(!(await this.enabled())) {
            throw "This client is not enabled";
        }
    }
    async audienceEngagement(){
        return (await this.load()).audienceEngagement;
    }
    async mediaPosting(){
        return (await this.load()).mediaPosting;
    }

    async delayFactor(){
        return (await this.load()).delayFactor;
    }
    async shouldLike(){
        return (await this.load()).like;
    }
    async shouldFollow(){
        return (await this.load()).follow;
    }
    async shouldUnfollow(){
        return (await this.load()).unfollow;
    }
    async shouldUnlike(){
        return (await this.load()).unlike;
    }
    async shouldComment(){
        return (await this.load()).comment;
    }
    async commentFactor(){
        return (await this.load()).commentFactor;
    }
}


module.exports = Client;