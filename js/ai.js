/**
 * Gomoku AI Engine
 * Minimax with alpha-beta pruning, pattern recognition, and 4 difficulty levels.
 * Pure logic — no DOM dependencies.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const BOARD_SIZE = 15;

const INF = 1e9;
const WIN_SCORE = 1e8;

// Pattern scores
const SCORES = {
  FIVE:           10000000,
  OPEN_FOUR:       1000000,
  HALF_OPEN_FOUR:   100000,
  OPEN_THREE:        10000,
  HALF_OPEN_THREE:    1000,
  OPEN_TWO:            100,
  HALF_OPEN_TWO:        10,
  OPEN_ONE:              1,
};

// Four directions to scan: horizontal, vertical, diagonal-down-right, diagonal-down-left
const DIRECTIONS = [
  [0, 1],   // horizontal →
  [1, 0],   // vertical ↓
  [1, 1],   // diagonal ↘
  [1, -1],  // diagonal ↙
];

// ─── Opening Book (for Master difficulty) ────────────────────────────────────

const CENTER = Math.floor(BOARD_SIZE / 2); // 7

const OPENING_BOOK = [
  // First move: always center
  {
    condition: (board) => countStones(board) === 0,
    move: { x: CENTER, y: CENTER },
  },
  // Second move (as white): play adjacent to center
  {
    condition: (board) => countStones(board) === 1 && board[CENTER][CENTER] !== EMPTY,
    moves: [
      { x: CENTER - 1, y: CENTER - 1 },
      { x: CENTER - 1, y: CENTER + 1 },
      { x: CENTER + 1, y: CENTER - 1 },
      { x: CENTER + 1, y: CENTER + 1 },
    ],
  },
  // Second move (as white): opponent didn't play center — take it
  {
    condition: (board) => countStones(board) === 1 && board[CENTER][CENTER] === EMPTY,
    move: { x: CENTER, y: CENTER },
  },
  // Third move (as black after center): play knight's move from center
  {
    condition: (board) => countStones(board) === 2 && board[CENTER][CENTER] !== EMPTY,
    generator: (board, player) => {
      // Find opponent stone, play on opposite side of center or an aggressive diagonal
      const knightMoves = [
        { x: CENTER - 2, y: CENTER - 1 },
        { x: CENTER - 2, y: CENTER + 1 },
        { x: CENTER - 1, y: CENTER - 2 },
        { x: CENTER - 1, y: CENTER + 2 },
        { x: CENTER + 1, y: CENTER - 2 },
        { x: CENTER + 1, y: CENTER + 2 },
        { x: CENTER + 2, y: CENTER - 1 },
        { x: CENTER + 2, y: CENTER + 1 },
      ];
      const valid = knightMoves.filter(m =>
        m.x >= 0 && m.x < BOARD_SIZE && m.y >= 0 && m.y < BOARD_SIZE && board[m.x][m.y] === EMPTY
      );
      return valid.length > 0 ? valid[Math.floor(Math.random() * valid.length)] : null;
    },
  },
];

// ─── Utility Functions ───────────────────────────────────────────────────────

function countStones(board) {
  let count = 0;
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (board[i][j] !== EMPTY) count++;
    }
  }
  return count;
}

function inBounds(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

function opponent(player) {
  return player === BLACK ? WHITE : BLACK;
}

// ─── Candidate Move Generation ───────────────────────────────────────────────

/**
 * Generate candidate moves: empty cells within `radius` of any existing stone.
 * If the board is empty, return center.
 */
function generateCandidates(board, radius = 2) {
  const candidates = [];
  const visited = new Set();
  let hasStone = false;

  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (board[i][j] !== EMPTY) {
        hasStone = true;
        // Look at all cells within radius
        for (let di = -radius; di <= radius; di++) {
          for (let dj = -radius; dj <= radius; dj++) {
            const ni = i + di;
            const nj = j + dj;
            if (inBounds(ni, nj) && board[ni][nj] === EMPTY) {
              const key = ni * BOARD_SIZE + nj;
              if (!visited.has(key)) {
                visited.add(key);
                candidates.push({ x: ni, y: nj });
              }
            }
          }
        }
      }
    }
  }

  if (!hasStone) {
    return [{ x: CENTER, y: CENTER }];
  }

  return candidates;
}

