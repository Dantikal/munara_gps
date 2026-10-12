import React, { useEffect, useRef, useState } from "react";

const INITIAL_BOTS = [
  { id: 1, x: 22, y: 22, direction: 150, alive: true },
  { id: 2, x: 50, y: 34, direction: 180, alive: true },
  { id: 3, x: 78, y: 20, direction: 210, alive: true },
];

const DIRECTION_DATA = {
  up: { dx: 0, dy: -1, angle: 0 },
  right: { dx: 1, dy: 0, angle: 90 },
  down: { dx: 0, dy: 1, angle: 180 },
  left: { dx: -1, dy: 0, angle: 270 },
};

const SPEEDS = {
  1: { label: "Жай", step: 3 },
  2: { label: "Орточо", step: 5 },
  3: { label: "Тез", step: 8 },
};

const TopTank = ({ bot = false }) => (
  <div className={`top-tank${bot ? " top-tank--bot" : ""}`}>
    <span className="top-tank__track top-tank__track--left" />
    <span className="top-tank__track top-tank__track--right" />
    <span className="top-tank__body" />
    <span className="top-tank__turret" />
    <span className="top-tank__barrel" />
    <span className="top-tank__hatch" />
  </div>
);

const clamp = (value) => Math.max(8, Math.min(92, value));

const INITIAL_CHESS_BOARD = [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
];

const PIECE_SYMBOLS = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
};

const TETRIS_PIECES = {
  I: { shape: [[1, 1, 1, 1]], color: '#00f0f0' },
  O: { shape: [[1, 1], [1, 1]], color: '#f0f000' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#a000f0' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#00f000' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#f00000' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#0000f0' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#f0a000' },
};

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

const BLOCKBLAST_SHAPES = [
  [[1]], [[1, 1]], [[1], [1]], [[1, 1, 1]], [[1], [1], [1]],
  [[1, 1], [1, 1]], [[1, 1, 1, 1]], [[1], [1], [1], [1]],
  [[1, 0], [1, 1]], [[0, 1], [1, 1]], [[1, 1], [0, 1]], [[1, 1], [1, 0]],
  [[1, 1, 1], [0, 1, 0]], [[0, 1, 0], [1, 1, 1]], [[1, 0, 0], [1, 1, 1]], [[0, 0, 1], [1, 1, 1]],
];

const BLOCKBLAST_COLORS = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#fd79a8', '#a29bfe',
];

const SNAKE_BOARD_SIZE = 20;

