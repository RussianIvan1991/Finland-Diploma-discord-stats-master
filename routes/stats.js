const express = require('express');
const router = express.Router();
const discordBot = require('../discord-bot');

router.post('/', function (req, res, next) {
    let mongoDb = req.app.locals.mongoDb;
    let throwStatus = req.app.locals.throwStatus;
    let guildID = req.body.guildID;
    let channelID = req.body.channelID;
    let userID = req.session.user.id;

    if (!req.session.token) {
        throwStatus({error: 'Unauthorized'}, 401);
        return;
    }
    if (!guildID || !channelID) {
        throwStatus({error: 'Invalid parameters'}, 400);
        return;
    }
    if (!req.session.guilds[guildID]) {
        throwStatus({error: 'Invalid guild'}, 400);
        return;
    }
    if (!discordBot.checkGuildAvailability(guildID)) {
        throwStatus({error: 'Bot is not on the server'}, 400);
        return;
    }

    // TODO добавить проверку на то, находится ли юзер на сервере и может ли читать данный канал

    // check for active processes
    let filter = {
        userID: userID,
        active: true
    };
    mongoDb.collection('stats').findOne(filter)
        .then(res => {
            if (res) {
                throwStatus({error: 'Active process already exists'}, 400);
            }
        }, err => {
            throwStatus({error: 'Database error'}, 500, err);
        });

    // check the existence for current guild, channel
    filter = {
        userID: userID,
        guildID: guildID,
        channelID: channelID
    };
    mongoDb.collection('stats').findOne(filter)
        .then(res => {
            if (res) {
                if (res.active) {
                    throwStatus({error: 'Active process already exists'}, 400);
                } else {
                    updateProcess(res._id);
                }
            } else {
                addProcess();
            }
        }, err => {
            throwStatus({error: 'Database error'}, 500, err);
        });

    function updateProcess(id) {
        let timeStamp = new Date().getTime();
        let filter = {_id: id};
        let values = {
            $set: {
                startTime: timeStamp,
                active: true
            }
        };
        mongoDb.collection('stats').updateOne(filter, values)
            .then(res => {
                startMessagesAnalysis();
            }, err => {
                throwStatus({error: 'Database error'}, 500, err);
            });
    }

    function addProcess() {
        let timeStamp = new Date().getTime();
        let values = {
            userID: userID,
            guildID: guildID,
            channelID: channelID,
            startTime: timeStamp,
            active: true
        };

        mongoDb.collection('stats').insertOne(values)
            .then(res => {
                startMessagesAnalysis();
            }, err => {
                throwStatus({error: 'Database error'}, 500, err);
            });
    }
    
    function startMessagesAnalysis() {
        throwStatus({result: 'Process started'}, 200);
        discordBot.getChannelMessages(guildID, channelID, userID, req);
    }
});

module.exports = router;
