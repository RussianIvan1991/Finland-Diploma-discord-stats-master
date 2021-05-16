const clientId = process.env.DISCORD_CLIENT_ID;
const clientSecret = process.env.DISCORD_CLIENT_SECRET;

const apiBaseUrl = 'https://discordapp.com/api';
const urls = {
    authorizeUrl: `${apiBaseUrl}/oauth2/authorize`,
    revokeUrl: `${apiBaseUrl}/oauth2/token/revoke`,
    tokenUrl: `${apiBaseUrl}/oauth2/token`,
    userUrl: `${apiBaseUrl}/users/@me`,
    guildsUrl: `${apiBaseUrl}/users/@me/guilds`,
    guildChannelsUrl: `${apiBaseUrl}/guilds/{guild.id}/channels`
};

const url = require('url');
const request = require('request');

/**
 * Класс для работы с API Discord
 */
class DiscordApi {
    /**
     * В класс обязательно должны быть переданы параметры
     * req и res
     * @param req
     * @param res
     */
    constructor(req, res) {
        this.req = req;
        this.res = res;
        this.urls = urls;
        this.mongoDb = req.app.locals.mongoDb;
        this.logger4js = req.app.locals.logger4js;
    }

    static getUrls() {
        return urls;
    }

    /**
     * Редирект на страницу авторизации
     */
    login() {
        this.res.redirect(url.format({
            pathname: urls.authorizeUrl,
            query: {
                client_id: clientId,
                response_type: 'code',
                scope: 'identify guilds'
            }
        }));
    }

    /**
     * Метод для отправки запросов
     * @param req
     * @return Promise
     */
    static apiRequest(req) {
        return new Promise((resolve, reject) => {
            let requiredHeaders = {
                'Accept': 'application/json'
            };
            if (req.token)
                requiredHeaders['Authorization'] = 'Bearer ' + req.token;
            if (req.headers)
                Object.assign(requiredHeaders, req.headers);

            let requiredFormParams;
            if (req.method !== 'GET') {
                requiredFormParams = {
                    grant_type: 'authorization_code',
                    client_id: clientId,
                    client_secret: clientSecret
                };
                if (req.form)
                    Object.assign(requiredFormParams, req.form);
            }

            let requestParams = {
                url: req.url,
                method: req.method,
                headers: requiredHeaders,
                form: requiredFormParams
            };

            request(requestParams, (err, res, body) => {
                if (err) {
                    reject(err);
                } else {
                    let result = JSON.parse(body);

                    if (result.message)
                        reject(result);
                    else
                        resolve(result);
                }
            });
        });
    }

    throwErrorAndRedirect(err) {
        this.logger4js.warn(err);
        this.res.redirect('/');
    }

    /**
     * Метод получает токен и информацию о юзере и его серверах
     * после авторизации
     * @param code
     */
    getUserAfterLogin(code) {
        let _this = this,
            token,
            user;

        let req = {
            url: urls.tokenUrl,
            method: 'POST',
            form: {code: code}
        };
        DiscordApi.apiRequest(req)
            .then(getToken, _this.throwErrorAndRedirect);

        function getToken(res) {
            token = res.access_token;

            req = {
                url: urls.userUrl,
                method: 'GET',
                token: token
            };
            DiscordApi.apiRequest(req)
                .then(getUser, _this.throwErrorAndRedirect);
        }

        function getUser(res) {
            user = res;

            checkUserExistence();
        }

        function checkUserExistence() {
            _this.mongoDb.collection('users').findOne({discordId: user.id}, {projection: {_id: 1}})
                .then(res => {
                    if (res)
                        createOrUpdateUser(res._id);
                    else
                        createOrUpdateUser();
                }, err => {
                    _this.throwErrorAndRedirect(err);
                });
        }

        function createOrUpdateUser(userId) {
            let timeStamp = new Date().getTime(),
                filter,
                values;

            if (userId) {
                // update user
                filter = {_id: userId};
                values = {$set: {lastLogin: timeStamp}};
                _this.mongoDb.collection('users').updateOne(filter, values)
                    .then(res => {
                        userSuccess();
                    }, err => {
                        _this.throwErrorAndRedirect(err);
                    });
            } else {
                // create user
                values = {
                    discordId: user.id,
                    firstLogin: timeStamp,
                    lastLogin: timeStamp
                };
                _this.mongoDb.collection('users').insertOne(values)
                    .then(res => {
                        userSuccess();
                    }, err => {
                        _this.throwErrorAndRedirect(err);
                    });
            }

            function userSuccess() {
                _this.req.session.token = token;
                _this.req.session.user = user;

                _this.res.redirect('/');
            }
        }
    }
}

module.exports = DiscordApi;