function SnakeGame({ onBack }) {
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [food, setFood] = useState({ x: 15, y: 15 });
  const [direction, setDirection] = useState({ x: 1, y: 0 });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const generateFood = () => {
    let newFood;
    do {
      newFood = {
        x: Math.floor(Math.random() * SNAKE_BOARD_SIZE),
        y: Math.floor(Math.random() * SNAKE_BOARD_SIZE),
      };
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  };

  useEffect(() => {
    if (gameOver || isPaused) return;

    const gameLoop = setInterval(() => {
      setSnake(prevSnake => {
        const head = prevSnake[0];
        const newHead = {
          x: head.x + direction.x,
          y: head.y + direction.y,
        };

        // Check wall collision
        if (newHead.x < 0 || newHead.x >= SNAKE_BOARD_SIZE || newHead.y < 0 || newHead.y >= SNAKE_BOARD_SIZE) {
          setGameOver(true);
          return prevSnake;
        }

        // Check self collision
        if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
          setGameOver(true);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Check food collision
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore(prev => prev + 10);
          setFood(generateFood());
          return newSnake;
        }

        // Remove tail if no food eaten
        newSnake.pop();
        return newSnake;
      });
    }, 150);

    return () => clearInterval(gameLoop);
  }, [direction, food, snake, gameOver, isPaused]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (gameOver) {
        if (event.key === 'r' || event.key === 'к') {
          resetGame();
        }
        return;
      }

      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'ц':
          if (direction.y !== 1) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
        case 'ы':
          if (direction.y !== -1) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'ф':
          if (direction.x !== 1) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'в':
          if (direction.x !== -1) setDirection({ x: 1, y: 0 });
          break;
        case ' ':
        case 'p':
        case 'з':
          setIsPaused(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction, gameOver]);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setFood(generateFood());
    setDirection({ x: 1, y: 0 });
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
  };

  return (
    <section className="snake-game">
      <header className="snake-game__header">
        <div>
          <button className="snake-game__back" onClick={onBack} type="button">← Оюндар</button>
          <h1>Змейка</h1>
        </div>
        <div className="snake-game__stats">
          <span><small>УПАЙ</small><strong>{score}</strong></span>
        </div>
      </header>

      <div className="snake-game__board-container">
        {isPaused && <div className="snake-game__pause">АЯЛДАЛДЫ</div>}
        {gameOver && (
          <div className="snake-game__game-over">
            <h2>Оюн аяктады!</h2>
            <p>Упай: {score}</p>
            <button onClick={resetGame} type="button">Кайра баштоо</button>
          </div>
        )}
        <div className="snake-game__board">
          {Array(SNAKE_BOARD_SIZE).fill(null).map((_, rowIndex) => (
            <div key={rowIndex} className="snake-game__row">
              {Array(SNAKE_BOARD_SIZE).fill(null).map((_, colIndex) => {
                const isSnake = snake.some(segment => segment.x === colIndex && segment.y === rowIndex);
                const isHead = snake[0].x === colIndex && snake[0].y === rowIndex;
                const isFood = food.x === colIndex && food.y === rowIndex;
                return (
                  <div
                    key={colIndex}
                    className={`snake-game__cell ${isSnake ? 'snake-game__cell--snake' : ''} ${isHead ? 'snake-game__cell--head' : ''} ${isFood ? 'snake-game__cell--food' : ''}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="snake-game__controls">
          <p>Башкаруу:</p>
          <p>← → ↑ ↓ - Кыймыл</p>
          <p>Пробел - Аялдатуу</p>
        </div>
      </div>
    </section>
  );
}

function TetrisGame({ onBack }) {
  const [board, setBoard] = useState(() => 
    Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null))
  );
  const [currentPiece, setCurrentPiece] = useState(null);
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const getRandomPiece = () => {
    const pieces = Object.keys(TETRIS_PIECES);
    const randomKey = pieces[Math.floor(Math.random() * pieces.length)];
    return {
      shape: TETRIS_PIECES[randomKey].shape,
      color: TETRIS_PIECES[randomKey].color,
    };
  };

  const spawnPiece = () => {
    const piece = getRandomPiece();
    const x = Math.floor(BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2);
    const y = 0;
    
    if (checkCollision(piece.shape, x, y, board)) {
      setGameOver(true);
      return false;
    }
    
    setCurrentPiece(piece);
    setCurrentPosition({ x, y });
    return true;
  };

  const checkCollision = (shape, offsetX, offsetY, currentBoard) => {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const newX = offsetX + col;
          const newY = offsetY + row;
          
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return true;
          }
          
          if (newY >= 0 && currentBoard[newY][newX]) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const rotatePiece = (shape) => {
    const rows = shape.length;
    const cols = shape[0].length;
    const rotated = Array(cols).fill(null).map(() => Array(rows).fill(0));
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        rotated[col][rows - 1 - row] = shape[row][col];
      }
    }
    return rotated;
  };

  const lockPiece = () => {
    const newBoard = board.map(row => [...row]);
    
    for (let row = 0; row < currentPiece.shape.length; row++) {
      for (let col = 0; col < currentPiece.shape[row].length; col++) {
        if (currentPiece.shape[row][col]) {
          const y = currentPosition.y + row;
          const x = currentPosition.x + col;
          if (y >= 0) {
            newBoard[y][x] = currentPiece.color;
          }
        }
      }
    }
    
    // Clear lines
    let linesCleared = 0;
    for (let row = BOARD_HEIGHT - 1; row >= 0; row--) {
      if (newBoard[row].every(cell => cell !== null)) {
        newBoard.splice(row, 1);
        newBoard.unshift(Array(BOARD_WIDTH).fill(null));
        linesCleared++;
        row++;
      }
    }
    
    setScore(prev => prev + linesCleared * 100);
    setBoard(newBoard);
    
    if (!spawnPiece()) {
      setGameOver(true);
    }
  };

  const moveDown = () => {
    if (!currentPiece || gameOver || isPaused) return;
    
    if (!checkCollision(currentPiece.shape, currentPosition.x, currentPosition.y + 1, board)) {
      setCurrentPosition({ ...currentPosition, y: currentPosition.y + 1 });
    } else {
      lockPiece();
    }
  };

  const moveLeft = () => {
    if (!currentPiece || gameOver || isPaused) return;
    
    if (!checkCollision(currentPiece.shape, currentPosition.x - 1, currentPosition.y, board)) {
      setCurrentPosition({ ...currentPosition, x: currentPosition.x - 1 });
    }
  };

  const moveRight = () => {
    if (!currentPiece || gameOver || isPaused) return;
    
    if (!checkCollision(currentPiece.shape, currentPosition.x + 1, currentPosition.y, board)) {
      setCurrentPosition({ ...currentPosition, x: currentPosition.x + 1 });
    }
  };

  const rotate = () => {
    if (!currentPiece || gameOver || isPaused) return;
    
    const rotated = rotatePiece(currentPiece.shape);
    
    if (!checkCollision(rotated, currentPosition.x, currentPosition.y, board)) {
      setCurrentPiece({ ...currentPiece, shape: rotated });
    } else {
      // Wall kick - try moving left or right
      if (!checkCollision(rotated, currentPosition.x - 1, currentPosition.y, board)) {
        setCurrentPiece({ ...currentPiece, shape: rotated });
        setCurrentPosition({ ...currentPosition, x: currentPosition.x - 1 });
      } else if (!checkCollision(rotated, currentPosition.x + 1, currentPosition.y, board)) {
        setCurrentPiece({ ...currentPiece, shape: rotated });
        setCurrentPosition({ ...currentPosition, x: currentPosition.x + 1 });
      }
    }
  };

  useEffect(() => {
    if (!currentPiece && !gameOver) {
      spawnPiece();
    }
  }, [currentPiece, gameOver]);

  useEffect(() => {
    if (gameOver || isPaused) return;
    
    const gameLoop = setInterval(() => {
      moveDown();
    }, 1000);
    
    return () => clearInterval(gameLoop);
  }, [currentPiece, currentPosition, board, gameOver, isPaused]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (gameOver) {
        if (event.key === 'r' || event.key === 'к') {
          resetGame();
        }
        return;
      }
      
      switch (event.key) {
        case 'ArrowLeft':
        case 'a':
        case 'ф':
          moveLeft();
          break;
        case 'ArrowRight':
        case 'd':
        case 'в':
          moveRight();
          break;
        case 'ArrowDown':
        case 's':
        case 'ы':
          moveDown();
          break;
        case 'ArrowUp':
        case 'w':
        case 'ц':
          rotate();
          break;
        case ' ':
        case 'p':
        case 'з':
          setIsPaused(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPiece, currentPosition, board, gameOver, isPaused]);

  const resetGame = () => {
    setBoard(Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null)));
    setCurrentPiece(null);
    setCurrentPosition({ x: 0, y: 0 });
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
  };

  return (
    <section className="tetris-game">
      <header className="tetris-game__header">
        <div>
          <button className="tetris-game__back" onClick={onBack} type="button">← Оюндар</button>
          <h1>Тетрис</h1>
        </div>
        <div className="tetris-game__stats">
          <span><small>УПАЙ</small><strong>{score}</strong></span>
        </div>
      </header>

      <div className="tetris-game__board-container">
        {isPaused && <div className="tetris-game__pause">АЯЛДАЛДЫ</div>}
        {gameOver && (
          <div className="tetris-game__game-over">
            <h2>Оюн аяктады!</h2>
            <p>Упай: {score}</p>
            <button onClick={resetGame} type="button">Кайра баштоо</button>
          </div>
        )}
        <div className="tetris-game__board">
          {board.map((row, rowIndex) => (
            <div key={rowIndex} className="tetris-game__row">
              {row.map((cell, colIndex) => {
                const isCurrentPiece = currentPiece && 
                  currentPiece.shape.some((row, r) => 
                    row.some((cell, c) => 
                      cell && 
                      rowIndex === currentPosition.y + r && 
                      colIndex === currentPosition.x + c
                    )
                  );
                const color = isCurrentPiece ? currentPiece.color : cell;
                return (
                  <div
                    key={colIndex}
                    className={`tetris-game__cell ${color ? 'tetris-game__cell--filled' : ''}`}
                    style={{ backgroundColor: color || 'transparent' }}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="tetris-game__controls">
          <p>Башкаруу:</p>
          <p>← → - Кыймыл</p>
          <p>↑ - Буруу</p>
          <p>↓ - Тез түшүрүү</p>
          <p>Пробел - Аялдатуу</p>
        </div>
      </div>
    </section>
  );
}

function ChessGame({ onBack }) {
  const [board, setBoard] = useState(INITIAL_CHESS_BOARD);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState('white');
  const [status, setStatus] = useState('Акылардын жүрүүсү');
  const [gameMode, setGameMode] = useState(null); // 'bot' or 'player'
  const [isBotThinking, setIsBotThinking] = useState(false);

  const isValidMove = (fromRow, fromCol, toRow, toCol, piece, currentBoard) => {
    const pieceType = piece.toLowerCase();
    const isWhite = piece === piece.toUpperCase();
    const dx = toCol - fromCol;
    const dy = toRow - fromRow;
    const targetPiece = currentBoard[toRow][toCol];
    
    // Can't capture own piece
    if (targetPiece && (targetPiece === targetPiece.toUpperCase()) === isWhite) {
      return false;
    }

    switch (pieceType) {
      case 'p': // Pawn
        const direction = isWhite ? -1 : 1;
        const startRow = isWhite ? 6 : 1;
        
        // Forward move
        if (dx === 0 && dy === direction && !targetPiece) {
          return true;
        }
        // Double move from start
        if (dx === 0 && dy === 2 * direction && fromRow === startRow && !targetPiece && !currentBoard[fromRow + direction][fromCol]) {
          return true;
        }
        // Diagonal capture
        if (Math.abs(dx) === 1 && dy === direction && targetPiece) {
          return true;
        }
        return false;

      case 'r': // Rook
        if (dx !== 0 && dy !== 0) return false;
        // Check path is clear
        if (dx !== 0) {
          const step = dx > 0 ? 1 : -1;
          for (let col = fromCol + step; col !== toCol; col += step) {
            if (currentBoard[fromRow][col]) return false;
          }
        } else {
          const step = dy > 0 ? 1 : -1;
          for (let row = fromRow + step; row !== toRow; row += step) {
            if (currentBoard[row][fromCol]) return false;
          }
        }
        return true;

      case 'n': // Knight
        return (Math.abs(dx) === 2 && Math.abs(dy) === 1) || (Math.abs(dx) === 1 && Math.abs(dy) === 2);

      case 'b': // Bishop
        if (Math.abs(dx) !== Math.abs(dy)) return false;
        const stepX = dx > 0 ? 1 : -1;
        const stepY = dy > 0 ? 1 : -1;
        let checkRow = fromRow + stepY;
        let checkCol = fromCol + stepX;
        while (checkRow !== toRow && checkCol !== toCol) {
          if (currentBoard[checkRow][checkCol]) return false;
          checkRow += stepY;
          checkCol += stepX;
        }
        return true;

      case 'q': // Queen
        // Rook movement
        if (dx === 0 || dy === 0) {
          if (dx !== 0) {
            const step = dx > 0 ? 1 : -1;
            for (let col = fromCol + step; col !== toCol; col += step) {
              if (currentBoard[fromRow][col]) return false;
            }
          } else {
            const step = dy > 0 ? 1 : -1;
            for (let row = fromRow + step; row !== toRow; row += step) {
              if (currentBoard[row][fromCol]) return false;
            }
          }
          return true;
        }
        // Bishop movement
        if (Math.abs(dx) === Math.abs(dy)) {
          const stepX = dx > 0 ? 1 : -1;
          const stepY = dy > 0 ? 1 : -1;
          let checkRow = fromRow + stepY;
          let checkCol = fromCol + stepX;
          while (checkRow !== toRow && checkCol !== toCol) {
            if (currentBoard[checkRow][checkCol]) return false;
            checkRow += stepY;
            checkCol += stepX;
          }
          return true;
        }
        return false;

      case 'k': // King
        return Math.abs(dx) <= 1 && Math.abs(dy) <= 1;

      default:
        return false;
    }
  };

  const handleSquareClick = (row, col) => {
    if (gameMode === 'bot' && currentPlayer === 'black' && isBotThinking) return;
    
    if (selectedSquare) {
      const [fromRow, fromCol] = selectedSquare;
      const piece = board[fromRow][fromCol];
      
      if (piece && isValidMove(fromRow, fromCol, row, col, piece, board)) {
        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = piece;
        newBoard[fromRow][fromCol] = '';
        setBoard(newBoard);
        setSelectedSquare(null);
        const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
        setCurrentPlayer(nextPlayer);
        setStatus(nextPlayer === 'white' ? 'Акылардын жүрүүсү' : 'Каралардын жүрүүсү');
        
        // Bot move
        if (gameMode === 'bot' && nextPlayer === 'black') {
          setIsBotThinking(true);
          setTimeout(() => makeBotMove(newBoard), 500);
        }
      } else {
        setSelectedSquare(null);
      }
    } else {
      const piece = board[row][col];
      if (piece) {
        const isWhitePiece = piece === piece.toUpperCase();
        if ((currentPlayer === 'white' && isWhitePiece) || (currentPlayer === 'black' && !isWhitePiece)) {
          setSelectedSquare([row, col]);
        }
      }
    }
  };

  const makeBotMove = (currentBoard) => {
    const blackPieces = [];
    currentBoard.forEach((row, rowIndex) => {
      row.forEach((piece, colIndex) => {
        if (piece && piece === piece.toLowerCase()) {
          blackPieces.push({ row: rowIndex, col: colIndex, piece });
        }
      });
    });

    if (blackPieces.length === 0) return;

    const allPossibleMoves = [];
    
    blackPieces.forEach(({ row, col, piece }) => {
      for (let toRow = 0; toRow < 8; toRow++) {
        for (let toCol = 0; toCol < 8; toCol++) {
          if (isValidMove(row, col, toRow, toCol, piece, currentBoard)) {
            allPossibleMoves.push({ fromRow: row, fromCol: col, toRow, toCol, piece });
          }
        }
      }
    });

    if (allPossibleMoves.length > 0) {
      const randomMove = allPossibleMoves[Math.floor(Math.random() * allPossibleMoves.length)];
      const newBoard = currentBoard.map(r => [...r]);
      newBoard[randomMove.toRow][randomMove.toCol] = randomMove.piece;
      newBoard[randomMove.fromRow][randomMove.fromCol] = '';
      setBoard(newBoard);
      setCurrentPlayer('white');
      setStatus('Акылардын жүрүүсү');
    }
    
    setIsBotThinking(false);
  };

  const resetGame = () => {
    setBoard(INITIAL_CHESS_BOARD);
    setSelectedSquare(null);
    setCurrentPlayer('white');
    setStatus('Акылардын жүрүүсү');
  };

  if (!gameMode) {
    return (
      <section className="chess-game">
        <header className="chess-game__header">
          <div>
            <button className="chess-game__back" onClick={onBack} type="button">← Оюндар</button>
            <h1>Шахматы</h1>
          </div>
        </header>
        <div className="chess-game__mode-selection">
          <h2>Оюн режимин тандаңыз</h2>
          <div className="chess-game__mode-buttons">
            <button className="chess-game__mode-btn" onClick={() => setGameMode('player')} type="button">
              <span className="chess-game__mode-icon">👥</span>
              <strong>Эки оюнчу</strong>
              <span>Дос менен ойноо</span>
            </button>
            <button className="chess-game__mode-btn" onClick={() => setGameMode('bot')} type="button">
              <span className="chess-game__mode-icon">🤖</span>
              <strong>Бот менен</strong>
              <span>Компьютер менен ойноо</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="chess-game">
      <header className="chess-game__header">
        <div>
          <button className="chess-game__back" onClick={onBack} type="button">← Оюндар</button>
          <h1>Шахматы</h1>
        </div>
        <div className="chess-game__stats">
          <span><small>ЖҮРҮҮ</small><strong>{currentPlayer === 'white' ? 'АКЫЛАР' : 'КАРАЛАР'}</strong></span>
        </div>
      </header>

      <div className="chess-game__board-container">
        <div className="chess-game__status">{status}</div>
        <div className="chess-game__board">
          {board.map((row, rowIndex) => (
            <div key={rowIndex} className="chess-game__row">
              {row.map((piece, colIndex) => {
                const isLight = (rowIndex + colIndex) % 2 === 0;
                const isSelected = selectedSquare && selectedSquare[0] === rowIndex && selectedSquare[1] === colIndex;
                return (
                  <button
                    key={colIndex}
                    className={`chess-game__square chess-game__square--${isLight ? 'light' : 'dark'}${isSelected ? ' is-selected' : ''}`}
                    onClick={() => handleSquareClick(rowIndex, colIndex)}
                    type="button"
                  >
                    {piece && (
                      <span className={`chess-game__piece ${piece === piece.toUpperCase() ? 'chess-game__piece--white' : 'chess-game__piece--black'}`}>
                        {PIECE_SYMBOLS[piece]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <button className="chess-game__reset" onClick={resetGame} type="button">Кайра баштоо</button>
      </div>
    </section>
  );
}

export default function Games() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentGame, setCurrentGame] = useState(null);
  const [player, setPlayer] = useState({ x: 50, y: 78 });
  const [direction, setDirection] = useState("up");
  const [speed, setSpeed] = useState(2);
  const [bots, setBots] = useState(INITIAL_BOTS);
  const [projectile, setProjectile] = useState(null);
  const [isReloading, setIsReloading] = useState(false);
  const [shots, setShots] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState("Үч ботту жок кылыңыз");
  const [botProjectiles, setBotProjectiles] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [playerDestroyed, setPlayerDestroyed] = useState(false);
  const timersRef = useRef([]);
  const playerRef = useRef(player);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    if (!isPlaying) return undefined;

    const movementInterval = window.setInterval(() => {
      setBots((currentBots) => currentBots.map((bot) => {
        if (!bot.alive) return bot;

        const botSpeed = 2;
        const currentAngle = (bot.direction * Math.PI) / 180;
        const nextX = clamp(bot.x + Math.cos(currentAngle) * botSpeed);
        const nextY = clamp(bot.y + Math.sin(currentAngle) * botSpeed);

        const shouldTurn = Math.random() < 0.15;
        const nextDirection = shouldTurn ? (Math.random() * Math.PI * 2) * (180 / Math.PI) : bot.direction;

        return {
          ...bot,
          x: nextX,
          y: nextY,
          direction: nextDirection,
        };
      }));
    }, 620);

    return () => window.clearInterval(movementInterval);
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying || gameOver) return undefined;

    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (key === 'w' || key === 'ц') move('up');
      if (key === 's' || key === 'ы') move('down');
      if (key === 'a' || key === 'ф') move('left');
      if (key === 'd' || key === 'в') move('right');
      if (key === ' ' || key === 'e' || key === 'у') fire();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, gameOver, direction, speed]);

  useEffect(() => {
    if (!isPlaying || gameOver) return undefined;

    const shootingInterval = window.setInterval(() => {
      setBots((currentBots) => {
        const aliveBots = currentBots.filter((bot) => bot.alive);
        if (aliveBots.length === 0) return currentBots;

        const shootingBot = aliveBots[Math.floor(Math.random() * aliveBots.length)];
        const target = playerRef.current;
        const deltaX = target.x - shootingBot.x;
        const deltaY = target.y - shootingBot.y;
        const distance = Math.hypot(deltaX, deltaY) || 1;

        const newProjectile = {
          id: Date.now(),
          botId: shootingBot.id,
          startX: shootingBot.x,
          startY: shootingBot.y,
          endX: clamp(shootingBot.x + (deltaX / distance) * 90),
          endY: clamp(shootingBot.y + (deltaY / distance) * 90),
        };

        setBotProjectiles((current) => [...current, newProjectile]);

        addTimer(() => {
          setBotProjectiles((current) => current.filter((p) => p.id !== newProjectile.id));
          
          const currentTarget = playerRef.current;
          
          // Check if projectile line segment passes close to player
          const dx = newProjectile.endX - newProjectile.startX;
          const dy = newProjectile.endY - newProjectile.startY;
          const length = Math.hypot(dx, dy) || 1;
          
          // Project player position onto the line
          const t = Math.max(0, Math.min(1, ((currentTarget.x - newProjectile.startX) * dx + (currentTarget.y - newProjectile.startY) * dy) / (length * length)));
          const closestX = newProjectile.startX + t * dx;
          const closestY = newProjectile.startY + t * dy;
          
          const hitDistance = Math.hypot(currentTarget.x - closestX, currentTarget.y - closestY);
          
          if (hitDistance < 8) {
            setGameOver(true);
            setPlayerDestroyed(true);
            setStatus("Сиз уулдунуз! Оюн аяктады.");
          }
        }, 800);

        return currentBots;
      });
    }, 2000 + Math.random() * 1500);

    return () => window.clearInterval(shootingInterval);
  }, [isPlaying, gameOver]);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const addTimer = (callback, delay) => {
    const timer = window.setTimeout(callback, delay);
    timersRef.current.push(timer);
  };

  const move = (nextDirection) => {
    const movement = DIRECTION_DATA[nextDirection];
    const step = SPEEDS[speed].step;
    setDirection(nextDirection);
    setPlayer((current) => ({
      x: clamp(current.x + movement.dx * step),
      y: clamp(current.y + movement.dy * step),
    }));
    setStatus(`${SPEEDS[speed].label} ылдамдыкта жүрүүдө`);
  };

  const fire = () => {
    if (isReloading) return;

    const movement = DIRECTION_DATA[direction];
    const end = { x: clamp(player.x + movement.dx * 90), y: clamp(player.y + movement.dy * 90) };

    setShots((current) => current + 1);
    setIsReloading(true);
    setProjectile({ id: Date.now(), startX: player.x, startY: player.y, endX: end.x, endY: end.y });
    setStatus("Снаряд учууда...");

    addTimer(() => {
      setProjectile(null);
      
      const hitBot = bots.find((bot) => {
        if (!bot.alive) return false;
        
        // Check if projectile line segment passes close to bot
        const dx = end.x - player.x;
        const dy = end.y - player.y;
        const length = Math.hypot(dx, dy) || 1;
        
        // Project bot position onto the line
        const t = Math.max(0, Math.min(1, ((bot.x - player.x) * dx + (bot.y - player.y) * dy) / (length * length)));
        const closestX = player.x + t * dx;
        const closestY = player.y + t * dy;
        
        const distance = Math.hypot(bot.x - closestX, bot.y - closestY);
        return distance < 6;
      });

      if (hitBot) {
        setBots((current) => current.map((bot) => bot.id === hitBot.id ? { ...bot, alive: false } : bot));
        setScore((current) => current + 100);
        const remaining = bots.filter((bot) => bot.alive && bot.id !== hitBot.id).length;
        setStatus(remaining ? `Бот жок кылынды! Дагы ${remaining} бот калды` : "Жеңиш! Бардык боттор жок кылынды");
      } else {
        setStatus("Мелжеген жерге тийген жок");
      }
    }, 440);

    addTimer(() => setIsReloading(false), 700);
  };

  const resetGame = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    setPlayer({ x: 50, y: 78 });
    setDirection("up");
    setSpeed(2);
    setBots(INITIAL_BOTS);
    setProjectile(null);
    setIsReloading(false);
    setShots(0);
    setScore(0);
    setStatus("Үч ботту жок кылыңыз");
    setBotProjectiles([]);
    setGameOver(false);
    setPlayerDestroyed(false);
  };

  if (!isPlaying) {
    return (
      <section className="games-hub">
        <header className="games-hub__header">
          <span>КҮЖҮРМӨН АСКЕР 1.0</span>
          <h1>Оюндар</h1>
          <p>Көңүл бурууну жана тактыкты өнүктүрүүчү интерактивдүү оюндар.</p>
        </header>
        <div className="games-hub__grid">
          <button className="game-card game-card--tanks" onClick={() => { setIsPlaying(true); setCurrentGame('tanks'); }} type="button">
            <span className="game-card__preview game-card__preview--top" aria-hidden="true">
              <span className="game-card__preview-tank"><TopTank /></span>
              <i className="game-card__crosshair" />
            </span>
            <span className="game-card__content">
              <small>ҮСТҮНКҮ КӨРҮНҮШ · 1 × 3</small>
              <strong>Танки</strong>
              <span>Бир танкты башкарып, үч ботту жок кылыңыз</span>
            </span>
            <span className="game-card__start">Оюнду баштоо →</span>
          </button>
          <button className="game-card game-card--chess" onClick={() => { setIsPlaying(true); setCurrentGame('chess'); }} type="button">
            <span className="game-card__preview game-card__preview--chess" aria-hidden="true">
              <span className="game-card__preview-chess-board">
                <span className="chess-square chess-square--white" />
                <span className="chess-square chess-square--black" />
                <span className="chess-square chess-square--black" />
                <span className="chess-square chess-square--white" />
              </span>
            </span>
            <span className="game-card__content">
              <small>СТРАТЕГИЯ · 2 ОЮНЧУ</small>
              <strong>Шахматы</strong>
              <span>Классикалык шахмат оюну</span>
            </span>
            <span className="game-card__start">Оюнду баштоо →</span>
          </button>
          <button className="game-card game-card--tetris" onClick={() => { setIsPlaying(true); setCurrentGame('tetris'); }} type="button">
            <span className="game-card__preview game-card__preview--tetris" aria-hidden="true">
              <span className="game-card__preview-tetris">
                <span className="tetris-block tetris-block--i" />
                <span className="tetris-block tetris-block--o" />
                <span className="tetris-block tetris-block--t" />
              </span>
            </span>
            <span className="game-card__content">
              <small>ГАЗЫЛДЫК · 1 ОЮНЧУ</small>
              <strong>Тетрис</strong>
              <span>Классикалык тетрис оюну</span>
            </span>
            <span className="game-card__start">Оюнду баштоо →</span>
          </button>
          <button className="game-card game-card--snake" onClick={() => { setIsPlaying(true); setCurrentGame('snake'); }} type="button">
            <span className="game-card__preview game-card__preview--snake" aria-hidden="true">
              <span className="game-card__preview-snake">
                <span className="snake-segment snake-segment--head" />
                <span className="snake-segment snake-segment--body" />
                <span className="snake-segment snake-segment--body" />
                <span className="snake-food" />
              </span>
            </span>
            <span className="game-card__content">
              <small>ГАЗЫЛДЫК · 1 ОЮНЧУ</small>
              <strong>Змейка</strong>
              <span>Классикалык змейка оюну</span>
            </span>
            <span className="game-card__start">Оюнду баштоо →</span>
          </button>
        </div>
      </section>
    );
  }

  const aliveBots = bots.filter((bot) => bot.alive).length;

  if (currentGame === 'chess') {
    return <ChessGame onBack={() => { setIsPlaying(false); setCurrentGame(null); }} />;
  }

  if (currentGame === 'tetris') {
    return <TetrisGame onBack={() => { setIsPlaying(false); setCurrentGame(null); }} />;
  }

  if (currentGame === 'snake') {
    return <SnakeGame onBack={() => { setIsPlaying(false); setCurrentGame(null); }} />;
  }

  return (
    <section className="tank-game tank-game--top-view">
      <header className="tank-game__header">
        <div>
          <button className="tank-game__back" onClick={() => setIsPlaying(false)} type="button">← Оюндар</button>
          <h1>Танки</h1>
        </div>
        <div className="tank-game__stats">
          <span><small>БОТТОР</small><strong>{aliveBots}/3</strong></span>
          <span><small>УПАЙ</small><strong>{score}</strong></span>
          <span><small>АТУУ</small><strong>{shots}</strong></span>
        </div>
      </header>

      <div className="tank-game__arena tank-game__arena--top">
        <div className="tank-game__terrain" />
        <span className="tank-game__road tank-game__road--horizontal" />
        <span className="tank-game__road tank-game__road--vertical" />
        <span className="tank-game__base tank-game__base--enemy">БОТТОРДУН БАЗАСЫ</span>
        <span className="tank-game__base tank-game__base--player">ОЮНЧУНУН БАЗАСЫ</span>
        <span className="tank-game__wall tank-game__wall--top" />
        <span className="tank-game__wall tank-game__wall--bottom" />
        <span className="tank-game__wall tank-game__wall--left" />
        <span className="tank-game__wall tank-game__wall--right" />

        {bots.map((bot) => (
          <div
            className={`tank-game__top-unit tank-game__top-unit--bot${bot.alive ? "" : " is-destroyed"}`}
            key={bot.id}
            style={{ left: `${bot.x}%`, top: `${bot.y}%`, "--unit-angle": `${bot.direction}deg` }}
          >
            {bot.alive ? <TopTank bot /> : <span className="tank-game__wreck">✦</span>}
            {bot.alive ? <small>BOT {bot.id}</small> : null}
          </div>
        ))}

        <div
          className={`tank-game__top-unit tank-game__top-unit--player${playerDestroyed ? " is-destroyed" : ""}`}
          style={{ left: `${player.x}%`, top: `${player.y}%`, "--unit-angle": `${DIRECTION_DATA[direction].angle}deg` }}
        >
          {playerDestroyed ? <span className="tank-game__wreck">✦</span> : <TopTank />}
          {!playerDestroyed ? <small>СИЗ</small> : null}
        </div>

        {projectile ? (
          <span
            className="tank-game__top-projectile"
            key={projectile.id}
            style={{
              "--start-x": `${projectile.startX}%`,
              "--start-y": `${projectile.startY}%`,
              "--end-x": `${projectile.endX}%`,
              "--end-y": `${projectile.endY}%`,
            }}
          />
        ) : null}

        {botProjectiles.map((bp) => (
          <span
            className="tank-game__top-projectile tank-game__top-projectile--enemy"
            key={bp.id}
            style={{
              "--start-x": `${bp.startX}%`,
              "--start-y": `${bp.startY}%`,
              "--end-x": `${bp.endX}%`,
              "--end-y": `${bp.endY}%`,
            }}
          />
        ))}

        <div className="tank-game__status" aria-live="polite">{status}</div>

        {gameOver && (
          <div className="tank-game__game-over-modal">
            <h2 className="tank-game__game-over-title">Сиз уулдунуз! Оюн аяктады.</h2>
            <button className="tank-game__game-over-restart" onClick={resetGame} type="button">
              Кайра баштоо
            </button>
          </div>
        )}
      </div>

      <div className="tank-game__control-panel">
        <div className="tank-game__dpad" aria-label="Танкты башкаруу">
          <button aria-label="Өйдө" disabled={gameOver} onClick={() => move("up")} type="button">↑</button>
          <button aria-label="Солго" disabled={gameOver} onClick={() => move("left")} type="button">←</button>
          <span />
          <button aria-label="Оңго" disabled={gameOver} onClick={() => move("right")} type="button">→</button>
          <button aria-label="Төмөн" disabled={gameOver} onClick={() => move("down")} type="button">↓</button>
        </div>

        <label className="tank-game__speed">
          <span>ТАНКТЫН ЫЛДАМДЫГЫ</span>
          <input
            aria-label="Танктын ылдамдыгы"
            disabled={gameOver}
            max="3"
            min="1"
            onChange={(event) => setSpeed(Number(event.target.value))}
            step="1"
            type="range"
            value={speed}
          />
          <strong>{SPEEDS[speed].label}</strong>
          <small>1</small><small>2</small><small>3</small>
        </label>

        <button className="tank-game__fire" disabled={isReloading || gameOver} onClick={fire} type="button">
          <span>{isReloading ? "ОКТОЛУУДА" : "ОК ЧЫГАРУУ"}</span>
          <small>{isReloading ? "Күтүңүз" : "FIRE"}</small>
        </button>
        <button className="tank-game__reset" onClick={resetGame} type="button">Кайра баштоо</button>
      </div>
    </section>
  );
}
