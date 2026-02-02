/**
 * Gomoku (Five in a Row) Game Engine
 * Pure logic module — no DOM/Canvas dependencies.
 *
 * Board coordinates: board[y][x] where (0,0) is top-left.
 * Players: 1 = black (goes first), 2 = white.
 *
 * @module game
 */

// The four direction vectors to check for five-in-a-row.
// Each pair [dx, dy] is scanned in both directions (positive and negative).
const DIRECTIONS = [
  [1, 0],  // horizontal  →
  [0, 1],  // vertical    ↓
  [1, 1],  // diagonal    ↘
  [1, -1], // diagonal    ↗
];

export class GameEngine {
  /**
   * @param {number} [size=15] Board dimension (size × size).
   */
  constructor(size = 15) {
    if (!Number.isInteger(size) || size < 5) {
      throw new RangeError('Board size must be an integer ≥ 5');
    }
    this.size = size;
    this.reset();
  }

  // ---------------------------------------------------------------------------
  // State management
  // ---------------------------------------------------------------------------

  /** Reset the board to initial empty state. */
  reset() {
    this.board = this._createEmptyBoard();
    this.currentPlayer = 1; // black first
    this.moveHistory = [];
    this.gameOver = false;
    this.winner = 0; // 0=none, 1=black, 2=white, 3=draw
    this._winLine = null; // cached winning line
  }

  // ---------------------------------------------------------------------------
  // Core moves
  // ---------------------------------------------------------------------------

  /**
   * Place a stone at (x, y) for the current player.
   *
   * @param {number} x Column index (0-based).
   * @param {number} y Row index (0-based).
   * @returns {{ valid: boolean, winner?: number, winLine?: Array<{x:number,y:number}>, reason?: string }}
   */
  placeStone(x, y) {
    if (this.gameOver) {
      return { valid: false, reason: 'Game is already over' };
    }

    if (!this.isValidMove(x, y)) {
      if (!this._inBounds(x, y)) {
        return { valid: false, reason: 'Position out of bounds' };
      }
      return { valid: false, reason: 'Cell is already occupied' };
    }

    const player = this.currentPlayer;

    // Place the stone
    this.board[y][x] = player;
    this.moveHistory.push({
      x,
      y,
      player,
      moveNumber: this.moveHistory.length + 1,
    });

    // Check for win
    const winResult = this.checkWin(x, y, player);
    if (winResult.won) {
      this.gameOver = true;
      this.winner = player;
      this._winLine = winResult.line;
      return { valid: true, winner: player, winLine: winResult.line };
    }

    // Check for draw
    if (this.isBoardFull()) {
      this.gameOver = true;
      this.winner = 3;
      return { valid: true, winner: 3, winLine: null };
    }

    // Switch player
    this.currentPlayer = player === 1 ? 2 : 1;
    return { valid: true, winner: 0, winLine: null };
  }

  /**
   * Undo the most recent move.
   *
   * @returns {{ x: number, y: number, player: number, moveNumber: number } | null}
   *          The removed move, or null if history is empty.
   */
  undoMove() {
    if (this.moveHistory.length === 0) return null;

    const move = this.moveHistory.pop();
    this.board[move.y][move.x] = 0;
    this.currentPlayer = move.player; // restore turn to the player who made the undone move
    this.gameOver = false;
    this.winner = 0;
    this._winLine = null;
    return move;
  }

  // ---------------------------------------------------------------------------
  // Validation helpers
  // ---------------------------------------------------------------------------

  /**
   * Check whether (x, y) is a legal move (in bounds and empty).
   *
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  isValidMove(x, y) {
    return this._inBounds(x, y) && this.board[y][x] === 0;
  }

  /** @private */
  _inBounds(x, y) {
    return (
      Number.isInteger(x) &&
      Number.isInteger(y) &&
      x >= 0 &&
      x < this.size &&
      y >= 0 &&
      y < this.size
    );
  }

  // ---------------------------------------------------------------------------
  // Win detection
  // ---------------------------------------------------------------------------

