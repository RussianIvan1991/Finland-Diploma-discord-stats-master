const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity('who am I? 🤔');
});

client.on('message', msg => {
    //console.log(msg);
});

client.login(process.env.DISCORD_BOT_TOKEN);

class DiscordBot {

    static checkGuildAvailability(guildID) {
        return client.guilds.get(guildID);
    }

    static checkChannelAvailability(guildID, channelID) {
        // TODO
    }

    static getGuildChannels(guildID) {
        return client.guilds.get(guildID).channels;
    }

    static getChannelMessages(guildID, channelID, userID, req) {
        let mongoDb = req.app.locals.mongoDb;
        let logger4js = req.app.locals.logger4js;
        let sio = req.app.locals.sio;
        let guild = client.guilds.get(guildID);
        let channel = guild.channels.get(channelID);
        let textChannel = new Discord.TextChannel(guild, channel);
        let messagesList = {
            guildID: guildID,
            channelID: channelID,
            emoji: [],
            emojiUnsorted: {},
            words: [],
            wordsUnsorted: {},
            urls: []
        };
        let counter = 0;
        let lastMessage;
        fetchMessages();

        function fetchMessages(messageID) {
            textChannel.fetchMessages({limit: 100, before: messageID}).then((collection) => {
                //console.log(`${collection.size} | ${counter}`);

                for (let [key, value] of collection) {
                    let string = value.content;

                    // regex discord custom emoji
                    let emojiRegex = /<:.*?:\d*>/gm;
                    string = string.replace(emojiRegex, (match) => {
                        if (messagesList.emojiUnsorted[match])
                            messagesList.emojiUnsorted[match]++;
                        else
                            messagesList.emojiUnsorted[match] = 1;

                        return '';
                    });

                    // regex default emoji
                    emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;
                    string = string.replace(emojiRegex, (match) => {
                        if (messagesList.emojiUnsorted[match])
                            messagesList.emojiUnsorted[match]++;
                        else
                            messagesList.emojiUnsorted[match] = 1;

                        return '';
                    });

                    // regex urls
                    let urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
                    string = string.replace(urlRegex, (match) => {
                        messagesList.urls.push(match);

                        return '';
                    });

                    // regex words
                    let spacesRegex = /\s\s+/g;
                    string = string.replace(spacesRegex, ' ');
                    string = string.split(' ');
                    string.forEach(val => {
                        if (val === '')
                            return;
                        if (messagesList.wordsUnsorted[val])
                            messagesList.wordsUnsorted[val]++;
                        else
                            messagesList.wordsUnsorted[val] = 1;
                    });
                }
                counter++;
                lastMessage = collection.last();

                if (collection.size < 100) {
                    let wordsSorted = sortObjectToArray(messagesList.wordsUnsorted);
                    wordsSorted.forEach(word => {
                        messagesList.words.push({
                            word: word,
                            num: messagesList.wordsUnsorted[word]
                        });
                    });
                    delete messagesList.wordsUnsorted;

                    let emojiSorted = sortObjectToArray(messagesList.emojiUnsorted);
                    emojiSorted.forEach(emoji => {
                        messagesList.emoji.push({
                            emoji: emoji,
                            num: messagesList.emojiUnsorted[emoji]
                        });
                    });
                    delete messagesList.emojiUnsorted;

                    writeMessages();
                    console.log('END');

                    let timeStamp = new Date().getTime();
                    let filter = {
                        userID: userID,
                        guildID: guildID,
                        channelID: channelID
                    };
                    let values = {
                        $set: {
                            endTime: timeStamp,
                            active: false
                        }
                    };
                    mongoDb.collection('stats').updateOne(filter, values)
                        .catch(err => {
                            logger4js.error(err);
                        });

                    console.log(req.app.locals.sioUsers);

                    for (let socketID in req.app.locals.sioUsers[req.session.id]) {
                        sio.to(socketID).emit('statsEnd', messagesList);
                    }

                    return;
                }

                fetchMessages(collection.lastKey());
            });
        }

        function sortObjectToArray(obj) {
            let sorted = Object.keys(obj).sort((a, b) => {
                return obj[a] - obj[b];
            });

            return sorted.reverse();
        }

        function writeMessages() {
            let path = `./stats/${userID}/${guildID}`;
            fs.promises.mkdir(path, {recursive: true})
                .then(() => {
                    fs.promises.writeFile(`${path}/${channelID}.json`, JSON.stringify(messagesList))
                        .catch(err => {
                            logger4js.error(err);
                        });
                }, err => {
                    logger4js.error(err);
                });
        }
    }
}

module.exports = DiscordBot;
