/* Cards Against Humanity
 * JS client
 * author: Marcin Gregorczyk */


// Global variables
var socket,
    lastEmit,
    gSelectedRoom = '',
    gSelectedCard = '',
    gSelectedAnswer = -1,
    gBlack,
    gCzar = false,
    gWaitingForPlay = true,
    gSelectedId = -1;
    blackSplit = [],
    cardId = 0,
    localName = '',
    debugFlag = true;

function parseTime() {
  var date = new Date();
  var hour = date.getHours();
  var min = date.getMinutes();
  var sec = date.getSeconds();
  return '[' +hour +':' + min + ':' + sec +']';
}

function dbg(text) {
  if(debugFlag)
    console.log(parseTime() + text);
}

function init() {
  lastEmit = $.now();
  dbg('Connecting to server... (' +document.location.protocol+'//' +document.location.host +')');
  socket = io.connect(document.location.protocol+'//'+document.location.host);
  dbg('Setting up event handlers...');
  setEventHandlers();
}

function printLobbyError(err) {
  lobbyChatAddMessage('<div style="color:red">' +err +'</div>');
}

function printRoomError(err) {
  roomChatAddMessage('<div style="color:red">' +err + '</div>');
}

// Server events handlers

function onSocketConnected() {
  dbg('Connected to server');
}

function leaveLobby() {
  dbg('Leaving lobby');
  $('#lobbyRoot').transition({
    animation: 'scale',
    onComplete: function() {
      $('#loginScreen').transition('scale');
    }
  });
}

function leaveLobbyError(data) {
  dbg('Server rejected attempt to leave lobby');
  printLobbyError(data.msg);
}

function enterLobby() {
  dbg('Entering lobby');
  $('#chatMessages').empty();
  $('#loginScreen').transition({
    animation: 'scale',
    onComplete: function() {
      $('#lobbyRoot').transition('scale');
    }
  });
}

function enterLobbyError() {
  dbg("Server rejected attempt to enter lobby");
}

function sendLobbyChatMessageError(data) {
  printLobbyError(data.msg);
  dbg("Server rejected lobby chat message (" +data.msg +')');
}

function receiveLobbyChatMessage(data) {
  dbg('Received lobby chat message (' +data.message +')');
  lobbyChatAddMessage(data.message);
}

function updateUsersInLobby(data) {
  dbg('Updating users in lobby');
  var r = $('#lobbyUsersList');
  r.empty();
  for(var i = 0; i < data.users.length; i++)
    r.append('<p>' +data.users[i] +'</p>');
}

function getUsersInLobbyError() {
  dbg("Server rejected your getUsersInLobby request");
}

function updateRoomsList(data) {
  dbg('Updating rooms list');
  gSelectedRoom = '';
  var el = $('#roomsList');
  el.empty();
  for(var i = 0; i < data.rooms.length; i++) {
    var r = $('<div class="item"><div class="content"><div class="header">' +data.rooms[i] +'</div></div></div>');
    r.click(function() {
      gSelectedRoom = $(this).text();
      joinRoomRequest(gSelectedRoom);
    });
    el.append(r);
  }  
}

function getRoomsListError() {
  dbg("Server won't tell you anything about created rooms");
}

function createRoomError(data) {
  printLobbyError(data.msg);
  dbg("Server can't create a room named " +data.msg);
}

function joinRoom() {
  dbg('Joining room');
  $('.blackArea').empty();
  $('.whiteArea').empty();
  $('#hand').empty();
  $('#roomchatMessages').empty();
  $('#lobbyRoot').transition({
    animation: 'scale',
    onComplete: function() {
      $('#gameRoot').transition('scale');
    }
  });
}

function joinRoomError(data) {
  printLobbyError(data.msg);
  dbg("You don't have permission to join this room");
}

function leaveRoom() {
  dbg('Leaving room');
  $('#gameRoot').transition({
    animation: 'scale',
    onComplete: function() {
      $('#lobbyRoot').transition('scale');
    }
  });
}

function leaveRoomError(data) {
  printRoomError(data.msg);
  dbg("Server can't kick you out of this room");
}


