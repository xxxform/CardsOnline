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

app.get('/leave', (req, res) => {
    if (!req.cookies.username) {res.status(401).send('не авторизовано'); return}
    const room = rooms[req.query.roomId] || rooms.find(room => room.players.includes(req.cookies.username));
    if (!room) {res.status(404).send('комната не найдена'); return}
    const userIndex = room.users.indexOf(req.cookies.username);
    if (userIndex === -1) {res.status(404).send('пользователь не найден'); return}
    room.users.splice(userIndex, 1);
    res.send('OK');
});

WebSocketServer.on('connection', ws => {
    const user = { name: '', socket: null, room: null }; 
    //те у кого room null находятся в лобби. Посылать им обновление кол-ва игроков в комнатах

    ws.on('message', message => {
        message = JSON.parse(message);
        if (!message?.event) { 
            ws.send(JSON.stringify({event: 'error', data: 'event обязателен'}));
            return;
        }

        if (!user.socket && message.event === 'auth' && message.username) {
            if (!usersOnServer.find(({name}) => name === message.username)) { 
                ws.send(JSON.stringify({event: 'error', data: 'Имя занято'}));
                return;
            }
            user.username = message.username;
            user.socket = ws;
            usersOnServer.push(user);

            return ws.send(JSON.stringify({event: 'auth', data: 'ok'})); // todo поиск комнаты в которой юзер был до потери связи
        }

        if (!user.socket) return;

        ///////////////////////////////////////////////////////////////////////////

        if (message.event === 'roomList') {
            for (let room of rooms) { //присылаем список комнат
                ws.send(JSON.stringify({event: 'createRoom', data: {
                    id: room.id, 
                    user: room.players[0].name, 
                    password: room.password ? true : false
                }}));
            }
        }

        if (message.event === 'createRoom') {
            const room = rooms[rooms.push(new Game()) - 1];
            if (message.password?.length > 0) 
                room.password = message.password;
            
            for (let userTo of usersOnServer) 
                userTo.send(JSON.stringify({event: 'createRoom', data: user === userTo ? room.id : {
                    id: room.id, 
                    user: user.name, 
                    password: room.password ? true : false
                }}));
                
            ws.send(JSON.stringify({event: 'joinRoom', data: room.id})); //клиент перенаправляется в комнату
            user.room = room;
            return room.join(user);
        }

        if (message.event === 'join') {
            if (message.roomId) { 
                ws.send(JSON.stringify({event: 'error', data: 'укажите id комнаты'}));
                return;
            }

            const room = rooms[message.roomId];
            if (!room) {
                ws.send(JSON.stringify({event: 'error', data: 'комната не найдена'}));
                return;
            }
            if (room.password && room.password !== req.query.password) {
                ws.send(JSON.stringify({event: 'error', data: 'неверный пароль'}));
                return;
            }
            if (room.players.length > 5) {
                ws.send(JSON.stringify({event: 'error', data: 'комната заполнена'}));
                return;
            }

            ws.send(JSON.stringify({event: 'joinRoom', data: room.id}));
            user.room = room;
            return room.join(user); //клиент после получение ответа перенаправляется на роут /game?roomId=id
        }
 
        if (message.event === 'ready') {
            user.room.changeStatus(user);
            return;
        }
        if (message.event === 'leave') {
            user.room.leave(user);
            user.room = null;
        } 

        if (message.event === 'message') {

        }
    });
    
    ws.on('close', message => {
        usersOnServer.splice(usersOnServer.indexOf(user), 1);
        user.room.leave(user);
        //поиск комнат где есть юзер, дать событие room.disconnect(user);

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