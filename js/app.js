/**
 * App – Main application controller for Gomoku.
 *
 * Manages mode selection (Free Play / Campaign), AI integration,
 * power stones, obstacles, theme toggle, sound effects, and all UI state.
 */

import { Board } from './board.js';
import { Game } from './game.js';
import { GomokuAI } from './ai.js';
import { SoundManager } from './sounds.js';
import { CampaignManager } from './campaign.js';

/* ================================================================
   Singletons
   ================================================================ */

const board = new Board();
const sounds = new SoundManager();
const campaign = new CampaignManager();

let game = new Game();
let ai = null; // GomokuAI instance

/* ================================================================
   State
   ================================================================ */

let mode = null;           // 'free' | 'campaign'
let gameActive = false;
let aiThinking = false;

const HUMAN = 1;           // black
const AI_PLAYER = 2;       // white

let moveCount = 0;         // human move count (for campaign stars)
let freePlayDifficulty = 'medium';
let scores = { human: 0, ai: 0 };

// Power stones (campaign only)
let powerStones = { bomb: 0, shield: 0, double: 0 };
let activePower = null;    // 'bomb' | 'shield' | null
let doublePending = false; // next human move = 2nd stone, skip AI

// Current campaign level config (when in campaign mode)
let campaignConfig = null;

/* ================================================================
   DOM References (populated in init)
   ================================================================ */

const $ = (id) => document.getElementById(id);

let canvas,
  statusEl,
  turnIndicator,
  turnLabel,
  scoreBlack,
  scoreWhite,
  btnNewGame,
  btnUndo,
  btnMenu,
  btnSound,
  btnTheme,
  aiThinkingEl;

// Overlays
let overlayMode,
  overlayDifficulty,
  overlayLevels,
  overlayComplete,
  overlayGameover;

// Campaign panels
let panelScore,
  panelLevelInfo,
  panelPowers,
  levelNameEl,
  levelMovesEl;

/* ================================================================
   Helpers
   ================================================================ */

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function show(el) {
  el?.classList.remove('hidden');
}

function hide(el) {
  el?.classList.add('hidden');
}

function updateTurnUI() {
  if (!turnIndicator || !turnLabel) return;
  const isBlack = game.currentPlayer === 'black';
  turnIndicator.className = 'turn-stone ' + (isBlack ? 'black' : 'white');
  turnLabel.textContent = isBlack ? "Your turn" : "AI's turn";
}

function updateScoreUI() {
  if (scoreBlack) scoreBlack.textContent = scores.human;
  if (scoreWhite) scoreWhite.textContent = scores.ai;
}

function updatePowerUI() {
  $('count-bomb').textContent = powerStones.bomb || 0;
  $('count-shield').textContent = powerStones.shield || 0;
  $('count-double').textContent = powerStones.double || 0;

  // Highlight available powers, dim unavailable
  document.querySelectorAll('.power-btn').forEach((btn) => {
    const type = btn.dataset.power;
    const count = powerStones[type] || 0;
    btn.classList.toggle('available', count > 0);
    btn.classList.toggle('active', activePower === type);
    btn.disabled = count <= 0 && activePower !== type;
  });
}

function updateLevelMoves() {
  if (levelMovesEl) levelMovesEl.textContent = `Moves: ${moveCount}`;
}

function showAIThinking(visible) {
  aiThinking = visible;
  if (aiThinkingEl) {
    aiThinkingEl.classList.toggle('hidden', !visible);
  }
}

/* ================================================================
   Theme
   ================================================================ */

function initTheme() {
  const saved = localStorage.getItem('gomoku-theme') || 'dark';
  document.body.setAttribute('data-theme', saved);
  updateThemeIcon();
}

function toggleTheme() {
  const current = document.body.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', next);
  localStorage.setItem('gomoku-theme', next);
  updateThemeIcon();
}

function updateThemeIcon() {
  if (!btnTheme) return;
  const isDark = document.body.getAttribute('data-theme') === 'dark';
  btnTheme.textContent = isDark ? '🌙' : '☀️';
}

/* ================================================================
   Sound
   ================================================================ */

function updateSoundIcon() {
  if (!btnSound) return;
  btnSound.textContent = sounds.muted ? '🔇' : '🔊';
}