  /**
   * After a stone is placed at (x, y), check whether that player has won.
   *
   * Standard Gomoku rule: exactly 5 in a row wins. An overline (6+) does
   * **not** count as a win (this is the "standard" / renju-style rule; set
   * `GameEngine.ALLOW_OVERLINE = true` to relax this).
   *
   * @param {number} x
   * @param {number} y
   * @param {number} player 1 or 2
   * @returns {{ won: boolean, line: Array<{x:number,y:number}> | null }}
   */
  checkWin(x, y, player) {
    for (const [dx, dy] of DIRECTIONS) {
      const line = this._collectLine(x, y, dx, dy, player);
      if (GameEngine.ALLOW_OVERLINE) {
        if (line.length >= 5) return { won: true, line: line.slice(0, 5) };
      } else {
        if (line.length === 5) return { won: true, line };
      }
    }
    return { won: false, line: null };
  }

  /**
   * Collect all contiguous stones of `player` through (x, y) along one axis.
   *
   * @private
   * @param {number} x  Origin column.
   * @param {number} y  Origin row.
   * @param {number} dx Direction delta x.
   * @param {number} dy Direction delta y.
   * @param {number} player
   * @returns {Array<{x:number,y:number}>} The full contiguous line including origin.
   */
  _collectLine(x, y, dx, dy, player) {
    const cells = [{ x, y }];

    // Scan in the positive direction
    for (let i = 1; ; i++) {
      const nx = x + dx * i;
      const ny = y + dy * i;
      if (!this._inBounds(nx, ny) || this.board[ny][nx] !== player) break;
      cells.push({ x: nx, y: ny });
    }

    // Scan in the negative direction
    for (let i = 1; ; i++) {
      const nx = x - dx * i;
      const ny = y - dy * i;
      if (!this._inBounds(nx, ny) || this.board[ny][nx] !== player) break;
      cells.unshift({ x: nx, y: ny }); // prepend so the line stays ordered
    }

    return cells;
  }

  /** Whether the board has no empty cells left. */
  isBoardFull() {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.board[y][x] === 0) return false;
      }
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  /**
   * Return a plain, JSON-serializable snapshot of the game state.
   *
   * @returns {object}
   */
  getState() {
    return {
      size: this.size,
      board: this.cloneBoard(),
      currentPlayer: this.currentPlayer,
      moveHistory: this.moveHistory.map((m) => ({ ...m })),
      gameOver: this.gameOver,
      winner: this.winner,
      winLine: this._winLine ? this._winLine.map((c) => ({ ...c })) : null,
    };
  }

  /**
   * Restore the engine from a previously saved state.
   *
   * @param {object} state Object obtained from `getState()`.
   */
  loadState(state) {
    if (!state || !Array.isArray(state.board)) {
      throw new TypeError('Invalid state object');
    }
    this.size = state.size;
    this.board = state.board.map((row) => [...row]);
    this.currentPlayer = state.currentPlayer;
    this.moveHistory = state.moveHistory.map((m) => ({ ...m }));
    this.gameOver = state.gameOver;
    this.winner = state.winner;
    this._winLine = state.winLine
      ? state.winLine.map((c) => ({ ...c }))
      : null;
  }

  // ---------------------------------------------------------------------------
  // AI helpers
  // ---------------------------------------------------------------------------

  /**
   * All empty cells on the board.
   *
   * @returns {Array<{x:number, y:number}>}
   */
  getValidMoves() {
    const moves = [];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.board[y][x] === 0) moves.push({ x, y });
      }
    }
    return moves;
  }

  /**
   * Return empty cells within `radius` of any existing stone.
   * Falls back to the center cell if the board is empty.
   * This is a major speed-up for minimax / evaluation searches.
   *
   * @param {number} [radius=2] Manhattan-like square radius.
   * @returns {Array<{x:number, y:number}>}
   */
  getSmartMoves(radius = 2) {
    const seen = new Set();
    const moves = [];
    let hasStones = false;

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.board[y][x] !== 0) {
          hasStones = true;
          // Scan the square neighbourhood
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (!this._inBounds(nx, ny)) continue;
              if (this.board[ny][nx] !== 0) continue;
              const key = ny * this.size + nx;
              if (seen.has(key)) continue;
              seen.add(key);
              moves.push({ x: nx, y: ny });
            }
          }
        }
      }
    }

    // Empty board — suggest center
    if (!hasStones) {
      const c = Math.floor(this.size / 2);
      moves.push({ x: c, y: c });
    }

    return moves;
  }

  /**
   * Deep-copy the board (2D array).
   *
   * @returns {number[][]}
   */
  cloneBoard() {
    return this.board.map((row) => [...row]);
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  /** @private */
  _createEmptyBoard() {
    return Array.from({ length: this.size }, () =>
      new Array(this.size).fill(0),
    );
  }
}

