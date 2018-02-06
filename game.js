//Viewable Board
let canvas, context;

//Setting up the grid
let gridSize;
let tileCount;

//Object co-ords

//Player state

//arrow keys with movement coords
let velocityLookup = {
    37: { x: -1, y: 0 },
    38: { x: 0, y: -1 },
    39: { x: 1, y: 0 },
    40: { x: 0, y: 1 }
};

var socket = io.connect('http://localhost:8080');
socket.on('gridSize', function(value) {
    gridSize=value;
});
socket.on('tileCount', function(value) {
    tileCount=value;
});
socket.on('apple',function({color,x,y}){
  drawApple({color, x,y});
})
socket.on('players',function(players){

    context.fillStyle = "black";
    context.fillRect(0, 0, canvas.width, canvas.height);
    for(player in players){
      context.fillStyle = "lime";
      for (let i = 0; i < players[player].trail.length; i++) {
          context.fillRect(players[player].trail[i].x * gridSize, players[player].trail[i].y * gridSize, gridSize - 2, gridSize - 2);
      }
    }
})

window.onload = () => {
    //Board, Events, Game timer.
    canvas = document.getElementById("cnvs");
    context = canvas.getContext("2d");
    document.addEventListener("keydown", keyPush);
    var txt;
    var person = prompt("Please enter your login:");
    if (person == null || person == "") {
        txt = "User cancelled the prompt.";
    } else {
        txt = "Hello " + person + "! How are you today?";
    }
    socket.emit('login',person);

}

//Drawing a food object, that contains the color to draw and the coordinates.
let drawApple = ({ color, x, y }) => {
    context.fillStyle = color;
    context.fillRect(x * gridSize, y * gridSize, gridSize - 0, gridSize - 0);
}

//Main game loop

let keyPush = (event) => {
    socket.emit('keyPush',event.keyCode);
};