/* ================================================================
   Mode Selection
   ================================================================ */

function showModeSelect() {
  gameActive = false;
  mode = null;
  hide($('game-area'));
  hide(overlayDifficulty);
  hide(overlayLevels);
  hide(overlayComplete);
  hide(overlayGameover);
  show(overlayMode);
  setStatus('Welcome to Gomoku!');
}

/* ================================================================
   Free Play
   ================================================================ */

function showDifficultySelect() {
  hide(overlayMode);
  show(overlayDifficulty);
}

function startFreePlay(difficulty) {
  freePlayDifficulty = difficulty;
  ai = new GomokuAI(difficulty);
  mode = 'free';

  hide(overlayDifficulty);
  hide(overlayGameover);
  show($('game-area'));
  show(panelScore);
  hide(panelLevelInfo);
  hide(panelPowers);
  show($('btn-undo'));

  resetGame();
  setStatus(`Free Play — ${capitalize(difficulty)} AI. Your move!`);
}

/* ================================================================
   Campaign — Level Select
   ================================================================ */

function showLevelSelect() {
  hide(overlayMode);
  hide(overlayComplete);
  buildLevelGrid();
  show(overlayLevels);
}

function buildLevelGrid() {
  const grid = $('level-grid');
  if (!grid) return;
  grid.innerHTML = '';

  campaign.levels.forEach((lvl, i) => {
    const locked = i > campaign.unlockedLevel;
    const stars = campaign.stars[i];

    const btn = document.createElement('button');
    btn.className = 'level-btn' + (locked ? ' locked' : '');
    btn.disabled = locked;
    btn.innerHTML = `
      <span class="level-number">${lvl.id}</span>
      <span class="level-btn-name">${lvl.name}</span>
      <span class="level-stars-row">
        ${[1, 2, 3].map((s) => `<span class="star-icon ${s <= stars ? 'earned' : ''}">${s <= stars ? '★' : '☆'}</span>`).join('')}
      </span>
      ${locked ? '<span class="lock-icon">🔒</span>' : ''}
    `;

    if (!locked) {
      btn.addEventListener('click', () => startCampaignLevel(i));
    }

    grid.appendChild(btn);
  });

  // Total stars display
  const total = $('campaign-total-stars');
  if (total) {
    total.textContent = `⭐ ${campaign.getTotalStars()} / ${campaign.getMaxStars()}`;
  }
}

/* ================================================================
   Campaign — Start Level
   ================================================================ */

function startCampaignLevel(index) {
  campaignConfig = campaign.startLevel(index);
  if (!campaignConfig) return;

  ai = new GomokuAI(campaignConfig.ai);
  mode = 'campaign';
  moveCount = 0;

  // Copy power stones
  powerStones = {
    bomb: campaignConfig.powerStones.bomb || 0,
    shield: campaignConfig.powerStones.shield || 0,
    double: campaignConfig.powerStones.double || 0,
  };
  activePower = null;
  doublePending = false;

  hide(overlayLevels);
  hide(overlayComplete);
  show($('game-area'));
  hide(panelScore);
  show(panelLevelInfo);

  // Show power panel only if level has any powers
  const hasPowers = powerStones.bomb + powerStones.shield + powerStones.double > 0;
  if (hasPowers) show(panelPowers);
  else hide(panelPowers);

  hide($('btn-undo')); // no undo in campaign

  if (levelNameEl) levelNameEl.textContent = campaignConfig.name;

  resetGame();
  applyObstacles();
  updatePowerUI();
  updateLevelMoves();

  setStatus(`Level ${campaignConfig.id}: ${campaignConfig.name} — ${campaignConfig.desc || 'Good luck!'}`);
}

function applyObstacles() {
  if (!campaignConfig || !campaignConfig.obstacles) return;
  for (const [x, y] of campaignConfig.obstacles) {
    game._engine.board[y][x] = -1;   // mark in engine
    board.setObstacle(x, y);          // render on canvas
  }
}

/* ================================================================
   Game Reset
   ================================================================ */

function resetGame() {
  game.reset();
  board.clearBoard();
  gameActive = true;
  aiThinking = false;
  showAIThinking(false);
  board.currentColor = 'black';
  updateTurnUI();
}