function updatePlayersInRoom(data) {
  dbg('Updating players in room');
  var r = $('#playersInRoom');
  r.empty();
  for(var i = 0; i < data.players.length; i++) {
    var el;
    if(data.czar[i])
      el = $('<div class="item">Czar ' +data.players[i] + ' (' + data.points[i] +'p)</div>');
    else
      el = $('<div class="item">' +data.players[i] + ' (' + data.points[i] +'p)</div>');
    el.attr('style', data.style[i]);
    r.append(el);
  }
  if(data.players[0] == localName)
    $('#startGameButton').show();
  else
    $('#startGameButton').hide();
}

function getPlayersInRoomError() {
  dbg("Server doesn't see you in any room.");
}

function receiveRoomChatMessage(data) {
  dbg('Received room chat message (' +data.message +')');
  roomChatAddMessage(data.message);
}

function sendRoomChatMessageError(data) {
  printRoomError(data.msg);
  dbg("Server doesn't want your room chat message (" +data.msg +')');
}

function drawCard(data) {
  dbg('Drawing card (' +cardId +'#' +data.text +')');
  r = $('#hand');
  var el = $('<a id="' +cardId +'" class="item">' +data.text +'</a>');
  cardId++;
  el.hide();
  el.click(function() {
    if(!gCzar && gWaitingForPlay) {
      gSelectedCard = $(this).text();
      gSelectedId = $(this).attr('id');
      $(this).addClass('active item').siblings().removeClass('active item').addClass('item');
    }
  });
  r.append(el);
  el.transition('scale');
}

var updateBlack = function(data) {
  dbg('Starting new round (black=' +data.text +')');
  gWaitingForPlay = true;
  var r = $('.blackArea');
  r.empty();
  var el = $('<div class="ui black message">' +data.text +'</div>');
  el.hide().disableSelection();
  r.append(el);
  el.transition('scale');
  gBlack = data.text;
  blackSplit = gBlack.split('________');
  splitCounter = 1;
  if(!data.czar) {
    var ansEl = $('<div class="ui message"><div class="header">Your answer</div><p id="yourAnswer">' +blackSplit[0] +'</p></div>');
    ansEl.hide();
    $('.whiteArea').append(ansEl);
    ansEl.transition('scale');
  }
}

function playCard(data) {
  dbg('Playing card ' +data.cardId + '#' + data.text);
  var cards = $('#hand').children().toArray();
  for(var i = 0; i < cards.length; i++) {
    if($(cards[i]).text() == data.text && data.cardId == $(cards[i]).attr('id')) {
      $(cards[i]).transition({
        animation: 'scale',
        onComplete: function() {
          $(cards[i]).remove();
        }
      });
      break;
    }
  }
  var yAns = $('#yourAnswer');
  if(data.text != 'BLANK')
    yAns.text(yAns.text() + ' ' + data.text);
  else yAns.text(yAns.text() + ' ' + data.blankText);
  if(splitCounter < blackSplit.length) {
    yAns.text(yAns.text() + ' ' + blackSplit[splitCounter]);
    splitCounter++;
  }
}

function makeAnswerWidget(ans, id) {
  var el = $('<a class="item" id="' +id +'">' +ans +'</a>');
  el.click(function() {
    if(gCzar && gWaitingForPlay) {
      gSelectedAnswer = $(this).attr('id');
      $(this).addClass("active item").siblings().removeClass("active item").addClass('item');
    }
  });
  return el;
}

function revealWhites(data) {
  dbg('Revealing answers');
  $('.blackArea').children().transition('scale');
  $('.blackArea').empty();
  var r = $('.whiteArea');
  var lowM = $('<div id="revealedWhites" class="menu"></div>');
  for(var i = 0; i < data.responses.length; i++) {
  var bl = gBlack.split('________');
  var ans = '';
  for(var j = 0; j < data.responses[i].length; j++) {
    ans += bl[j];
    ans += data.responses[i][j];
  }
  if(bl.length > data.responses[i].length)
    ans += bl[data.responses[i].length];
    lowM.append(makeAnswerWidget(ans, i));
  }
  var midM = $('<div class="item"></div>');
  midM.append(lowM);
  var highM = $('<div class="ui fluid vertical menu"></div>');
  highM.append(midM);
  highM.hide();
  r.append(highM);
  highM.transition('scale');
}

