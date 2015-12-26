/* Cards Against Humanity
 * User class implementation
 * author : Marcin Gregorczyk */

var rng = require('./server');

var USER = function(initSocket) {
  var socket = initSocket,
      name = '',
      id = -1,
      room = null,
      points = 0,
      czar = false,
      hand = [],
      respond = false,
      response = [],
      czarResponse = -1;

  var drawCard = function(amount) {
    for(var i = 0; i < amount; i++) {
      if(Math.floor(Math.random() * 100) <= room.getBlankChance())
        hand.push('BLANK');
      else
        hand.push(rng.getRandomWhite(room.getUsedWhites()));
      send('drawCard', {'id': hand.length-1, 'text': hand[hand.length-1]});
    }
  }
    
  var setName = function(newName) {
    name = newName;
  }
    
  var getName = function() {
    return name;
  }

  var setId = function(newId) {
    id = newId;
  }

  var getId = function() {
    return id;
  }

  var send = function(event, data) {
    socket.emit(event, data);
  }

  var getRoom = function() {
    return room;
  }
    
  var setRoom = function(newRoom) {
    room = newRoom;
  }

  var inLobby = function() {
    return (name != '' && room == null);
  }

  var inRoom = function() {
    return room != null;
  }

  var getPoints = function() {
    return points;
  }

  var isCzar = function() {
    return czar;
  }

  var setPoints = function(newPoints) {
    points = newPoints;
  }
    
  var setCzar = function(newCzar) {
    czar = newCzar;
  }

  var startGame = function() {
    points = 0;
    czar = false;
    hand = [];
    drawCard(9);
  }

  var startRound = function(newBlack, isCzar) {
    czar = isCzar;
    respond = false;
    response = [];
    czarResponse = -1;
    send('updateBlack', {'text': newBlack, 'czar': isCzar});
  }

  var getRespond = function() {
    return respond;
  }

  var getResponses = function() {
    return response;
  }
    
    var postResponse = function(text, cRoom, blankText) {
    var pos = -1;
    for(var i = 0; i < hand.length; i++) {
      if(hand[i] == text) {
        pos = i;
        break;
      }
    }
    if(pos == -1) return false;
    if(text == 'BLANK') {
      if(blankText == undefined || blankText.length == 0 || blankText.length > 200)
        return false;
      else response.push(blankText);
    }
    else response.push(text);
    hand.splice(pos, 1);
    return true;
  }

  var incPoints = function() {
    points++;
  }

  var setRespond = function(resp) {
    respond = resp;
  }

  var getRespLength = function() {
    return response.length;
  }
    
  return {
    getName: getName,
    setName: setName,
    getId: getId,
    setId: setId,
    send: send,
    getRoom: getRoom,
    setRoom: setRoom,
    inLobby: inLobby,
    inRoom: inRoom,
    getPoints: getPoints,
    isCzar: isCzar,
    setPoints: setPoints,
    setCzar: setCzar,
    drawCard: drawCard,
    startGame: startGame,
    startRound: startRound,
    getRespond: getRespond,
    postResponse: postResponse,
    getResponses: getResponses,
    incPoints: incPoints,
    setRespond: setRespond,
    getRespLength: getRespLength
  }
}

exports.USER = USER;