// ─── Pattern Evaluation ──────────────────────────────────────────────────────

/**
 * Evaluate the board score for `player`.
 * Scans every line in all 4 directions, counting patterns.
 */
function evaluateBoard(board, player) {
  const opp = opponent(player);
  let myScore = 0;
  let oppScore = 0;

  // Evaluate all lines on the board
  for (const [dx, dy] of DIRECTIONS) {
    // Determine starting positions to avoid double-counting
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        // Only start from positions where the previous cell is out of bounds or different
        const pi = i - dx;
        const pj = j - dy;
        if (inBounds(pi, pj) && board[pi][pj] === board[i][j] && board[i][j] !== EMPTY) {
          continue; // This is a continuation, not a start
        }

        if (board[i][j] === EMPTY) continue;

        const stone = board[i][j];
        // Count consecutive stones in this direction
        let count = 0;
        let ci = i, cj = j;
        while (inBounds(ci, cj) && board[ci][cj] === stone) {
          count++;
          ci += dx;
          cj += dy;
        }

        if (count >= 5) {
          if (stone === player) myScore += SCORES.FIVE;
          else oppScore += SCORES.FIVE;
          continue;
        }

        // Check openness: before start and after end
        const beforeI = i - dx;
        const beforeJ = j - dy;
        const afterI = ci; // already one past the last stone
        const afterJ = cj;

        const openBefore = inBounds(beforeI, beforeJ) && board[beforeI][beforeJ] === EMPTY;
        const openAfter = inBounds(afterI, afterJ) && board[afterI][afterJ] === EMPTY;

        const openEnds = (openBefore ? 1 : 0) + (openAfter ? 1 : 0);

        if (openEnds === 0) continue; // Dead pattern, no value

        let score = 0;
        if (count === 4) {
          score = openEnds === 2 ? SCORES.OPEN_FOUR : SCORES.HALF_OPEN_FOUR;
        } else if (count === 3) {
          score = openEnds === 2 ? SCORES.OPEN_THREE : SCORES.HALF_OPEN_THREE;
        } else if (count === 2) {
          score = openEnds === 2 ? SCORES.OPEN_TWO : SCORES.HALF_OPEN_TWO;
        } else if (count === 1) {
          score = openEnds === 2 ? SCORES.OPEN_ONE : 0;
        }

        if (stone === player) myScore += score;
        else oppScore += score;
      }
    }
  }

  // Center preference bonus (mild, for early game)
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (board[i][j] === player) {
        const distFromCenter = Math.abs(i - CENTER) + Math.abs(j - CENTER);
        myScore += Math.max(0, 7 - distFromCenter); // Small center bonus
      }
    }
  }

  return myScore - oppScore * 1.1; // Slightly weight defense
}

/**
 * Advanced pattern evaluation that also looks for patterns with gaps.
 * E.g., ★★_★★ (four with a gap) is very dangerous.
 * Used for hard/master difficulties.
 */
function evaluateBoardAdvanced(board, player) {
  const opp = opponent(player);
  let myScore = 0;
  let oppScore = 0;

  for (const [dx, dy] of DIRECTIONS) {
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        // Evaluate windows of length 5 in each direction
        if (!inBounds(i + dx * 4, j + dy * 4)) continue;

        const window = [];
        for (let k = 0; k < 5; k++) {
          window.push(board[i + dx * k][j + dy * k]);
        }

        // Count stones in this window
        let myCount = 0, oppCount = 0, emptyCount = 0;
        for (const cell of window) {
          if (cell === player) myCount++;
          else if (cell === opp) oppCount++;
          else emptyCount++;
        }

        // Only score windows that belong to one player
        if (myCount > 0 && oppCount === 0) {
          if (myCount === 5) myScore += SCORES.FIVE;
          else if (myCount === 4) myScore += SCORES.HALF_OPEN_FOUR;
          else if (myCount === 3) myScore += SCORES.HALF_OPEN_THREE * 2;
          else if (myCount === 2) myScore += SCORES.HALF_OPEN_TWO;
        }
        if (oppCount > 0 && myCount === 0) {
          if (oppCount === 5) oppScore += SCORES.FIVE;
          else if (oppCount === 4) oppScore += SCORES.HALF_OPEN_FOUR;
          else if (oppCount === 3) oppScore += SCORES.HALF_OPEN_THREE * 2;
          else if (oppCount === 2) oppScore += SCORES.HALF_OPEN_TWO;
        }
      }
    }
  }

  // Combine with the basic consecutive-stone evaluation
  const basicScore = evaluateBoard(board, player);
  return basicScore + (myScore - oppScore * 1.1) * 0.5;
}