/**
 * When `true`, 6+ in a row also counts as a win.
 * When `false` (default), only exactly 5 wins (standard Gomoku / Renju rule).
 */
GameEngine.ALLOW_OVERLINE = false;

// ---------------------------------------------------------------------------
// Game – high-level UI wrapper around GameEngine
// ---------------------------------------------------------------------------

/**
 * Friendly wrapper used by the UI layer (app.js).
 * Translates between the engine's numeric player IDs (1/2) and colour strings
 * ('black'/'white'), and exposes a simpler API.
 */
export class Game {
  /**
   * @param {number} [size=15]
   */
  constructor(size = 15) {
    /** @type {GameEngine} */
    this._engine = new GameEngine(size);
    /** @type {{ winner: number, winLine: Array|null }|null} */
    this._lastResult = null;
  }

  /* ── Getters ──────────────────────────────────────────────────── */

  /** Is the game finished? */
  get isOver() {
    return this._engine.gameOver;
  }

  /** 'black' | 'white' | 'draw' | null */
  get winner() {
    switch (this._engine.winner) {
      case 1: return 'black';
      case 2: return 'white';
      case 3: return 'draw';
      default: return null;
    }
  }

  /** Whose turn is it? 'black' | 'white' */
  get currentPlayer() {
    return this._engine.currentPlayer === 1 ? 'black' : 'white';
  }

  /** Array of { x, y, color, moveNumber } */
  get moveHistory() {
    return this._engine.moveHistory.map((m) => ({
      x: m.x,
      y: m.y,
      color: m.player === 1 ? 'black' : 'white',
      moveNumber: m.moveNumber,
    }));
  }

  /** Win line cells [{x,y}, …] or null */
  get winLine() {
    return this._engine._winLine;
  }

  /** Raw board access (for AI integration etc.) */
  get board() {
    return this._engine.board;
  }

  get size() {
    return this._engine.size;
  }

  /* ── Actions ──────────────────────────────────────────────────── */

  /**
   * Place a stone for the current player.
   * @returns {string|null} The colour that was placed, or null if invalid.
   */
  makeMove(x, y) {
    const player = this._engine.currentPlayer;
    const color = player === 1 ? 'black' : 'white';
    const result = this._engine.placeStone(x, y);
    if (!result.valid) return null;
    this._lastResult = result;
    return color;
  }

  /** Get the result of the last move (winner, winLine, etc.) */
  get lastResult() {
    return this._lastResult;
  }

  /** Reset the game to initial state. */
  reset() {
    this._engine.reset();
    this._lastResult = null;
  }

  /**
   * Undo the last move.
   * @returns {{ x: number, y: number, color: string }|null}
   */
  undo() {
    const move = this._engine.undoMove();
    if (!move) return null;
    this._lastResult = null;
    return {
      x: move.x,
      y: move.y,
      color: move.player === 1 ? 'black' : 'white',
    };
  }

  /** Check whether a cell is valid for the current player. */
  isValidMove(x, y) {
    return this._engine.isValidMove(x, y);
  }
}
