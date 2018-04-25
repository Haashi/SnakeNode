//Viewable Board
let canvas, context;

//Setting up the grid
let gridSize;
let tileCount;
let userdata;
let me;
//Object co-ords

//Player state

//arrow keys with movement coords
let velocityLookup = {
    37: { x: -1, y: 0 },
    38: { x: 0, y: -1 },
    39: { x: 1, y: 0 },
    40: { x: 0, y: 1 }
};

var socket = io.connect('http://haashi.fr:8080');
socket.on('gridSize', function(value) {
    gridSize=value;
});
socket.on('tileCount', function(value) {
    tileCount=value;
});
socket.on('apples',function(apples){
    for(apple in apples){
        drawApple(apples[apple]);
    }
})
socket.on('players',function(players){
    me = players[userdata];
    if(me===undefined){
        context.fillStyle = "black";
        context.fillRect(0, 0, canvas.width, canvas.height);
        for(player in players){
            context.fillStyle = players[player].color;
            for (let i = 0; i < players[player].trail.length; i++) {
                context.fillRect(players[player].trail[i].x * gridSize, players[player].trail[i].y * gridSize, gridSize - 2, gridSize - 2);
            }
        }
    }
    else{
        context.fillStyle = "white";
        context.fillRect(0,0, canvas.width, canvas.height);
        context.fillStyle = "black";
        let rectX;
        let sizeX=tileCount*gridSize;
        let sizeY=tileCount*gridSize;
        if(me.coords.x*gridSize<canvas.width/2){
            rectX=canvas.width/2-me.coords.x*gridSize;
        }
        else{
            rectX=0;
            sizeX=canvas.width/2+(tileCount-me.coords.x)*gridSize;
        }
        let rectY;
        if(me.coords.y*gridSize<canvas.height/2){
            rectY=canvas.height/2-me.coords.y*gridSize;
        }
        else{
            rectY=0;
            sizeY=canvas.height/2+(tileCount-me.coords.y)*gridSize;
        }
        context.fillRect(rectX,rectY,sizeX,sizeY);
        context.fillStyle = me.color;
        context.fillRect(canvas.width/2,canvas.height/2,gridSize - 2, gridSize - 2);
        for (let i = 0; i < me.trail.length; i++) {
            context.fillRect(canvas.width/2+(me.trail[i].x-me.coords.x) * gridSize, canvas.height/2+(me.trail[i].y-me.coords.y) * gridSize, gridSize, gridSize);
        }
        for(player in players){
            context.fillStyle = players[player].color;
            context.font = "10px Arial";
            context.fillText(player,canvas.width/2+(players[player].coords.x-me.coords.x)*gridSize,canvas.height/2+(players[player].coords.y-me.coords.y)*gridSize);
            if (players[player]==me){
                continue;
            }
            for (let i = 0; i < players[player].trail.length; i++) {
                context.fillRect(canvas.width/2+(players[player].trail[i].x-me.coords.x) * gridSize, canvas.height/2+(players[player].trail[i].y-me.coords.y) * gridSize, gridSize, gridSize);
            }
        }
    }
    
})

window.onload = () => {
    //Board, Events, Game timer.
    canvas = document.getElementById("cnvs");
    context = canvas.getContext("2d");
    canvas.width = window.innerWidth/2;
    canvas.height = window.innerHeight/2;
    document.addEventListener("keydown", keyPush);
    document.addEventListener("keyup", keyRelease);
    var txt;
    var person = prompt("Please enter your login:");
    if (person == null || person == "") {
        txt = "User cancelled the prompt.";
    } else {
        txt = "Hello " + person + "! How are you today?";
        userdata=person;
    }
    socket.emit('login',person);

}

//Drawing a food object, that contains the color to draw and the coordinates.
let drawApple = ({ color, x, y }) => {
    context.fillStyle = color;
    if(me===undefined){
        context.fillRect(x*gridSize, y * gridSize, gridSize - 0, gridSize - 0);
    }
    else{
        context.fillRect(canvas.width/2+(x-me.coords.x)*gridSize,canvas.height/2+(y-me.coords.y)*gridSize,gridSize,gridSize);
    }
    
}

//Main game loop

let keyPush = (event) => {
    socket.emit('keyPush',event.keyCode);
};

let keyRelease = (event) =>{
    socket.emit('keyRelease',event.keyCode);
}
