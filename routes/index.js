const express = require('express');
const router = express.Router();
const discordBot = require('../discord-bot');

router.get('/', function(req, res, next) {
  res.render('index', { title: 'DiscordStats', session: req.session });
});

module.exports = router;
