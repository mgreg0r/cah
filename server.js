/* Cards Against Humanity
 * Node.js server
 * author: Marcin Gregorczyk */

// Includes
var express = require("express"),
    socketio = require("socket.io"),
    USER = require('./user').USER,
    ROOM = require('./room').ROOM;

var MOTD = '[SERVER] Cards Against Humanity by MGregor v.0.3 - play on your own risk.';

// Http file server configuration
var appConfig = {
  staticPath: __dirname +'/public'
};


// Global game variables
var users = [],
    rooms = [],
    whites = [],
    blacks = [];


// Card database setup
var whiteFile = require('readline').createInterface({
  input: require('fs').createReadStream('./whitecards.ofm'),
  terminal: false
});

var blackFile = require('readline').createInterface({
  input: require('fs').createReadStream('./blackcards.ofm'),
  terminal: false
});

whiteFile.on('line', function(line) {
  whites.push(line);
});

blackFile.on('line', function(line) {
  blacks.push(line);
});


// Cards randomization

exports.getRandomWhite = function(usedIndexes) {
  var tries = 10;
  var index = Math.floor(Math.random()*whites.length);
  while(usedIndexes[index] && tries > 0) {
    index = Math.floor(Math.random()*whites.length);
    tries--;
  }
  usedIndexes[index] = true;
  return whites[index];
};

var getRandomBlack = function(usedIndexes) {
  var tries = 10;
  var index = Math.floor(Math.random()*blacks.length);
  while(usedIndexes[index] && tries > 0) {
    index = Math.floor(Math.random()*blacks.length);
    tries--;
  }
  usedIndexes[index] = true;
  return blacks[index];	
};

// Server setup
var app = express();
var server = require('http').createServer(app);
var io = socketio.listen(server);

app.use(express.static(appConfig.staticPath));
app.use(function(req, res, next) {
  res.send('404');
});

function handler(request, response) {
  request.addListener('end', function() {
    fileServer.serve(request, response);
  });
}

server.listen(1995);


// Lobby management functions

function addUser(newUser) {
  if(newUser == null)
    return false;
    
  var id = -1;
  for(var i = 0; i < users.length; i++) {
    if(users[i] == null) {
      id = i;
      break;
    }
  }
  if(id == -1) {
    id = users.length;
    users.push(newUser);
  }
  else {
    users[id] = newUser;
  }
  newUser.setId(id);
  return true;
}

function disconnectUser(user) {
  if(user == null)
    return false;

  var username = user.getId();
  if(user.getName() != '') username += ' (' +user.getName() + ')';
    
  if(user.inRoom())
    leaveRoom(user);

  if(user.inLobby())
    leaveLobby(user);

  var id = user.getId();
  users[id] = null;
  console.log('user#' +username + ' disconnected');
  return true;
}

function leaveLobby(user) {
  if(user == null || !user.inLobby())
    return false;
  sendMessageToLobby('<div style="color:blue">' +parseTime() +user.getName() +' left server.</div>');  
  user.setName('');
  user.send('leaveLobby', {});
  updateUsersInLobby();
  return true;
}

function createRoom(roomName, creator) {
  if(creator == null || !creator.inLobby() || !validateRoomName(roomName))
    return null;  

  var newRoom = new ROOM(roomName);
  rooms.push(newRoom);
  updateRoomsList();
  return newRoom;
}

function deleteRoomByName(roomName) {
  var target = null;
  var id;
  for(var i = 0; i < rooms.length; i++) {
    if(roomName == rooms[i].getName()) {
      target = rooms[i];
      id = i;
      break;
    }
  }
    
  if(target == null)
    return false;
    
  target.removeAllPlayers();
  rooms.splice(id, 1);
  updateRoomsList();
  return true;
}

function joinRoom(user, room) {
  if(user == null)
    return false;
    
  if(room == null || !user.inLobby())
    user.send('joinRoomError', {'msg':"[ERROR]Can't join room"});
    
  else if(!room.gameStarted()) {
    user.setRoom(room);
    room.addPlayer(user);
    user.send('joinRoom');
    updatePlayersInRoom(room);
    updateUsersInLobby();
    sendMessageToRoom(room, '<div style="color:blue">' +parseTime() +user.getName() +' entered room.</div>');
  }
}