// ─── Quick Threat Detection ──────────────────────────────────────────────────

/**
 * Check if placing `player` at (x,y) creates 5-in-a-row.
 */
function isWinningMove(board, x, y, player) {
  for (const [dx, dy] of DIRECTIONS) {
    let count = 1;
    // Count forward
    for (let k = 1; k < 5; k++) {
      const ni = x + dx * k, nj = y + dy * k;
      if (inBounds(ni, nj) && board[ni][nj] === player) count++;
      else break;
    }
    // Count backward
    for (let k = 1; k < 5; k++) {
      const ni = x - dx * k, nj = y - dy * k;
      if (inBounds(ni, nj) && board[ni][nj] === player) count++;
      else break;
    }
    if (count >= 5) return true;
  }
  return false;
}

/**
 * Quick heuristic score for a single move (used for move ordering).
 * Evaluates what patterns this move creates/blocks.
 */
function scoreMoveQuick(board, x, y, player) {
  let score = 0;
  const opp = opponent(player);

  for (const [dx, dy] of DIRECTIONS) {
    // Count own consecutive stones and openness
    let myForward = 0, myBackward = 0;
    let openForward = false, openBackward = false;

    for (let k = 1; k <= 4; k++) {
      const ni = x + dx * k, nj = y + dy * k;
      if (!inBounds(ni, nj)) break;
      if (board[ni][nj] === player) myForward++;
      else { openForward = board[ni][nj] === EMPTY; break; }
    }
    for (let k = 1; k <= 4; k++) {
      const ni = x - dx * k, nj = y - dy * k;
      if (!inBounds(ni, nj)) break;
      if (board[ni][nj] === player) myBackward++;
      else { openBackward = board[ni][nj] === EMPTY; break; }
    }

    const myTotal = myForward + myBackward + 1;
    const myOpen = (openForward ? 1 : 0) + (openBackward ? 1 : 0);

    if (myTotal >= 5) score += SCORES.FIVE;
    else if (myTotal === 4) score += myOpen === 2 ? SCORES.OPEN_FOUR : (myOpen === 1 ? SCORES.HALF_OPEN_FOUR : 0);
    else if (myTotal === 3) score += myOpen === 2 ? SCORES.OPEN_THREE : (myOpen === 1 ? SCORES.HALF_OPEN_THREE : 0);
    else if (myTotal === 2) score += myOpen === 2 ? SCORES.OPEN_TWO : (myOpen === 1 ? SCORES.HALF_OPEN_TWO : 0);

    // Count opponent consecutive stones (defensive value)
    let oppForward = 0, oppBackward = 0;
    let oppOpenForward = false, oppOpenBackward = false;

    for (let k = 1; k <= 4; k++) {
      const ni = x + dx * k, nj = y + dy * k;
      if (!inBounds(ni, nj)) break;
      if (board[ni][nj] === opp) oppForward++;
      else { oppOpenForward = board[ni][nj] === EMPTY; break; }
    }
    for (let k = 1; k <= 4; k++) {
      const ni = x - dx * k, nj = y - dy * k;
      if (!inBounds(ni, nj)) break;
      if (board[ni][nj] === opp) oppBackward++;
      else { oppOpenBackward = board[ni][nj] === EMPTY; break; }
    }

    const oppTotal = oppForward + oppBackward + 1;
    const oppOpen = (oppOpenForward ? 1 : 0) + (oppOpenBackward ? 1 : 0);

    // Blocking value (slightly less than creating own, but still important)
    if (oppTotal >= 5) score += SCORES.FIVE * 0.9;
    else if (oppTotal === 4) score += (oppOpen >= 1 ? SCORES.HALF_OPEN_FOUR : 0) * 0.9;
    else if (oppTotal === 3) score += (oppOpen === 2 ? SCORES.OPEN_THREE : (oppOpen === 1 ? SCORES.HALF_OPEN_THREE : 0)) * 0.9;
  }

  // Small center preference
  const distFromCenter = Math.abs(x - CENTER) + Math.abs(y - CENTER);
  score += Math.max(0, 7 - distFromCenter);

  return score;
}

