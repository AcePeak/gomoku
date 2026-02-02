#!/usr/bin/env node
/**
 * Self-play engine — run AI vs AI games at speed, curate training data.
 *
 * Usage: node js/selfplay.mjs [--games 1000] [--top 50]
 */

import { GameEngine } from './game.js';
import { GomokuAI } from './ai.js';
import { writeFileSync, mkdirSync } from 'fs';

// ── Config ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const TOTAL_GAMES = parseInt(getArg('games', '1000'), 10);
const TOP_N = parseInt(getArg('top', '50'), 10);

// Use medium (depth 2, 1s limit) — fast enough for bulk play
// Mix in some easy to get variety (upsets, different patterns)
const MATCHUPS = [
  { black: 'medium', white: 'medium', count: 0.70 },
  { black: 'medium', white: 'easy',   count: 0.15 },
  { black: 'easy',   white: 'medium', count: 0.15 },
];

// ── Single game ──────────────────────────────────────────────────────────────

function playGame(blackLevel, whiteLevel) {
  const engine = new GameEngine(15);
  const blackAI = new GomokuAI(blackLevel);
  const whiteAI = new GomokuAI(whiteLevel);
  const moves = [];
  let threats = 0;
  let leadChanges = 0;
  let lastAdv = 0;

  while (!engine.gameOver && moves.length < 225) {
    const player = engine.currentPlayer;
    const ai = player === 1 ? blackAI : whiteAI;
    const move = ai.getMove(engine.cloneBoard(), player);
    if (!move) break;

    // AI: x=row, y=col → Engine: placeStone(col, row)
    const col = move.y, row = move.x;
    if (!engine.isValidMove(col, row)) break;

    // Detect blocking move
    const opp = player === 1 ? 2 : 1;
    engine.board[row][col] = opp;
    const blocked = engine.checkWin(col, row, opp).won;
    engine.board[row][col] = 0;
    if (blocked) threats++;

    engine.placeStone(col, row);
    moves.push([col, row, player]);

    // Rough advantage tracking
    const adv = boardAdvantage(engine.board);
    if (adv && lastAdv && Math.sign(adv) !== Math.sign(lastAdv)) leadChanges++;
    lastAdv = adv;
  }

  return {
    blackLevel, whiteLevel, moves,
    winner: engine.winner,
    totalMoves: moves.length,
    threats, leadChanges,
    winLine: engine._winLine,
  };
}

function boardAdvantage(board) {
  let s = 0;
  for (let y = 0; y < 15; y++)
    for (let x = 0; x < 15; x++) {
      if (board[y][x] === 1) s += 14 - Math.abs(x-7) - Math.abs(y-7);
      else if (board[y][x] === 2) s -= 14 - Math.abs(x-7) - Math.abs(y-7);
    }
  return s;
}

// ── Scoring ──────────────────────────────────────────────────────────────────

function scoreGame(g) {
  let s = 0;
  if (g.totalMoves >= 20 && g.totalMoves <= 80) s += 20;
  else if (g.totalMoves >= 15) s += 10;
  else s -= 10;
  s += g.threats * 5;
  s += g.leadChanges * 8;
  if (g.winner === 1 || g.winner === 2) s += 5;
  const db = { easy: 0, medium: 3, hard: 6, master: 10 };
  s += (db[g.blackLevel]||0) + (db[g.whiteLevel]||0);
  return s;
}

function generateTags(g) {
  const t = [];
  if (g.totalMoves <= 20) t.push('速胜');
  if (g.totalMoves >= 50) t.push('持久战');
  if (g.threats >= 5) t.push('攻防激烈');
  if (g.leadChanges >= 3) t.push('逆转');
  const dr = { easy: 1, medium: 2, hard: 3, master: 4 };
  if (dr[g.blackLevel] !== dr[g.whiteLevel]) {
    const weaker = dr[g.blackLevel] < dr[g.whiteLevel] ? 1 : 2;
    if (g.winner === weaker) t.push('以弱胜强');
  }
  return t;
}

// ── Annotate ─────────────────────────────────────────────────────────────────

