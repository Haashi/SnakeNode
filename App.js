let fs=require('fs')
let express = require('express');
let socket = require('socket.io');
let http = require('http');
let url = require('url');
let path = require('path');
var childProcess = require('child_process');
let gridSize = 5;
let tileCount = 60;
let players={};
let velocityLookup = {
    37: { x: -1, y: 0 },
    81: { x: -1, y: 0 },
    65: { x: -1, y: 0 },
    38: { x: 0, y: -1 },
    90: { x: 0, y: -1 },
    87: { x: 0, y: -1 },
    39: { x: 1, y: 0 },
    68: { x: 1, y: 0 },
    40: { x: 0, y: 1 },
    83: { x: 0, y: 1 }
};
let bodyParser = require('body-parser');
let colors = ["magenta","lime","yellow","deeppink","aqua","snow"];
let apples = [];
let nbPlayer=0;

let newApple=()=>{
    let apple={ color: "red"};
    Object.assign(apple, getRandomCoords(tileCount));
    apples.push(apple);
}

let processTick = (player) => {
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
                    players[player2].tail += players[player].tail/2;
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
    for(apple in apples){
        if (apples[apple].x === players[player].coords.x && apples[apple].y === players[player].coords.y) {
            players[player].tail++;
            apples.splice(apple,1);
        }
    }
}

let getRandomColor = () => {
    let x = Math.floor(Math.random()*colors.length);
    return colors[x];
}
let getRandomCoords = (boundary) => {
    let x = Math.floor(Math.random() * boundary);
    let y = Math.floor(Math.random() * boundary);
    let ok=true;
    for(player in players){
        for (let i = 0; i < players[player].trail.length; i++) {
            if(players[player].trail[i].x===x&&players[player].trail[i].y===y){
                ok=false;
                break;
            }
        }
        if(!ok){
            break;
        }
    }
    if(ok){
        for(apple in apples){
            if(apples[apple].x===x&&apples[apple].y===y){
                ok=false;
                break;
            }
        }
    }
    if(ok){
        return { x: x, y: y };
    }
    return getRandomCoords(boundary);
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

app.use(bodyParser.json());

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

.post("/webhooks/github", function (req, res) {
        deploy(res);
})

.get('/',function(req,res){
  res.render('index.ejs', {gridSize: gridSize,tileCount: tileCount});
})

.use(function(req, res, next){
  let page = url.parse(req.url).pathname;
  res.sendFile(path.join(__dirname, page), {gridSize: gridSize, tileCount:tileCount});
})

server.listen(21035, function(){
console.log('listening')});

io.use(sharedsession(session, {
    autoSave:true
}));

io.sockets.on('connection', function (socket) {
    
    socket.on('disconnect', function() {
        if(socket.handshake.session!==undefined){
            if(players[socket.handshake.session.userdata]!==undefined){
                nbPlayer--;
                changeAppleSpawnRate();
            }
            delete players[socket.handshake.session.userdata];
        }
    });

  socket.on("login", function(userdata) {
      if(players[userdata]===undefined){
        let coords=getRandomCoords(tileCount);
        let velocity=getRandomVelo();
        let color=getRandomColor();
        nbPlayer++;
        players[userdata] = {coords, velocity:velocity ,trail:[],tail:2,color};
        socket.handshake.session.userdata = userdata;
        socket.handshake.session.save();
        changeAppleSpawnRate();
      }
    });

    socket.emit('gridSize', gridSize);
    socket.emit('tileCount', tileCount);
    socket.on('keyRelease',function(keyRelease){
        if(keyRelease==32){
            players[socket.handshake.session.userdata].sprint=false;
        }
    });
    socket.on('keyPush',function(keyPush){
      if(keyPush==32){
          players[socket.handshake.session.userdata].sprint=true;
      }
      if(((keyPush>=37 && keyPush<=40)||(keyPush===65||keyPush===87||keyPush===81||keyPush===85||keyPush===90||keyPush===68||keyPush===83)&& players[socket.handshake.session.userdata]!==undefined)){
        newvelocity=getVelocityFromDirection(keyPush);
        if(players[socket.handshake.session.userdata].velocity.x*newvelocity.x==-1 || players[socket.handshake.session.userdata].velocity.y*newvelocity.y==-1 || players[socket.handshake.session.userdata].velocity.canChange==false){

        }
        else{
            players[socket.handshake.session.userdata].velocity = newvelocity;
            players[socket.handshake.session.userdata].velocity.canChange=false;
        }
      }
    });
});
let tick = 0;

let game = () => {
    tick++;
    for(player in players){
        if(players[player].sprinted===undefined){
            players[player].sprinted=0;
        }
        players[player].velocity.canChange=true;
        if(tick%2){
            if(players[player].sprint){
                if(players[player].tail>2){
                    players[player].sprinted++;
                    if(players[player].sprinted%10==0){
                        players[player].tail--;
                        players[player].sprinted=0;
                    }
                    processTick(player);
                }
            }
        }
        processTick(player); 
    }
    io.local.emit('game',{players:players,apples:apples});
};

setInterval(game, 1000/(15));

let spawnRate;

let changeAppleSpawnRate= ()=>{
    console.log(nbPlayer);
    if(nbPlayer>0){
        if(spawnRate!==undefined){
            clearInterval(spawnRate);
        }
        spawnRate=setInterval(newApple, 3000/(nbPlayer));
    }
    else{
        if(spawnRate!==undefined){
            clearInterval(spawnRate);
        }
    }

}

function deploy(res){
    res.sendStatus(200);
    childProcess.exec('cd /opt/SnakeNode && ./deploy.sh', function(err, stdout, stderr){
      });
}