/* ================================================================
   Board Click Handler
   ================================================================ */

function onBoardClick(e) {
  if (!gameActive || aiThinking || game.isOver) return;

  // Only allow moves when it's the human's turn
  // (currentPlayer is 'black' = HUMAN, unless doublePending forced it)
  if (game._engine.currentPlayer !== HUMAN && !doublePending) return;

  const cell = board.getCellFromClick(e.clientX, e.clientY);
  if (!cell) return;

  /* ── Bomb power ────────────────────────────────────────────── */
  if (activePower === 'bomb') {
    const val = game._engine.board[cell.y][cell.x];
    if (val !== AI_PLAYER) {
      setStatus("💣 Click on an opponent's stone to bomb it!");
      return;
    }
    // Remove opponent stone
    game._engine.board[cell.y][cell.x] = 0;
    board.removeStone(cell.x, cell.y);
    // Also remove from move history (cosmetic; engine history may be off)
    powerStones.bomb--;
    activePower = null;
    updatePowerUI();
    sounds.play('capture');
    setStatus("💣 Boom! Opponent's stone removed.");
    return;
  }

  /* ── Shield power ──────────────────────────────────────────── */
  if (activePower === 'shield') {
    if (game._engine.board[cell.y][cell.x] !== 0) {
      setStatus('🛡️ Click on an empty cell to shield it!');
      return;
    }
    game._engine.board[cell.y][cell.x] = -1;
    board.setObstacle(cell.x, cell.y);
    powerStones.shield--;
    activePower = null;
    updatePowerUI();
    sounds.play('place');
    setStatus('🛡️ Cell shielded!');
    return;
  }

  /* ── Normal stone placement ────────────────────────────────── */
  // Check the cell is truly empty in the engine
  if (game._engine.board[cell.y][cell.x] !== 0) return;

  const color = game.makeMove(cell.x, cell.y);
  if (!color) return;

  board.drawStone(cell.x, cell.y, color);
  sounds.play('place');
  moveCount++;

  if (mode === 'campaign') updateLevelMoves();
  updateTurnUI();

  // Win check
  if (game.isOver) {
    handleGameOver();
    return;
  }

  /* ── Double stone (second placement) ───────────────────────── */
  if (doublePending) {
    doublePending = false;
    // Give the human another turn
    game._engine.currentPlayer = HUMAN;
    board.currentColor = 'black';
    updateTurnUI();
    setStatus('⚡ Place your second stone!');
    return;
  }

  /* ── AI turn ───────────────────────────────────────────────── */
  triggerAITurn();
}

/* ================================================================
   AI Turn
   ================================================================ */

function triggerAITurn() {
  if (!gameActive || game.isOver) return;

  showAIThinking(true);
  board.currentColor = null; // disable hover preview during AI
  updateTurnUI();
  setStatus('AI is thinking…');

  // Small delay so the UI updates before heavy computation
  const delay = ai.difficulty === 'master' ? 100 : 200;

  setTimeout(() => {
    // Clone board so AI search doesn't corrupt state
    const boardClone = game._engine.cloneBoard();
    const aiMove = ai.getMove(boardClone, AI_PLAYER);

    if (!aiMove) {
      showAIThinking(false);
      return;
    }

    // AI returns {x: row, y: col} — swap for Game/Board convention (col, row)
    const col = aiMove.y;
    const row = aiMove.x;

    const aiColor = game.makeMove(col, row);
    if (aiColor) {
      board.drawStone(col, row, aiColor);
      sounds.play('place');
    }

    showAIThinking(false);
    board.currentColor = 'black';
    updateTurnUI();

    if (game.isOver) {
      handleGameOver();
      return;
    }

    setStatus('Your turn.');
  }, delay);
}

/* ================================================================
   Game Over
   ================================================================ */

function handleGameOver() {
  gameActive = false;

  const result = game.lastResult;
  const winner = game.winner; // 'black' | 'white' | 'draw'

  // Animate win line
  if (result && result.winLine) {
    board.setWinLine(result.winLine);
  }

  if (mode === 'free') {
    handleFreePlayGameOver(winner);
  } else if (mode === 'campaign') {
    handleCampaignGameOver(winner);
  }
}