// ─── Check for Terminal State ────────────────────────────────────────────────

function checkWin(board, player) {
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (board[i][j] !== player) continue;
      for (const [dx, dy] of DIRECTIONS) {
        let count = 1;
        for (let k = 1; k < 5; k++) {
          const ni = i + dx * k, nj = j + dy * k;
          if (inBounds(ni, nj) && board[ni][nj] === player) count++;
          else break;
        }
        if (count >= 5) return true;
      }
    }
  }
  return false;
}

function isBoardFull(board) {
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (board[i][j] === EMPTY) return false;
    }
  }
  return true;
}

// ─── Minimax with Alpha-Beta Pruning ─────────────────────────────────────────

class MinimaxEngine {
  constructor() {
    this.nodesSearched = 0;
    this.startTime = 0;
    this.timeLimit = 0;
    this.timedOut = false;
    this.useAdvancedEval = false;
    // Transposition table (Zobrist-like keying is too complex; use simple string keys for small depths)
    this.transTable = new Map();
    this.maxTransTableSize = 100000;
  }

  /**
   * Get ordered candidate moves with heuristic scores (best first).
   */
  getOrderedMoves(board, player, radius = 2) {
    const candidates = generateCandidates(board, radius);

    // Score each candidate for move ordering
    const scored = candidates.map(m => ({
      ...m,
      score: scoreMoveQuick(board, m.x, m.y, player),
    }));

    // Sort descending by score — best moves first for better pruning
    scored.sort((a, b) => b.score - a.score);

    return scored;
  }

  /**
   * Alpha-beta minimax.
   * @param {number[][]} board
   * @param {number} depth - remaining depth
   * @param {number} alpha
   * @param {number} beta
   * @param {number} maximizingPlayer - the AI player
   * @param {number} currentPlayer - whose turn it is
   * @param {boolean} isMaximizing
   * @returns {number} score
   */
  alphabeta(board, depth, alpha, beta, maximizingPlayer, currentPlayer, isMaximizing) {
    this.nodesSearched++;

    // Time check every 1000 nodes
    if (this.timeLimit > 0 && this.nodesSearched % 1000 === 0) {
      if (Date.now() - this.startTime > this.timeLimit) {
        this.timedOut = true;
        return 0;
      }
    }

    if (this.timedOut) return 0;

    // Terminal checks
    if (checkWin(board, maximizingPlayer)) return WIN_SCORE + depth;
    if (checkWin(board, opponent(maximizingPlayer))) return -(WIN_SCORE + depth);
    if (depth === 0 || isBoardFull(board)) {
      return this.useAdvancedEval
        ? evaluateBoardAdvanced(board, maximizingPlayer)
        : evaluateBoard(board, maximizingPlayer);
    }

    const moves = this.getOrderedMoves(board, currentPlayer);

    // Limit moves at deeper levels for performance
    const maxMoves = depth <= 1 ? 10 : (depth <= 2 ? 15 : 20);
    const movesToSearch = moves.slice(0, maxMoves);

    if (movesToSearch.length === 0) {
      return this.useAdvancedEval
        ? evaluateBoardAdvanced(board, maximizingPlayer)
        : evaluateBoard(board, maximizingPlayer);
    }

    if (isMaximizing) {
      let value = -INF;
      for (const move of movesToSearch) {
        board[move.x][move.y] = currentPlayer;
        const score = this.alphabeta(
          board, depth - 1, alpha, beta,
          maximizingPlayer, opponent(currentPlayer), false
        );
        board[move.x][move.y] = EMPTY;

        if (this.timedOut) return value;

        value = Math.max(value, score);
        alpha = Math.max(alpha, value);
        if (alpha >= beta) break; // Beta cutoff
      }
      return value;
    } else {
      let value = INF;
      for (const move of movesToSearch) {
        board[move.x][move.y] = currentPlayer;
        const score = this.alphabeta(
          board, depth - 1, alpha, beta,
          maximizingPlayer, opponent(currentPlayer), true
        );
        board[move.x][move.y] = EMPTY;

        if (this.timedOut) return value;

        value = Math.min(value, score);
        beta = Math.min(beta, value);
        if (alpha >= beta) break; // Alpha cutoff
      }
      return value;
    }
  }

