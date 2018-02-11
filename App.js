let express = require('express');
let socket = require('socket.io');
let http = require('http');
let url = require('url');
let path = require('path');

let gridSize = 5;
let tileCount = 100;
let players={};
let apple = { color: "red", x: tileCount / 2 + 5, y: tileCount / 2 + 5 };
let velocityLookup = {
    37: { x: -1, y: 0 },
    38: { x: 0, y: -1 },
    39: { x: 1, y: 0 },
    40: { x: 0, y: 1 }
};
let colors = ["magenta","lime","yellow","deeppink","aqua","snow"];

let getRandomColor = () => {
    let x = Math.floor(Math.random()*colors.length);
    return colors[x];
}
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



let app = express();

let server = http.createServer(app);

let session = require("express-session")({
    secret: "my-secret",
    resave: true,
    saveUninitialized: true
});
let sharedsession = require("express-socket.io-session");

// Use express-session middleware for express
app.use(session);

let io = require('socket.io').listen(server);
// Use shared session middleware for socket.io
// setting autoSave:true
io.use(sharedsession(session, {
    autoSave:true
}));


app.use(function(req, res, next){
  let page = url.parse(req.url).pathname;
  next();
})

.get('/',function(req,res){
  res.render('index.ejs', {gridSize: gridSize,tileCount: tileCount});
})

.use(function(req, res, next){
  let page = url.parse(req.url).pathname;
  res.sendFile(path.join(__dirname, page), {gridSize: gridSize, tileCount:tileCount});
})

server.listen(8080);

io.use(sharedsession(session, {
    autoSave:true
}));

io.sockets.on('connection', function (socket) {
    
    socket.on('disconnect', function() {
        if(socket.handshake.session!==undefined){
            delete players[socket.handshake.session.userdata];
        }
    });

  socket.on("login", function(userdata) {
      if(players[userdata]===undefined){
        let coords=getRandomCoords(tileCount);
        let velocity=getRandomVelo();
        let color=getRandomColor();
        players[userdata] = {coords, velocity:velocity ,trail:[],tail:2,color};
        socket.handshake.session.userdata = userdata;
        socket.handshake.session.save();
      }
    });

    socket.emit('gridSize', gridSize);
    socket.emit('tileCount', tileCount);
    socket.on('keyPush',function(keyPush){
      if(keyPush>=37 && keyPush<=40 && players[socket.handshake.session.userdata]!==undefined){
        newvelocity=getVelocityFromDirection(keyPush);
        if(players[socket.handshake.session.userdata].velocity.x*newvelocity.x==-1 || players[socket.handshake.session.userdata].velocity.y*newvelocity.y==-1){

        }
        else{
            players[socket.handshake.session.userdata].velocity = newvelocity;
        }
      }
    })
});

let game = () => {
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
              players[player].coords = getRandomCoords(tileCount);
          }
          for(player2 in players){
            if(player===player2){
                continue;
            }
            for(let i = 0; i < players[player2].trail.length; i++){
                if (players[player2].trail[i].x === players[player].coords.x && players[player2].trail[i].y === players[player].coords.y) {
                    players[player2].tail += players[player].tail;
                    players[player].tail = 2;
                    players[player].coords = getRandomCoords(tileCount);
                } 
            }
            if(players[player2].coords.x===players[player].coords.x && players[player2].coords.y === players[player].coords.y){
                players[player].tail = 2;
                players[player].coords = getRandomCoords(tileCount);
                players[player2].tail = 2;
                players[player2].coords = getRandomCoords(tileCount);
            }
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
