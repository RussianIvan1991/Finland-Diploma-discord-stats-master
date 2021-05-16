module.exports = (sio, app) => {
    app.locals.sioUsers = {};
    sio.on('connection', socket => {
        let sessionID = socket.request.session.id;

        if (!app.locals.sioUsers[sessionID]) {
            app.locals.sioUsers[sessionID] = {};
            app.locals.sioUsers[sessionID][socket.id] = socket.id;
        } else {
            app.locals.sioUsers[sessionID][socket.id] = socket.id;
        }
        console.log(app.locals.sioUsers);

        socket.on('disconnect', () => {
            delete app.locals.sioUsers[sessionID][socket.id];
            console.log(app.locals.sioUsers);
        });
    });
};