function makeCzar() {
  dbg('Popifying player');
  gCzar = true;
  var el = $('.whiteArea');
  el.empty();
  el.append('<div class="ui message"><div class="header">You are the card Czar</div><p>Wait until everyone select their cards, and choose the best combo.</p></div>');
}

function startRound() {
  gSelectedCard = '';
  gSelectedAnswer = -1;
  gCzar = false;
  gWaitingForPlay = true;
}

function responseComplete() {
  dbg('Response is complete for this round');
  gWaitingForPlay = false;
}

function updateCzarAnswer(data) {
  dbg('Received answer from Czar (' +data.id +')');
  var cards = $('#revealedWhites').children().toArray();
  for(var i = 0; i < cards.length; i++) {
    if($(cards[i]).attr('id') == data.id) {
      $(cards[i]).addClass('active item');
      roomChatAddMessage('<div style="color:blue">' +data.name +' wins round! (' +$(cards[i]).text() +')</div>');
      break;
    }
  }
  if(gCzar) gWaitingForPlay = false;
}

function finishRound() {
  dbg('Finishing round');
  $('.whiteArea').empty();
  gCzar = false;
  gWaitingForPlay = false;
}

function finishGame() {
  dbg('Finishing game');
  $('.blackArea').empty();
  $('.whiteArea').empty();
  $('#hand').empty();
  gWaitingForPlay = true;
  gCzar = false;
  cardId = 0;
}

function startGameError(data) {
  dbg('Something went wrong when starting game');
  printRoomError(data.msg);
}

function playCardError(data) {
  dbg('Something went wrong while playing card');
  printRoomError(data.msg);
}

var setEventHandlers = function() {
  socket.on("connect", onSocketConnected);
  socket.on('enterLobby', enterLobby);
  socket.on('enterLobbyError', enterLobbyError);
  socket.on('receiveLobbyChatMessage', receiveLobbyChatMessage);
  socket.on('sendLobbyChatMessageError', sendLobbyChatMessageError);
  socket.on('updateUsersInLobby', updateUsersInLobby);
  socket.on('getUsersInLobbyError', getUsersInLobbyError);
  socket.on('updateRoomsList', updateRoomsList);
  socket.on('getRoomsListError', getRoomsListError);
  socket.on('createRoomError', createRoomError);
  socket.on('joinRoom', joinRoom);
  socket.on('joinRoomError', joinRoomError);
  socket.on('leaveLobby', leaveLobby);
  socket.on('leaveLobbyError', leaveLobbyError);
  socket.on('updatePlayersInRoom', updatePlayersInRoom);
  socket.on('getPlayersInRoomError', getPlayersInRoomError);
  socket.on('leaveRoom', leaveRoom);
  socket.on('receiveRoomChatMessage', receiveRoomChatMessage);
  socket.on('sendRoomChatMessageError', sendRoomChatMessageError);
  socket.on('drawCard', drawCard);
  socket.on('updateBlack', updateBlack);  // it's always a startRound call
  socket.on('playCard', playCard);
  socket.on('revealWhites', revealWhites);
  socket.on('makeCzar', makeCzar);
  socket.on('responseComplete', responseComplete);
  socket.on('updateCzarAnswer', updateCzarAnswer);
  socket.on('finishRound', finishRound);
  socket.on('finishGame', finishGame);
  socket.on('startGameError', startGameError);
  socket.on('playCardError', playCardError);
}


// Client requests
    
function enterLobbyRequest() {
  var name = $("#nameInput").val();
  dbg('Attempting to enter lobby (' +name +')');
  localName = name;
  send('enterLobbyRequest', {'name': name});
}

function leaveLobbyRequest() {
  dbg('Attempting to leave lobby');
  send('leaveLobbyRequest', {});
}

function sendLobbyChatMessageRequest() {
  var message = $('#chatMessage').val();
  dbg('Attempting to send lobby chat message (' +message +')');
  if(send('sendLobbyChatMessageRequest', {'message': message}))
    $('#chatMessage').val('');
}