  /**
   * Find the best move using minimax with alpha-beta pruning.
   */
  findBestMove(board, player, depth, timeLimitMs = 0, advancedEval = false) {
    this.nodesSearched = 0;
    this.startTime = Date.now();
    this.timeLimit = timeLimitMs;
    this.timedOut = false;
    this.useAdvancedEval = advancedEval;
    this.transTable.clear();

    const moves = this.getOrderedMoves(board, player);
    if (moves.length === 0) return { x: CENTER, y: CENTER };
    if (moves.length === 1) return { x: moves[0].x, y: moves[0].y };

    // Check for immediate winning moves
    for (const move of moves) {
      board[move.x][move.y] = player;
      if (checkWin(board, player)) {
        board[move.x][move.y] = EMPTY;
        return { x: move.x, y: move.y };
      }
      board[move.x][move.y] = EMPTY;
    }

    // Check for immediate blocking moves (opponent wins next turn)
    const opp = opponent(player);
    for (const move of moves) {
      board[move.x][move.y] = opp;
      if (checkWin(board, opp)) {
        board[move.x][move.y] = EMPTY;
        return { x: move.x, y: move.y };
      }
      board[move.x][move.y] = EMPTY;
    }

    // Limit top-level move candidates for performance
    const topMoves = moves.slice(0, Math.min(moves.length, 20));

    let bestMove = topMoves[0];
    let bestScore = -INF;

    for (const move of topMoves) {
      board[move.x][move.y] = player;
      const score = this.alphabeta(
        board, depth - 1, -INF, INF,
        player, opponent(player), false
      );
      board[move.x][move.y] = EMPTY;

      if (this.timedOut) break;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return { x: bestMove.x, y: bestMove.y };
  }

  /**
   * Iterative deepening search with time limit.
   */
  findBestMoveIterative(board, player, maxDepth, timeLimitMs, advancedEval = true) {
    this.startTime = Date.now();
    this.timeLimit = timeLimitMs;
    this.timedOut = false;
    this.useAdvancedEval = advancedEval;

    let bestMove = null;

    // Check immediate wins/blocks first
    const moves = this.getOrderedMoves(board, player);
    if (moves.length === 0) return { x: CENTER, y: CENTER };

    // Immediate win check
    for (const move of moves) {
      board[move.x][move.y] = player;
      if (checkWin(board, player)) {
        board[move.x][move.y] = EMPTY;
        return { x: move.x, y: move.y };
      }
      board[move.x][move.y] = EMPTY;
    }

    // Immediate block check
    const opp = opponent(player);
    for (const move of moves) {
      board[move.x][move.y] = opp;
      if (checkWin(board, opp)) {
        board[move.x][move.y] = EMPTY;
        return { x: move.x, y: move.y };
      }
      board[move.x][move.y] = EMPTY;
    }

    // Iterative deepening
    for (let depth = 1; depth <= maxDepth; depth++) {
      this.nodesSearched = 0;
      this.timedOut = false;

      const topMoves = moves.slice(0, 20);
      let depthBestMove = topMoves[0];
      let depthBestScore = -INF;

      for (const move of topMoves) {
        board[move.x][move.y] = player;
        const score = this.alphabeta(
          board, depth - 1, -INF, INF,
          player, opponent(player), false
        );
        board[move.x][move.y] = EMPTY;

        if (this.timedOut) break;

        if (score > depthBestScore) {
          depthBestScore = score;
          depthBestMove = move;
        }
      }

      if (!this.timedOut) {
        bestMove = { x: depthBestMove.x, y: depthBestMove.y };
      }

      // If we found a winning move, stop searching
      if (depthBestScore >= WIN_SCORE) break;

      // Check time
      if (Date.now() - this.startTime > timeLimitMs * 0.7) break;
    }

    return bestMove || { x: moves[0].x, y: moves[0].y };
  }
}

// ─── Difficulty Strategies ───────────────────────────────────────────────────

/**
 * Easy: Pick a random move among nearby cells, with slight preference for better positions.
 */
function easyMove(board, player) {
  const candidates = generateCandidates(board, 1);
  if (candidates.length === 0) return { x: CENTER, y: CENTER };

  // Check for immediate wins (even easy AI should take a win)
  for (const c of candidates) {
    board[c.x][c.y] = player;
    if (checkWin(board, player)) {
      board[c.x][c.y] = EMPTY;
      return c;
    }
    board[c.x][c.y] = EMPTY;
  }

  // Check for immediate blocks (even easy AI should block obvious wins)
  const opp = opponent(player);
  for (const c of candidates) {
    board[c.x][c.y] = opp;
    if (checkWin(board, opp)) {
      board[c.x][c.y] = EMPTY;
      // Block 70% of the time (easy AI sometimes misses)
      if (Math.random() < 0.7) return c;
    }
    board[c.x][c.y] = EMPTY;
  }

  // Random pick, weighted slightly toward center
  const weighted = candidates.map(c => {
    const dist = Math.abs(c.x - CENTER) + Math.abs(c.y - CENTER);
    return { ...c, weight: Math.max(1, 15 - dist) };
  });

  const totalWeight = weighted.reduce((sum, c) => sum + c.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const c of weighted) {
    rand -= c.weight;
    if (rand <= 0) return { x: c.x, y: c.y };
  }

  return { x: weighted[0].x, y: weighted[0].y };
}

/**
 * Medium: Shallow minimax (depth 2) with basic evaluation.
 */
function mediumMove(board, player) {
  const engine = new MinimaxEngine();
  return engine.findBestMove(board, player, 2, 1000, false);
}

/**
 * Hard: Minimax depth 4 with alpha-beta pruning and good evaluation.
 */
function hardMove(board, player) {
  const engine = new MinimaxEngine();
  return engine.findBestMove(board, player, 4, 3000, true);
}

/**
 * Master: Iterative deepening up to depth 6, with time limit, advanced eval, and opening book.
 */
function masterMove(board, player) {
  // Check opening book
  for (const entry of OPENING_BOOK) {
    if (entry.condition(board)) {
      if (entry.move) return entry.move;
      if (entry.moves) {
        const valid = entry.moves.filter(m => board[m.x][m.y] === EMPTY);
        if (valid.length > 0) return valid[Math.floor(Math.random() * valid.length)];
      }
      if (entry.generator) {
        const move = entry.generator(board, player);
        if (move) return move;
      }
    }
  }

  const engine = new MinimaxEngine();
  return engine.findBestMoveIterative(board, player, 6, 2000, true);
}

// ─── Main AI Class ───────────────────────────────────────────────────────────

export class GomokuAI {
  /**
   * @param {'easy'|'medium'|'hard'|'master'} difficulty
   */
  constructor(difficulty = 'medium') {
    this.difficulty = difficulty;
  }

  /**
   * Get the AI's move.
   * @param {number[][]} board - 2D array, 0=empty, 1=black, 2=white
   * @param {number} player - 1 (black) or 2 (white)
   * @returns {{x: number, y: number}} - row and column of the chosen move
   */
  getMove(board, player) {
    // Validate
    if (!board || !Array.isArray(board) || board.length === 0) {
      return { x: CENTER, y: CENTER };
    }

    switch (this.difficulty) {
      case 'easy':
        return easyMove(board, player);
      case 'medium':
        return mediumMove(board, player);
      case 'hard':
        return hardMove(board, player);
      case 'master':
        return masterMove(board, player);
      default:
        return mediumMove(board, player);
    }
  }

  /**
   * Change the AI difficulty.
   * @param {'easy'|'medium'|'hard'|'master'} level
   */
  setDifficulty(level) {
    if (['easy', 'medium', 'hard', 'master'].includes(level)) {
      this.difficulty = level;
    }
  }
}
