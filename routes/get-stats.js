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

    
});

module.exports = router;