/* ── Free Play game over ─────────────────────────────────────── */

function handleFreePlayGameOver(winner) {
  let title, message;

  if (winner === 'black') {
    title = '🎉 You Win!';
    message = 'Congratulations! You beat the AI.';
    scores.human++;
    sounds.play('win');
  } else if (winner === 'white') {
    title = '😞 You Lose';
    message = 'The AI wins this round.';
    scores.ai++;
    sounds.play('lose');
  } else {
    title = '🤝 Draw';
    message = 'The board is full — it\'s a tie!';
  }

  updateScoreUI();

  $('gameover-title').textContent = title;
  $('gameover-message').textContent = message;
  show(overlayGameover);
  setStatus(title);
}

/* ── Campaign game over ──────────────────────────────────────── */

function handleCampaignGameOver(winner) {
  const humanWon = winner === 'black';
  const result = campaign.completeLevel(humanWon, moveCount);

  if (humanWon) {
    sounds.play('win');
    $('complete-title').textContent = '🎉 Level Complete!';

    // Show stars
    const starEls = document.querySelectorAll('#complete-stars .star');
    starEls.forEach((el, i) => {
      const earned = i < result.stars;
      el.textContent = earned ? '★' : '☆';
      el.classList.toggle('earned', earned);
      // Stagger animation
      el.style.animationDelay = `${i * 0.2}s`;
      el.classList.remove('star-pop');
      if (earned) {
        // Force reflow then add animation class
        void el.offsetWidth;
        el.classList.add('star-pop');
      }
    });

    const config = campaign.levels[campaign.currentLevel];
    let msg = `Completed in ${moveCount} moves.`;
    msg += `\n★★★ ≤ ${config.starThresholds[2]} moves · ★★ ≤ ${config.starThresholds[1]} moves · ★ ≤ ${config.starThresholds[0]} moves`;
    $('complete-message').textContent = msg;

    // Next level button
    const hasNext = campaign.currentLevel + 1 < campaign.levels.length;
    const btnNext = $('btn-next-level');
    if (hasNext) {
      show(btnNext);
    } else {
      hide(btnNext);
    }

    show(overlayComplete);
    setStatus('🎉 Level Complete!');
  } else {
    sounds.play('lose');
    $('complete-title').textContent = '😞 Level Failed';
    const starEls = document.querySelectorAll('#complete-stars .star');
    starEls.forEach((el) => {
      el.textContent = '☆';
      el.classList.remove('earned', 'star-pop');
    });
    $('complete-message').textContent = 'The AI wins. Try again!';
    hide($('btn-next-level'));
    show(overlayComplete);
    setStatus('Level failed. Try again!');
  }
}

/* ================================================================
   Power Stones
   ================================================================ */

function togglePower(type) {
  if (activePower === type) {
    // Deactivate
    activePower = null;
    setStatus('Power stone cancelled.');
  } else if ((powerStones[type] || 0) > 0) {
    if (type === 'double') {
      // Double is used immediately — next move = two stones
      powerStones.double--;
      doublePending = true;
      activePower = null;
      updatePowerUI();
      setStatus('⚡ Double active! Your next move places two stones.');
      return;
    }
    activePower = type;
    const labels = { bomb: '💣 Click an opponent stone to bomb', shield: '🛡️ Click an empty cell to shield' };
    setStatus(labels[type] || 'Select a target on the board.');
  }
  updatePowerUI();
}

/* ================================================================
   Button Handlers
   ================================================================ */

function handleNewGame() {
  if (mode === 'free') {
    startFreePlay(freePlayDifficulty);
  } else if (mode === 'campaign' && campaignConfig) {
    startCampaignLevel(campaign.currentLevel);
  }
}

