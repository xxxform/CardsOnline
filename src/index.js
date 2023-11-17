const EventEmitter = require('node:events');
const ws = require('ws');
const path = require('path');
const WebSocketServer = new ws.Server({
    port: 5000
}, () => console.log('WebSocket created'));
console.log(path.resolve(__dirname + '/../dist'))
const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const Game = require('./Game.js');

app.use(express.static(path.resolve(__dirname + '/../dist')));

app.use(bodyParser.json());
app.use(cookieParser('issecret'));

const usersOnServer = [];
const rooms = [];



app.get('/auth', (req, res) => {
    if (req.cookies.username) { res.send('авторизовано'); return}
    if (req.query.username) {
        const existedUser = usersOnServer.find(user => user.name === req.query.username);
        if (existedUser || req.query.username[0] === '_') {
            res.status(400).send('Введите другое имя');
            return;
        }
        usersOnServer.push({username: req.query.username, socket: null, room: null});
        res.cookie('username', req.query.username);
        res.send('OK');
    } else {
        res.send('Укажите имя');
    }
});

app.get('/rooms', (req, res) => {
    if (!req.cookies.username) {res.status(401).send('не авторизовано'); return}

    res.json(rooms.map((room, index) => ({
        index, 
        user: room.players[0].name, 
        password: room.password ? true : false
    })))
});

app.get('/leave', (req, res) => {
    if (!req.cookies.username) {res.status(401).send('не авторизовано'); return}
    const room = rooms[req.query.roomId] || rooms.find(room => room.players.includes(req.cookies.username));
    if (!room) {res.status(404).send('комната не найдена'); return}
    const userIndex = room.users.indexOf(req.cookies.username);
    if (userIndex === -1) {res.status(404).send('пользователь не найден'); return}
    room.users.splice(userIndex, 1);
    res.send('OK');
});

app.get('/createRoom', (req, res) => {
    if (!req.cookies.username) {res.status(401).send('не авторизовано'); return}

    const room = rooms[rooms.push(new Game(
        
    )) - 1];

    if (req.query.password?.length > 0) room.password = req.query.password

    res.send(rooms.length - 1);
});

app.get('/join', (req, res) => {
    if (!req.cookies.username) {res.status(401).send('не авторизовано'); return}
    if (!req.query.roomId) {res.status(400).send('укажите id комнаты'); return}

    const user = usersOnServer.find(user => user.username === req.query.username);
    const room = rooms[req.query.roomId];
    if (!room) {res.status(404).send('комната не найдена'); return}
    if (room.password && room.password !== req.query.password) {res.status(403).send('неверный пароль'); return}
    if (room.players.length > 5) {res.status(406).send('комната заполнена'); return}

    res.send(req.query.roomId);
    room.join(user);
    
    //клиент после получение ответа перенаправляется на роут /game?roomId=id
});

WebSocketServer.on('connection', ws => {
    const user = { username: '', socket: null, room: null }; 
    //те у кого room null находятся в лобби. Посылать им обновление кол-ва игроков в комнатах

    ws.on('message', message => {
        message = JSON.parse(message);
        if (!message?.event){ws.send(JSON.stringify({event: 'error', data: 'event обязателен'})); return}

        if (!user.socket && message.event === 'auth') {
            if (!username || !usersOnServer.includes(message.username)) {ws.send(JSON.stringify({event: 'error', data: 'имя пользователя обязательно'})); return}
            user.username = message.username;
            user.socket = ws;
            // todo поиск комнаты в которой юзер был до потери связи
        }
        if (!user.socket) return;
 
        if (message.event === 'ready') {
            user.room
        }
        if (message.event === 'leave') {

        } else 
        if (message.event === 'message') {

        }
    });
    
    ws.on('close', message => {
        if (message.wasClean) {
            alert(`[close] Соединение закрыто чисто, код=${message.code} причина=${message.reason}`);
          } else {
            user.socket = new EventEmitter();
            user.socket.on('connect', socket => {
                user.socket = ws;
            });
            //теперь 
            // например, сервер убил процесс или сеть недоступна
            // обычно в этом случае event.code 1006
            //alert('[close] Соединение прервано');

          } 
    });
})


/*
const lostConnectionUser = room.users.find(userInRoom => userInRoom === user);
if (lostConnectionUser) {
    lostConnectionUser.socket.emit('connect', ws);
    ws.send(JSON.stringify({ event: 'ok', data: 'соединение восстановлено' }));
    return;
}
*/


app.listen(80);