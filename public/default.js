
(function () {
    
    WinJS.UI.processAll().then(function () {
      
      var socket, serverGame;
      var username, playerColor;
      var game, board, squareToHighlight;
      var boardEl = $('#board');
      var statusEl = $('#status'),
          fenEl = $('#fen'),
          pgnEl = $('#pgn');
      var usersOnline = [];
      var myGames = [];
      socket = io();
       var FADE_TIME = 150; // ms
      var TYPING_TIMER_LENGTH = 400; // ms
      var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
    ];
    var $window = $(window);
   
    var $messages = $('.messages'); // Messages area
    var $inputMessage = $('.inputMessage'); // Input message input box

    var $loginPage = $('.loginchat.pagechat'); // The login page
    var $chatPage = $('.chat.pagechat'); // The chatroom page

    // Prompt for setting a username
    var connected = false;
    var typing = false;
    var lastTypingTime;
    var $currentInput;

           
      //////////////////////////////
      // Socket.io handlers
      ////////////////////////////// 
      
      
      socket.on('login', function(msg) {
            usersOnline = msg.users;
            updateUserList();
            myGames = msg.games;
            updateGamesList();
            console.log("socket.on(login,function(msg) worked");
      });
      
      socket.on('joinlobby', function (msg) {
        addUser(msg);
        console.log("socket.on(joinlobby,function(msg) worked");
      });
      
       socket.on('leavelobby', function (msg) {
        removeUser(msg);
        console.log("socket.on(leavelobby,function(msg) worked");
      });
      
      socket.on('gameadd', function(msg) {
            
      });
      
      socket.on('gameremove', function(msg) {
            
      });
                  
      socket.on('joingame', function(msg) {
        console.log("joined as game id: " + msg.game.id );   
        playerColor = msg.color;
        initGame(msg.game);
        
        $('#page-lobby').hide();
        $('#page-game').show();
        console.log("socket.on(joingame,function(msg) worked");
      });
        
      socket.on('move', function (msg) {
        if (serverGame && msg.gameId === serverGame.id) {
           game.move(msg.move);
           board.position(game.fen());
        }
        console.log("socket.on(move,function(msg) worked");
      });
     
      
      socket.on('logout', function (msg) {
        removeUser(msg.username);
        console.log("socket.on(logout,function(msg) worked");
      });
      
    ///////////////////////////////////////////////
    // CHAT IMP
    ///////////////////////////////////////////////


  // Sends a chat message
  function sendMessage () {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: msg.username,
        message: message
      });
      // tell server to execute 'new message' and send along one parameter
      socket.emit('new message', message);
    }
  }

  // Log a message
  function log (message, options) {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  // Adds the visual chat message to the message list
  function addChatMessage (data, options) {
    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="username"/>')
      .text(msg.username)
      .css('color', getUsernameColor(msg.username));
    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<li class="message"/>')
      .data('username', msg.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  // Adds the visual chat typing message
  function addChatTyping (data) {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  function removeChatTyping (data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  function addMessageElement (el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Prevents input from having injected markup
  function cleanInput (input) {
    return $('<div/>').text(input).text();
  }

  // Updates the typing event
  function updateTyping () {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages (data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === msg.username;
    });
  }

  // Gets the color of a username through our hash function
  function getUsernameColor (username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // Keyboard events

  $window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (msg.username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
        $chatPage.show();
        $currentInput = $inputMessage.focus();

        // Tell the server your username
        socket.emit('add user', msg.username);
      }
    }
  });

  $inputMessage.on('input', function() {
    updateTyping();
  });

  // Click events

  // Focus input when clicking anywhere on login page
  $loginPage.click(function () {
    $currentInput.focus();
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(function () {
    $inputMessage.focus();
  });

  // Socket events

  // Whenever the server emits 'login', log the login message
  socket.on('loginchat', function (data) {
    connected = true;
    // Display the welcome message
    var message = "Welcome to Socket.IO Chat – ";
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', function (data) {
    addChatMessage(data);
  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('user joined', function (data) {
    log(msg.username + ' joined');
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user left', function (data) {
    log(msg.username + ' left');
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on('typing', function (data) {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', function (data) {
    removeChatTyping(data);
  });

  socket.on('disconnect', function () {
    log('you have been disconnected');
  });

  socket.on('reconnect', function (msg) {
    log('you have been reconnected');
    if (msg.username) {
      socket.emit('add user', msg.username);
    }
  });

  socket.on('reconnect_error', function () {
    log('attempt to reconnect has failed');
  });

///////////////////////////////////////////////
///////////////////////////////////////////////


      
      //////////////////////////////
      // Menus
      ////////////////////////////// 
      $('#login').on('click', function() {
        username = $('#username').val();
        
        if (username.length > 0) {
            $('#userLabel').text(username);
            socket.emit('login', username);
            
            $('#page-login').hide();
            $('#page-lobby').show();
            console.log("$('#login').on('click', function() worked");
        } 
      });
      
      $('#game-back').on('click', function() {
        socket.emit('login', username);
        
        $('#page-game').hide();
        $('#page-lobby').show();
        console.log("$('#game-back').on('click', function() worked");
      });
      
      $('#game-resign').on('click', function() {
        socket.emit('resign', {userId: username, gameId: serverGame.id});
        
        $('#page-game').hide();
        $('#page-lobby').show();
        console.log("$('#game-resign').on('click', function() worked");
      });
      
      var addUser = function(userId) {
        usersOnline.push(userId);
        updateUserList();
        console.log(" var addUser = function(userId) worked");
      };
    
     var removeUser = function(userId) {
          for (var i=0; i<usersOnline.length; i++) {
            if (usersOnline[i] === userId) {
                usersOnline.splice(i, 1);
            }
         }
         
         updateUserList();
         console.log("var removeUser = function(userId) worked");
      };
      
      var updateGamesList = function() {
        document.getElementById('gamesList').innerHTML = '';
        myGames.forEach(function(game) {
          $('#gamesList').append($('<button>')
                        .text('#'+ game)
                        .on('click', function() {
                          socket.emit('resumegame',  game);
                        }));
        });
      };
      
      var updateUserList = function() {
        document.getElementById('userList').innerHTML = '';
        usersOnline.forEach(function(user) {
          $('#userList').append($('<button>')
                        .text(user)
                        .on('click', function() {
                          socket.emit('invite',  user);
                        }));
        });
      };
           
      //////////////////////////////
      // Chess Game
      ////////////////////////////// 
      
      var initGame = function (serverGameState) {
        serverGame = serverGameState; 
        
          var cfg = {
            draggable: true,
            showNotation: true,
            moveSpeed: 'slow',
            snapbackSpeed: 500,
            snapSpeed: 100,
            orientation: playerColor,
            position: serverGame.board ? serverGame.board : 'start',
            onDragStart: onDragStart,
            onDrop: onDrop,
            onSnapEnd: onSnapEnd,
            onMoveEnd: onMoveEnd,
            onMouseoutSquare: onMouseoutSquare,
            onMouseoverSquare: onMouseoverSquare
          };
               
          game = serverGame.board ? new Chess(serverGame.board) : new Chess();
          board = new ChessBoard('game-board', cfg);
      }

      var removeGreySquares = function() {
        //console.log("removeGreySquares çağırıldı");
        $('#board .square-55d63').css('background', '');
      };

      var greySquare = function(square) {
        //console.log("greySquare çağırıldı");
        var squareEl = $('#board .square-' + square);
          
        var background = '#a9a9a9';
        if (squareEl.hasClass('black-3c85d') === true) {
          background = '#696969';
        }

        squareEl.css('background', background);
        };
        
        var removeHighlights = function(color) {
        boardEl.find('.square-55d63')
          .removeClass('highlight-' + color);
      };
       
      // do not pick up pieces if the game is over
      // only pick up pieces for the side to move
      var onDragStart = function(source, piece, position, orientation) {
        if (game.game_over() === true ||
            (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (game.turn() === 'b' && piece.search(/^w/) !== -1) ||
            (game.turn() !== playerColor[0])) {
          return false;
        }
      };  
      
    
      var move;
      var onDrop = function(source, target) {
        removeGreySquares();
        // see if the move is legal
        move = game.move({
          from: source,
          to: target,
          promotion: 'q' // NOTE: always promote to a queen for example simplicity
        });
      
        // illegal move
        if (move === null) { 
          return 'snapback';
        } else {
           socket.emit('move', {move: move, gameId: serverGame.id, board: game.fen()});
        }

        removeHighlights(move.color);
        boardEl.find('.square-' + move.source).addClass('highlight-'+move.color);
        boardEl.find('.square-' + move.target).addClass('highlight-'+move.color);
        squareToHighlight = move.to;

        updateStatus();
      };

      var onMoveEnd = function() {
        //console.log("onMoveEnd çağırıldı");
        boardEl.find('.square-' + squareToHighlight)
        .addClass('highlight-white');
        updateStatus();
        
      };

      var onMouseoverSquare = function(square, piece) {
        //console.log("onMouseoverSquare çağırıldı");
  // get list of possible moves for this square
           moves = game.moves({
            square: square,
            verbose: true
          });

          // exit if there are no moves available for this square
          if (moves.length === 0) return;

          // highlight the square they moused over
          greySquare(square);

          // highlight the possible squares for this piece
          for (var i = 0; i < moves.length; i++) {
            greySquare(moves[i].to);
          }
        };

        var onMouseoutSquare = function(square, piece) {
          //console.log("onMouseoutSquare çağırıldı");
          removeGreySquares();
        };
      
      // update the board position after the piece snap 
      // for castling, en passant, pawn promotion
      var onSnapEnd = function() {
        //console.log("onSnapEnd çağırıldı");
        board.position(game.fen());
      };

      var updateStatus = function () {

        var status = '';

        var moveColor = 'White';
        if (game.turn() === 'b') {
          moveColor = 'Black';
        }

        // checkmate?
        if (game.in_checkmate() === true) {
          status = 'Game over, ' + moveColor + ' is in checkmate.';
          alert("Game Over");
        }

        // draw?
        else if (game.in_draw() === true) {
          status = 'Game over, drawn position';
          alert("Game Over! DRAW!")
        }

        // game still on
        else {
          status = moveColor + ' to move';

          // check?
          if (game.in_check() === true) {
            status += ', ' + moveColor + ' is in check';
          }
        }
        
        if(moveColor=='White') moveColor='Black';
        else moveColor='White';
        console.log(moveColor + " ::"+ move.piece +":: "+move.from+"->"+move.to);

        statusEl.html(status);
        fenEl.html(game.fen());
        pgnEl.html(game.pgn());
      };
      updateStatus();

    });
})();