function leaveRoom(user) {
  if(user == null || !user.inRoom())
    return false;
    
  var room = user.getRoom();
  room.removePlayer(user.getName());
  updatePlayersInRoom(room);
  updateUsersInLobby();
  user.send('updateRoomsList', {'rooms': getRoomsList('')});
  if(room.empty()) {
    deleteRoomByName(room.getName());
  }
  else {
    sendMessageToRoom(room, '<div style="color:blue">' +parseTime() +user.getName() +' left room.</div>');
  }
  return true;
}


// Updating clients

function getRoomsList(begin) {
  if(!validateMessage(begin) && begin != '')
    return [];
    
  var result = [];
  for(var i = 0; i < rooms.length; i++) {
    if(rooms[i].getName().indexOf(begin) == 0) {
      result.push(rooms[i].getName());
    }
  }
    
  result.sort();
  return result;
}

function getUsersInLobby() {
  result = [];
  for(var i = 0; i < users.length; i++)
    if(users[i] != null && users[i].inLobby())
      result.push(users[i].getName());
    else if(users[i] != null && users[i].inRoom())
      result.push(users[i].getName() +' (' +users[i].getRoom().getName() +')');

  result.sort();
  return result;
}

function updateUsersInLobby() {
  uInLob = getUsersInLobby();
  for(var i = 0; i < users.length; i++)
    if(users[i] != null && users[i].inLobby())
      users[i].send('updateUsersInLobby', {'users': uInLob});
}

function updatePlayersInRoom(room) {
  uInRoom = [];
  points = [];
  czar = [];
  style = [];
  currPlayers = room.getPlayerList();
  for(var i = 0; i < currPlayers.length; i++) {
    uInRoom.push(currPlayers[i].getName());
    points.push(currPlayers[i].getPoints());
    czar.push(currPlayers[i].isCzar());
    if(room.gameStarted()) {
      if(currPlayers[i].getRespond())
        style.push('color:LawnGreen');
      else if (currPlayers[i].isCzar())
        style.push('color:red');
      else
        style.push('color:black');
    }
  }
  for(var i = 0; i < currPlayers.length; i++)
    currPlayers[i].send('updatePlayersInRoom', {'players': uInRoom, 'points': points, 'czar': czar, 'style': style});
}

function updateRoomsList() {
  res = getRoomsList('');
  for(var i = 0; i < users.length; i++) {
    if(users[i] != null && users[i].inLobby())
      users[i].send('updateRoomsList', {'rooms': res});
  }
}

function getRoomByName(name) {
  var id = -1;
  for(var i = 0; i < rooms.length; i++)
    if(rooms[i].getName() == name)
      return rooms[i];
  return null;
}


// Requests validation functions

function validateRoomName(name) {
  if(name == '' || name.length > 20) return false;
  for(var i = 0; i < name.length; i++)
    if(name[i] == '<' || name[i] == '>')
      return false;
  for(var i = 0; i < rooms.length; i++)
  if(rooms[i].getName() == name)
    return false;
  return true;
}

function validateName(name) {
  if(name == '' || name.length > 20) return false;
  for(var i = 0; i < name.length; i++)
    if(name[i] == '<' || name[i] == '>')
      return false;
  for(var i = 0; i < users.length; i++)
    if(users[i] != null && users[i].getName() == name)
      return false;
  return true;
}

function validateMessage(msg) {
  if(msg.length > 200) return false;
  for(var i = 0; i < msg.length; i++)
    if(msg[i] == '<' || msg[i] == '>')
      return false;
  if(msg == '') return false;
  return true;
}

function validateGameSettings(data) {
  if(typeof(data.rounds) == undefined || typeof(data.blankChance) == undefined)
    return false;
  
  var rounds = parseInt(data.rounds, 10);
  var blankChance = parseInt(data.blankChance, 10);
  if(rounds != NaN && rounds > 0 && rounds <= 999 && blankChance != NaN && blankChance >= 0 && blankChance <= 100)
    return true;
  return false;
}


