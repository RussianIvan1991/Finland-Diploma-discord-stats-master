const express = require('express');
const router = express.Router();
const discordApi = require('../discord-api');

router.get('/', function(req, res, next) {
    if (!req.query.code && !req.session.token) {
        let api = new discordApi(req, res);
        api.login();
    } else if (req.query.code && !req.session.token) {
        let api = new discordApi(req, res);
        api.getUserAfterLogin(req.query.code);
    } else {
        res.redirect('/');
    }
});

module.exports = router;
