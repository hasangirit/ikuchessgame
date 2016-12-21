
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

