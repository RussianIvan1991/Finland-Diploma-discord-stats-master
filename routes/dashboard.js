const express = require('express');
const router = express.Router();
const fs = require('fs');
const discordApi = require('../discord-api');
const discordBot = require('../discord-bot');

router.get('/', function (req, res, next) {
    const mongoDb = req.app.locals.mongoDb;
    const throwStatus = req.app.locals.throwStatus;
    const logger4js = req.app.locals.logger4js;

    if (!req.session.token) {
        throwStatus(401);
        res.redirect('/');
        return;
    }

    let userID = req.session.user.id;
    let urls = discordApi.getUrls();
    let guilds = {};
    let channels = {};
    let stats = {};
    let request = {
        url: urls.guildsUrl,
        method: 'GET',
        token: req.session.token
    };
    discordApi.apiRequest(request)
        .then(async (result) => {
            for (let guild of result) {
                if (discordBot.checkGuildAvailability(guild.id)) {
                    guilds[guild.id] = guild;

                    channels[guild.id] = {};
                    for (let [channelID, channel] of discordBot.getGuildChannels(guild.id)) {
                        if (channel.type === 'text') {
                            channels[guild.id][channelID] = channel;
                            await checkStatsAvailability(guild.id, channelID)
                                .then(async (result) => {
                                    if (result) {
                                        stats[channelID] = {};

                                        let path = `./stats/${userID}/${guild.id}/${channelID}.json`;
                                        await fs.promises.readFile(path)
                                            .then(res => {
                                                stats[channelID] = JSON.parse(res.toString());
                                            }, err => {
                                                logger4js.error(err);
                                            });
                                    }
                                });
                        }
                    }
                }
            }

            req.session.guilds = guilds;
            req.session.channels = channels;
            req.session.stats = stats;
        }, () => {
            guilds = req.session.guilds;
            channels = req.session.channels;
            stats = req.session.stats;
        })
        .finally(() => {
            res.render('dashboard', {
                title: 'DiscordStats',
                session: req.session,
                guilds: guilds,
                channels: channels,
                stats: stats
            });
        });

    function checkStatsAvailability(guildID, channelID) {
        return new Promise((resolve) => {
            let filter = {
                userID: userID,
                guildID: guildID,
                channelID: channelID,
                active: false
            };
            mongoDb.collection('stats').findOne(filter)
                .then(res => {
                    if (res) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                }, err => {
                    throwStatus({error: 'Database error'}, 500, err);
                });
        });
    }
});

module.exports = router;
