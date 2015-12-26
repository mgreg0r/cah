/* Cards Against Humanity
 * GameRoom class definition
 * author: Marcin Gregorczyk */

var rng = require('./server');

var ROOM = function(newName) {
    
  var name = newName,
    playersInRoom = [],
    started = false,
    round = 0,
    czarId = 0,
    blankAmount = 0,
    currentRoundOrder = [],
    usedBlacks = [],
    usedWhites = [],
    waitingForCzar = false,
    pointsLimit = 5,
    blankChance = 0;
    
  var getName = function() {
    return name;
  }

  var addPlayer = function(player) {
    playersInRoom.push(player);
  }

  var removePlayer = function(playerName) {
    if(started)
      finishGame();

    for(var i = 0; i < playersInRoom.length; i++) {
      if(playersInRoom[i].getName() == playerName) {
        playersInRoom[i].setRoom(null);
        playersInRoom[i].send('leaveRoom', {});
        playersInRoom.splice(i, 1);
      }
    }
  }
    
  var removeAllPlayers = function() {
    if(started)
      finishGame();
	
    for(var i = 0; i < playersInRoom.lentgh; i++) {
      playersInRoom[i].setRoom(null);
      playersInRoom[i].send('leaveRoom', {});
    }
    playersInRoom = [];
  }
    
  var getPlayerList = function() {
    return playersInRoom;
  }

  var gameStarted = function() {
    return started;
  }

  var empty = function() {
    return playersInRoom.length == 0;
  }

  var sendToAll = function(request, data) {
    for(var i = 0; i < playersInRoom.length; i++) {
      playersInRoom[i].send(request, data);
    }
  }

  var startGame = function(whitesAm, blacksAm, rounds, bChance) {
    czarId = -1;

    usedBlacks = [];
    usedWhites = [];
    pointsLimit = rounds;
    blankChance = bChance;
    for(var i = 0; i < whitesAm; i++)
      usedWhites.push(false);
    for(var i = 0; i < blacksAm; i++)
      usedBlacks.push(false);
	
    for(var i = 0; i < playersInRoom.length; i++) {
      playersInRoom[i].startGame();
    }
    round = 0;
    started = true;
  }

  var startRound = function(black, blanksAm) {
    waitingForCzar = false;
    black = black.split('`').join('________');
    incCzar();
    blanksAmount = blanksAm;
    for(var i = 0; i < playersInRoom.length; i++) {
      playersInRoom[i].startRound(black, i == czarId);
      if(i != czarId)
        playersInRoom[i].drawCard(blanksAmount);
    }
    playersInRoom[czarId].setCzar(true);
    playersInRoom[czarId].send('makeCzar', {});
  }

  var finishRound = function() {
    sendToAll('finishRound', {});
    for(var i = 0; i < playersInRoom.length; i++) {
      if(playersInRoom[i].getPoints() >= pointsLimit)
        finishGame();
    }
  }

  var finishGame = function() {
    started = false;
    var winner = 'Game ended with no winner :(';
    for(var i = 0; i < playersInRoom.length; i++) {
      if(playersInRoom[i].getPoints() == pointsLimit) {
        winner = '<div style="color:blue">And the winner is ' +playersInRoom[i].getName() + '!</div>';
        break;
      }
    }
    sendToAll('receiveRoomChatMessage', {'message': winner});
    sendToAll('finishGame', {});
  }
    
  var incCzar = function() {
    czarId++;
    if(czarId >= playersInRoom.length)
      czarId = 0;
  }

  var getCzarId = function() {
    return czarId;
  }

  var getBlanksAmount = function() {
    return blanksAmount;
  }

  var setBlanksAmount = function(newAmount) {
    blanksAmount = newAmount;
  }

  var responsesReady = function() {
    for(var i = 0; i < playersInRoom.length; i++) {
      if(!playersInRoom[i].getRespond() && !playersInRoom[i].isCzar())
        return false;
    }
    return true;
  }

  var setCurrentRoundOrder = function(ord) {
    currentRoundOrder = ord;
  }

  var setAnswer = function(ans) {
    if(ans < 0 || ans >= currentRoundOrder.length)
      return false;
    currentRoundOrder[ans].incPoints();
    sendToAll('updateCzarAnswer', {'id': ans, 'name': currentRoundOrder[ans].getName()});
    return true;
  }

  var getUsedBlacks = function() {
    return usedBlacks;
  }

  var getUsedWhites = function() {
    return usedWhites;
  }

  var getWaitingForCzar = function() {
    return waitingForCzar;
  }

  var setWaitingForCzar = function(nb) {
    waitingForCzar = nb;
  }

  var isOwner = function(user) {
    return (playersInRoom.length > 0 && playersInRoom[0] == user)
  }

  var getBlankChance = function() {
    return blankChance;
  }
    
  return {
    getName: getName,
    addPlayer: addPlayer,
    removePlayer: removePlayer,
    removeAllPlayers: removeAllPlayers,
    getPlayerList: getPlayerList,
    gameStarted: gameStarted,
    empty: empty,
    sendToAll: sendToAll,
    startGame: startGame,
    incCzar: incCzar,
    getCzarId: getCzarId,
    getBlanksAmount: getBlanksAmount,
    setBlanksAmount: setBlanksAmount,
    responsesReady: responsesReady,
    setCurrentRoundOrder: setCurrentRoundOrder,
    setAnswer: setAnswer,
    finishRound: finishRound,
    getUsedBlacks: getUsedBlacks,
    getUsedWhites: getUsedWhites,
    startRound: startRound,
    setWaitingForCzar: setWaitingForCzar,
    getWaitingForCzar: getWaitingForCzar,
    isOwner: isOwner,
    getBlankChance: getBlankChance
  }
}

exports.ROOM = ROOM;