function annotateGame(game) {
  const annotations = [];
  const engine = new GameEngine(15);

  for (let i = 0; i < game.moves.length; i++) {
    const [col, row, player] = game.moves[i];
    const opp = player === 1 ? 2 : 1;
    let note = null;

    if (i === game.moves.length - 1 && (game.winner === 1 || game.winner === 2)) {
      note = player === 1 ? '黑棋制胜！五连珠！' : '白棋制胜！五连珠！';
    } else {
      // Check block
      engine.board[row][col] = opp;
      if (engine.checkWin(col, row, opp).won) {
        note = player === 1 ? '关键防守！挡住白棋连五' : '关键防守！挡住黑棋连五';
      }
      engine.board[row][col] = 0;

      // Check threat creation
      if (!note) {
        engine.board[row][col] = player;
        outer: for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nc = col+dx, nr = row+dy;
            if (nc>=0 && nc<15 && nr>=0 && nr<15 && engine.board[nr][nc]===0) {
              engine.board[nr][nc] = player;
              if (engine.checkWin(nc, nr, player).won) {
                note = player === 1 ? '黑棋进攻！形成冲四' : '白棋进攻！形成冲四';
              }
              engine.board[nr][nc] = 0;
              if (note) break outer;
            }
          }
        }
        engine.board[row][col] = 0;
      }
    }

    engine.placeStone(col, row);
    if (note) annotations.push({ move: i, text: note });
  }
  return annotations;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log(`🎮 Self-Play: ${TOTAL_GAMES} games\n`);

  // Build schedule
  const schedule = [];
  for (const m of MATCHUPS) {
    const n = Math.round(TOTAL_GAMES * m.count);
    for (let i = 0; i < n; i++) schedule.push(m);
  }
  while (schedule.length < TOTAL_GAMES) schedule.push(MATCHUPS[0]);
  for (let i = schedule.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [schedule[i], schedule[j]] = [schedule[j], schedule[i]];
  }

  const allGames = [];
  const t0 = Date.now();
  let w = { 1: 0, 2: 0, 3: 0, 0: 0 };

  for (let i = 0; i < schedule.length; i++) {
    const g = playGame(schedule[i].black, schedule[i].white);
    g.id = i + 1;
    g.interestingness = scoreGame(g);
    allGames.push(g);
    w[g.winner]++;

    if ((i+1) % 50 === 0 || i === schedule.length - 1) {
      const sec = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`  [${i+1}/${TOTAL_GAMES}] ${sec}s  B:${w[1]} W:${w[2]} D:${w[3]}`);
    }
  }

  const totalSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n✅ ${totalSec}s — B:${w[1]} W:${w[2]} D:${w[3]}`);

  // Sort & curate
  allGames.sort((a, b) => b.interestingness - a.interestingness);

  const diffLabel = { easy: '初级', medium: '中级', hard: '高级', master: '大师' };
  const curated = allGames.slice(0, TOP_N).map((g, idx) => ({
    id: idx + 1,
    title: `经典对局 #${idx + 1}`,
    description: `${diffLabel[g.blackLevel]}(黑) vs ${diffLabel[g.whiteLevel]}(白) · ${g.totalMoves}手 · ${g.winner===1?'黑胜':g.winner===2?'白胜':'和棋'}`,
    blackLevel: g.blackLevel,
    whiteLevel: g.whiteLevel,
    moves: g.moves,
    winner: g.winner,
    winLine: g.winLine,
    totalMoves: g.totalMoves,
    score: g.interestingness,
    tags: generateTags(g),
    annotations: annotateGame(g),
  }));

  mkdirSync('data', { recursive: true });
  writeFileSync('data/training-games.json', JSON.stringify(curated, null, 2));
  const kb = (JSON.stringify(curated).length / 1024).toFixed(0);
  console.log(`📚 Top ${TOP_N} games → data/training-games.json (${kb} KB)`);

  const avg = (allGames.reduce((s,g)=>s+g.totalMoves,0)/allGames.length).toFixed(1);
  console.log(`📊 Avg ${avg} moves/game, top score: ${allGames[0].interestingness}`);
}

main();