// Chat messages management

function sendMessageToLobby(message) {
  for(var i = 0; i < users.length; i++) 
    if(users[i] != null && (users[i].inLobby() || users[i].inRoom()))
      users[i].send('receiveLobbyChatMessage', {'message': message});
    
}

function sendMessageToRoom(room, message) {
  if(room == null)
    return false;
    
  targets = room.getPlayerList();
  for(var i = 0; i < targets.length; i++)
    targets[i].send('receiveRoomChatMessage', {'message': message});
    
}



// Game management

function startGame(room, rounds, blankChance) {
  if(room == null || room.gameStarted())
    return false;
  room.startGame(whites.length, blacks.length, rounds, blankChance);
  startRound(room);
}

function startRound(room) {
  if(room == null || !room.gameStarted())
    return false;
  var playersInRoom = room.getPlayerList();
  var black = getRandomBlack(room.getUsedBlacks);
  var blanksAmount = countBlanks(black);
  room.startRound(black, blanksAmount);
  updatePlayersInRoom(room);
}

function czarRound(room) {
  if(room == null || !room.gameStarted())
    return false;
  var responses = [];
  var players = room.getPlayerList().slice();
  shuffle(players);
  room.setCurrentRoundOrder(players);
    
  var czarPos = -1;
  for(var i = 0; i < players.length; i++) {
    if(players[i].isCzar()) {
        czarPos = i;
        break;
    }
  }
  if(czarPos != -1) players.splice(czarPos, 1);
  
  for(var i = 0; i < players.length; i++) {
    if(!players[i].isCzar()) responses.push(players[i].getResponses());
  }
  room.sendToAll('revealWhites', {'responses': responses});
  room.setWaitingForCzar(true);
}


// Game helper functions

var countBlanks = function(black) {
  var result = 0;
  for(var i = 0; i < black.length; i++) {
    if(black[i] == '`')
      result++;
  }
  return result;
}

function shuffle(arr) {
  for(var i = arr.length-1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i+1));
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function parseTime() {
  var date = new Date();
  var hour = date.getHours();
  var min = date.getMinutes();
  var sec = date.getSeconds();
  return '[' +hour +':' + min + ':' + sec +']';
}