function createRoomRequest() {
  $('#createRoomModal').modal('hide');
  var name = $('#rlcpName').val();
  dbg('Attempting to create room named ' +name);
  if(send('createRoomRequest', {'name': name}))
    $('#rlcpName').val('');
}

function getRoomsListRequest() {
  dbg('getRoomListRequest');
  var el = $('#rlcpName').val();
  send('getRoomsListRequest', {'begin': el});
}

function getPlayersInRoomRequest() {
  dbg('getPlayersInRoomRequest');
  send('getPlayersInRoomRequest', {});
}

function joinRoomRequest() {
  dbg('Attempting to join room named ' +gSelectedRoom);
  send('joinRoomRequest', {'name': gSelectedRoom});
}

function leaveRoomRequest() {
  dbg('Attempting to leave room');
  send('leaveRoomRequest', {});
}

function startGameRequest() {
  var rounds = $('#gameRoundsInput').val();
  var blankChance = $('#gameBlanksInput').val();
  dbg('Attempting to start game with ' + rounds +' limit and ' +blankChance +' blank chance');
  send('startGameRequest', {'rounds': rounds, 'blankChance': blankChance});
  $('#startGameModal').modal('hide');
}

function sendRoomChatMessageRequest() {
  var message = $('#roomChatInput').val();
  dbg('Attempting to send room chat message');
  if(send('sendRoomChatMessageRequest', {'message': message}))
    $('#roomChatInput').val('');
}

function submitBlankRequest() {
  dbg('Attempting to play blank ' +gSelectedId +'#' +$('#blankTextInput').val())
  send('playCardRequest', {'text': 'BLANK', 'blankText': $('#blankTextInput').val(), 'cardId': gSelectedId});
  $('#blankCardModal').modal('hide');
  gSelectedId = -1;
  gSelectedCard = '';
  $('#blankTextInput').val('');
}

function submitCardRequest() {
  if(!gCzar) {
    if(gSelectedCard == 'BLANK')
      $('#blankCardModal').modal('show');
    else {
      dbg('Attempting to play card ' +gSelectedId +'#' +gSelectedCard);
      send('playCardRequest', {'text': gSelectedCard, 'cardId': gSelectedId});
      gSelectedId = -1;
      gSelectedCard = '';
      $('#blankTextInput').val('');
    }
  }
  else {
    dbg('Attempting to select answer ' +gSelectedAnswer);
    send('selectCzarAnswerRequest', {'id': gSelectedAnswer});
    gSelectedAnswer = -1;
  }
}


// Helper functions

function createRoomModal() {
  $('#createRoomModal').modal('show');
}

function startGameModal() {
  $('#startGameModal').modal('show');
}

function lobbyChatAddMessage(msg) {
  el = $('<div class="item">' + msg + '</div>');
  var r = $('#chatMessages');
  r.append(el);
  r.prop({scrollTop: r.prop('scrollHeight')});
}

function roomChatAddMessage(msg) {
  var r = $('#roomchatMessages').append('<div class="item">' +msg +'</div>');
  r.prop({scrollTop: r.prop('scrollHeight')});
}

function send(event, data) {
  if($.now() - lastEmit > 30) {
    socket.emit(event, data);
    lastEmit = $.now();
    return true;
  }
  dbg('Emit failed');
  return false;
}

function  initJQuery() {
  $("input[type=submit], a, button").button().click(function(event) {
    event.preventDefault();
  });
  $('#hand').sortable().disableSelection();
}

// Init
$(function() {
  initJQuery();
  $('.lobbyRoot').hide();
  $('.gameRoot').hide();
  $('#enterLobby').click(enterLobbyRequest);
  $('#rlcpLeaveLobbyButton').click(leaveLobbyRequest);
  $("#chatSend").click(sendLobbyChatMessageRequest);
  $('#rlcpButtonCreate').click(createRoomModal);
  $('#createRoomModalButton').click(createRoomRequest);
  $('#leaveRoomButton').click(leaveRoomRequest);
  $('#startGameButton').click(startGameModal);
  $('#startGameModalButton').click(startGameRequest);
  $('#roomChatSend').click(sendRoomChatMessageRequest);
  $('#handCardSubmit').click(submitCardRequest);
  $('#blankModalButton').click(submitBlankRequest);
  init();
});
