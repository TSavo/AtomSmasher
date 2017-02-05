const imaps = require('imap-simple');
const Client = require("./Client");

class IMAPClient extends Client {

    constructor(db, credentials){
        super(db, credentials.id);
        this.config = credentials;
    }

    static async create(db, credentials) {
        return new IMAPClient(db, credentials);
    }

    async getUnseenMessages(){
        const connection = await imaps.connect(this.config);
        await connection.openBox("INBOX");
        const searchCriteria = ['UNSEEN'];
        const fetchOptions = {markSeen: true, bodies: ['HEADER', "TEXT"], struct: true};
        const messages = await connection.search(searchCriteria, fetchOptions);
        return Promise.all(messages.map(async(message) => {
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
        })).then((output)=>{
            connection.end();
            return output;
        });
    }
}

if(!global.classes){
    global.classes = {};
}
global.classes.IMAPClient = IMAPClient;

module.exports = IMAPClient;