// Request parsing
io.sockets.on('connection', function(socket) {
  var user = new USER(socket);
  if(!addUser(user)) {
    socket.send('connectError', {'msg':'[ERROR]Server rejected your connection'});
    socket.disconnect();
    return false;
  }
    
  console.log('user#' + user.getId() + ' connected');

  // Managing requests from client
    
  socket.on('disconnect', function() {
    disconnectUser(user);
  });

  socket.on('enterLobbyRequest', function(data) {
    if(typeof(data.name) != undefined && !user.inLobby() && !user.inRoom() && validateName(data.name)) {
      user.setName(data.name);
      console.log('user#' +user.getId() +' (' +data.name + ') entered the lobby');
      user.send('enterLobby', {});
      user.send('receiveLobbyChatMessage', {'message': '<div style="color:red">' +MOTD +'</div>'});
      updateUsersInLobby();
      user.send('updateRoomsList', {'rooms': getRoomsList('')});
      sendMessageToLobby('<div style="color:blue">' +parseTime() +data.name +' entered lobby.</div>');
    }
    else {
      user.send('enterLobbyError', {'msg':'[ERROR]Server does not accept this login data'});
    }
  });

  socket.on('leaveLobbyRequest', function(data) {
    if(!leaveLobby(user))
      user.send('leaveLobbyError', {'msg':'[ERROR]You are not in lobby'});
  });

  socket.on('sendLobbyChatMessageRequest', function(data) {
    if(!user.inLobby() || typeof(data.message) == undefined || !validateMessage(data.message)) {
      user.send('sendLobbyChatMessageError', {'msg':"[ERROR]Can't send this message"});
    }
    else {
      var message = parseTime() +'<b>' +user.getName() + '</b>: ' + data.message;
      sendMessageToLobby(message);
    }
  });
    
  socket.on('createRoomRequest', function(data) {
    if(!user.inLobby() || typeof(data.name) == undefined)
      user.send('createRoomError', {'msg':'[ERROR]Invalid create room request'});
    else {
      var newRoom = createRoom(data.name, user);
      if(newRoom != null) {
          joinRoom(user, newRoom);
          console.log('room "' +data.name +'" created by ' +user.getName());
          updateRoomsList();
      }
      else user.send('createRoomError', {'msg':'[ERROR]Invalid create room request'});
    }
  });

  socket.on('joinRoomRequest', function(data) {
    if(!user.inLobby() || typeof(data.name) == undefined)
      user.send('joinRoomError', {'msg':'[ERROR]Invalid join request'});
    else {
      var reqRoom = getRoomByName(data.name);
      if(reqRoom == null)
        user.send('joinRoomError', {});
      else
        joinRoom(user, getRoomByName(data.name));
    }
  });

  socket.on('leaveRoomRequest', function(data) {
    if(user.inRoom())
      leaveRoom(user);
    else
      user.send('leaveRoomError', {'msg':'[ERROR]Invalid leave request'});	
  });

  socket.on('sendRoomChatMessageRequest', function(data) {
    if(!user.inRoom() || typeof(data.message) == undefined || !validateMessage(data.message))
      user.send('sendRoomChatMessageError', {'msg':'[ERROR]Invalid message request'});
    else
      sendMessageToRoom(user.getRoom(), parseTime() +'<b>' +user.getName() +'</b>: ' +data.message);
  });

  socket.on('startGameRequest', function(data) {
    if(user.inRoom()) {
      var curRoom = user.getRoom();
      if(!curRoom.gameStarted() && curRoom.getPlayerList().length >= 3 && curRoom.isOwner(user) && validateGameSettings(data))
        startGame(curRoom, parseInt(data.rounds), parseInt(data.blankChance));
      else user.send('startGameError', {'msg':'[ERROR]Invalid startgame request'});
    }
    else user.send('startGameError', {'msg':'[ERROR]Attempt to start game outside of a room'});
  });

    
  socket.on('playCardRequest', function(data) {
    if(typeof(data.text) != undefined && user.inRoom() && typeof(data.cardId) != undefined) {
      var cRoom = user.getRoom();
      if(cRoom.gameStarted() && !user.getRespond() && !user.isCzar()) {
        if(user.postResponse(data.text, cRoom, data.blankText)) {
          if(user.getRespLength() == cRoom.getBlanksAmount()) {
            user.setRespond(true);
            user.send('responseComplete', {});
            updatePlayersInRoom(cRoom);
          }
          if(data.text == 'BLANK')
            user.send('playCard', {'text': data.text, 'blankText': data.blankText, 'cardId': data.cardId});
          else user.send('playCard', {'text': data.text, 'cardId': data.cardId, 'blankText': data.blankText});
          if(cRoom.responsesReady())
            czarRound(cRoom);
        }
        else
          user.send('playCardError', {'msg':'[ERROR]Invalid playCard request'});
      }
      else user.send('playCardError', {'msg':'[ERROR]Invalid playCard request'});
    }
    else user.send('playCardError', {'msg':'[ERROR]Invalid playCard request'});
  });

  socket.on('selectCzarAnswerRequest', function(data) {
    if(user.inRoom()) {
      var cRoom = user.getRoom();
      if(cRoom.gameStarted() && !user.getRespond() && user.isCzar() && cRoom.getWaitingForCzar()) {
        if(cRoom.setAnswer(data.id)) {
          user.setRespond(true);
          updatePlayersInRoom(cRoom);
          setTimeout(function() {
            if(cRoom != null) {
              cRoom.finishRound();
              if(cRoom.gameStarted())
                startRound(cRoom);
            }
          }, 4000);
        }
      }
    }
  });
});

console.log('Server running');
