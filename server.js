require('dotenv').config();

const express = require("express");
const app = express();

const http = require('http');
const server = http.createServer(app);

// const https = require('https');
// const fs = require('fs');
// const options = {
//     key: fs.readFileSync('server.key'),
//     cert: fs.readFileSync('server.cert')
// };
// const server = https.createServer(options, app);

const port = process.env.PORT || 5000;

app.set('view engine', 'ejs');
app.use(express.static('public'));

const socketio = require('socket.io');
const io = socketio(server, {
    cors: {
        origin: '*',
        // methods: ['GET', 'POST']
    }
});

const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
    debug: true
});
app.use("/peerjs", peerServer);
// console.log(peerServer);

app.get("/", (req, res) => {
    res.render('login');
});

const { v4: uuidv4 } = require('uuid');
app.get('/create', (req, res) => {
    res.redirect(`/${uuidv4()}`);
});

app.get('/:room', (req, res) => {
    res.render("room", { roomId: req.params.room });
});

io.on('connection', socket => {
    socket.on('join-room', (roomId, userId, userName) => {
        console.log('User joined:', userName);
        socket.join(roomId);
        setTimeout(() => {
            socket.broadcast.to(roomId).emit('user-connected', userId, userName);
        }, 1000)

        socket.on('message', (message, userName) => {
            io.to(roomId).emit('createMessage', message, userName);
        });

        socket.on('custom-disconnect', () => {
            socket.broadcast.to(roomId).emit('user-disconnected', userId, userName);
        });

        socket.on('toggle-mic', (roomId, userId, userName, isEnabled) => {
            socket.broadcast.to(roomId).emit('user-toggled-mic', userId, userName, isEnabled);
        });

        socket.on('toggle-cam', (roomId, userId, userName, isEnabled) => {
            socket.broadcast.to(roomId).emit('user-toggled-cam', userId, userName, isEnabled);
        });
    });
});

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
