var express = require('express');
var session = require('cookie-session');
var socket = require('socket.io');
var http = require('http');
var url = require('url');
var querystring = require('querystring');

let gridSize = 5;
let tileCount = 50;
let players={};
let apple = { color: "red", x: tileCount / 2 + 5, y: tileCount / 2 + 5 };
let velocityLookup = {
    37: { x: -1, y: 0 },
    38: { x: 0, y: -1 },
    39: { x: 1, y: 0 },
    40: { x: 0, y: 1 }
};


let getRandomCoords = (boundary) => {
    let x = Math.floor(Math.random() * boundary);
    let y = Math.floor(Math.random() * boundary);
    return { x: x, y: y };
};

let getRandomVelo = () => {
    let x = Math.floor(Math.random()*2);
    let y;
    if(x==0){
      y=1;
    }
    else{
      y=0;
    }
    return { x: x, y: y };
};

let getVelocityFromDirection = (keyCode) => {
    let lookup = velocityLookup[keyCode];
    if (lookup)
        return {x:lookup.x, y:lookup.y};
};



var app = express();

var server = http.createServer(app);

var session = require("express-session")({
    secret: "my-secret",
    resave: true,
    saveUninitialized: true
});
var sharedsession = require("express-socket.io-session");

// Use express-session middleware for express
app.use(session);

var io = require('socket.io').listen(server);
// Use shared session middleware for socket.io
// setting autoSave:true
io.use(sharedsession(session, {
    autoSave:true
}));


app.use(function(req, res, next){
  var page = url.parse(req.url).pathname;
  next();
})

.get('/',function(req,res){
  res.render('index.ejs', {gridSize: gridSize,tileCount: tileCount});
})

.use(function(req, res, next){
  var page = url.parse(req.url).pathname;
  res.sendFile(__dirname+"\\"+page, {gridSize: gridSize, tileCount:tileCount});
})

server.listen(8080);

io.use(sharedsession(session, {
    autoSave:true
}));
// Quand un client se connecte, on le note dans la console
io.sockets.on('connection', function (socket) {
  socket.on("login", function(userdata) {
    console.log(userdata + "logged in");
      let coords={x:1,y:1};
      let velocity={x:1,y:0};
      Object.assign(coords,getRandomCoords(tileCount));
      Object.assign(velocity,getRandomVelo());
      players[userdata] = {coords, velocity:velocity ,trail:[],tail:2};
      socket.handshake.session.userdata = userdata;
      socket.handshake.session.save();
    });

    socket.emit('gridSize', gridSize);
    socket.emit('tileCount', tileCount);
    socket.on('keyPush',function(keyPush){
      if(keyPush>=37 && keyPush<=40 && players[socket.handshake.session.userdata]!==undefined){
        players[socket.handshake.session.userdata].velocity = getVelocityFromDirection(keyPush);
      }
    })
    // Quand le serveur reçoit un signal de type "message" du client
});
let i =0;
let game = () => {
    i++;
    //Movement
    for(player in players){
      players[player].coords.x+=players[player].velocity.x;
      players[player].coords.y+=players[player].velocity.y;
      if (players[player].coords.x < 0) {
          players[player].coords.x = tileCount - 1;
      }
      if (players[player].coords.x > tileCount - 1) {
          players[player].coords.x = 0;
      }
      if (players[player].coords.y< 0) {
          players[player].coords.y = tileCount - 1;
      }
      if (players[player].coords.y > tileCount - 1) {
          players[player].coords.y = 0;
      }


      for (let i = 0; i < players[player].trail.length; i++) {
          if (players[player].trail[i].x === players[player].coords.x && players[player].trail[i].y === players[player].coords.y) {
              players[player].tail = 2;
          }
      }
      players[player].trail.push({ x: players[player].coords.x, y: players[player].coords.y });
      while (players[player].trail.length > players[player].tail) {
          players[player].trail.shift();
      }
      if (apple.x === players[player].coords.x && apple.y === players[player].coords.y) {
          players[player].tail++;
          Object.assign(apple, getRandomCoords(tileCount));
      }
    }
    io.local.emit('players',players);
    io.local.emit('apple',apple);
};

setInterval(game, 1000 / (10 + 5));
