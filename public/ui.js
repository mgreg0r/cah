$(document).keypress(function(k) {
    if(k.which == 13) {
        if($('#loginScreen').is(':visible')) {
            $('#enterLobby').trigger('click');
	}
	else if($('#lobbyRoot').is(':visible')) {
	    if($('#chatMessage').is(':focus')) {
		if($('#chatMessage').val() != '')
                    $('#chatSend').trigger('click');
		else $('#chatMessage').blur();
	    }
	    else $('#chatMessage').focus();
	}
	else if($('#gameRoot').is(':visible')) {
	    if($('#roomChatInput').is(':focus')) {
		if($('#roomChatInput').val() != '')
                    $('#roomChatSend').trigger('click');
		else $('#roomChatInput').blur();
	    }
	    else $('#roomChatInput').focus();
	}
    }
});
