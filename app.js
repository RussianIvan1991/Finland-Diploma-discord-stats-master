const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const sessionExpress = require('express-session');
const MongoClient = require("mongodb").MongoClient;
const MongoStore = require('connect-mongo')(sessionExpress);
const log4js = require('log4js');
const discordBot = require('./discord-bot');

const app = express();

/**
 * Create server
 */

const server = require("http").createServer(app).listen(3000);
const sio = require('socket.io').listen(server);
const sioEvents = require('./socket')(sio, app);
app.locals.sio = sio;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// logger
const logger4js = log4js.getLogger();
logger4js.level = 'debug';
app.locals.logger4js = logger4js;

/**
 * MongoDB connect
 */

MongoClient.connect(process.env.MONGO_URL, {useUnifiedTopology: true})
    .then(client => {
        app.locals.mongoDb = client.db();
    }, err => {
        throw logger4js.error(err);
    });

/**
 * Session for app and socket
 */

const mongoStore = new MongoStore({
    url: process.env.MONGO_URL,
});

const session = sessionExpress({
    secret: process.env.SESSION_SECRET,
    secure: true,
    store: mongoStore,
    cookie: {maxAge: 64000000}
});

sio.use((socket, next) => {
    session(socket.request, socket.request.res, next);
});

app.use(session);

// TODO locals
app.use((req, res, next) => {
    app.locals.throwStatus = (message, status, err) => {
        if (typeof message === 'number') {
            if (status)
                logger4js.error(status);
            res.status(status);
        } else {
            if (err)
                logger4js.error(err);
            res.status(status).send(JSON.stringify(message));
        }
    };
    next();
});

// routes setup
app.use('/', require('./routes/index'));
app.use('/login', require('./routes/login'));
app.use('/logout', require('./routes/logout'));
app.use('/stats', require('./routes/stats'));
app.use('/dashboard', require('./routes/dashboard'));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');

    next();
});

module.exports = app;