function handleUndo() {
  if (mode !== 'free' || !gameActive || aiThinking) return;

  // Undo AI move, then human move (2 undos)
  const aiUndo = game.undo();
  if (aiUndo) {
    board.removeStone(aiUndo.x, aiUndo.y);
  }
  const humanUndo = game.undo();
  if (humanUndo) {
    board.removeStone(humanUndo.x, humanUndo.y);
  }

  if (!aiUndo && !humanUndo) {
    setStatus('Nothing to undo.');
    return;
  }

  // Re-highlight last move
  const last = game.moveHistory[game.moveHistory.length - 1];
  if (last) {
    board.highlightCell(last.x, last.y);
  } else {
    board.highlightedCell = null;
    board.render();
  }

  updateTurnUI();
  setStatus('Undid last move pair.');
}

/* ================================================================
   Canvas Sizing
   ================================================================ */

function sizeCanvas() {
  const container = canvas.parentElement;
  const maxSide = Math.min(container.clientWidth, container.clientHeight, 720);
  canvas.style.width = maxSide + 'px';
  canvas.style.height = maxSide + 'px';
  board.resize();
}

/* ================================================================
   Utility
   ================================================================ */

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ================================================================
   Init
   ================================================================ */

function init() {
  // DOM refs
  canvas = $('board-canvas');
  statusEl = $('status-message');
  turnIndicator = $('turn-indicator');
  turnLabel = $('turn-label');
  scoreBlack = $('score-black');
  scoreWhite = $('score-white');
  btnNewGame = $('btn-new-game');
  btnUndo = $('btn-undo');
  btnMenu = $('btn-menu');
  btnSound = $('btn-sound');
  btnTheme = $('btn-theme');
  aiThinkingEl = $('ai-thinking');

  overlayMode = $('overlay-mode');
  overlayDifficulty = $('overlay-difficulty');
  overlayLevels = $('overlay-levels');
  overlayComplete = $('overlay-complete');
  overlayGameover = $('overlay-gameover');

  panelScore = $('panel-score');
  panelLevelInfo = $('panel-level-info');
  panelPowers = $('panel-powers');
  levelNameEl = $('level-name');
  levelMovesEl = $('level-moves');

  // Init board & canvas
  board.init(canvas);
  sizeCanvas();

  // Theme
  initTheme();

  // Sound icon
  updateSoundIcon();

  /* ── Event listeners ───────────────────────────────────────── */

  // Board click
  canvas.addEventListener('click', onBoardClick);

  // Resize
  window.addEventListener('resize', () => sizeCanvas());

  // Buttons
  btnNewGame?.addEventListener('click', handleNewGame);
  btnUndo?.addEventListener('click', handleUndo);
  btnMenu?.addEventListener('click', showModeSelect);
  btnSound?.addEventListener('click', () => {
    sounds.toggle();
    updateSoundIcon();
  });
  btnTheme?.addEventListener('click', toggleTheme);

  // Mode select
  $('btn-free-play')?.addEventListener('click', showDifficultySelect);
  $('btn-campaign')?.addEventListener('click', showLevelSelect);

  // Difficulty select
  document.querySelectorAll('[data-difficulty]').forEach((btn) => {
    btn.addEventListener('click', () => {
      startFreePlay(btn.dataset.difficulty);
    });
  });
  $('btn-diff-back')?.addEventListener('click', showModeSelect);

  // Level select back
  $('btn-levels-back')?.addEventListener('click', showModeSelect);

  // Level complete popup
  $('btn-next-level')?.addEventListener('click', () => {
    const next = campaign.currentLevel + 1;
    if (next < campaign.levels.length) {
      startCampaignLevel(next);
    }
  });
  $('btn-replay')?.addEventListener('click', () => {
    startCampaignLevel(campaign.currentLevel);
  });
  $('btn-to-levels')?.addEventListener('click', showLevelSelect);

  // Game over popup (free play)
  $('btn-play-again')?.addEventListener('click', () => {
    startFreePlay(freePlayDifficulty);
  });
  $('btn-change-diff')?.addEventListener('click', () => {
    hide(overlayGameover);
    showDifficultySelect();
  });
  $('btn-to-menu')?.addEventListener('click', () => {
    hide(overlayGameover);
    showModeSelect();
  });

  // Power stone buttons
  document.querySelectorAll('.power-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!gameActive || aiThinking || game.isOver) return;
      togglePower(btn.dataset.power);
    });
  });

  /* ── Initial state ─────────────────────────────────────────── */
  showModeSelect();
}

document.addEventListener('DOMContentLoaded', init);
