const express = require('express');
const discordApi = require('../discord-api');
const router = express.Router();

router.get('/', function(req, res, next) {
    if (req.session.token) {
        req.session.destroy();
    }
    res.redirect('/');
});

module.exports = router;
