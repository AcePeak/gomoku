# GomokuX — 五子棋，重新定义

> A creative Gomoku (Five in a Row) game with AI opponent, power stones, and a 10-level campaign.
>
> 一款创意五子棋游戏，拥有 AI 对手、能量石和 10 关卡战役模式。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![No Dependencies](https://img.shields.io/badge/dependencies-none-brightgreen.svg)

---

## ✨ Features / 功能亮点

- 🤖 **4-level AI opponent** (Easy → Master) — 四档 AI 难度，从新手到大师
- 🎮 **10-level campaign** with progressive difficulty — 10 关卡战役，逐步升级
- 💣 **Power Stones**: Bomb, Shield, Double — 能量石系统：炸弹、护盾、双子
- 🚧 **Board obstacles** for strategic depth — 棋盘障碍物，增添策略深度
- ⭐ **Star rating system** — 星级评分系统
- 🌙 **Dark/Light theme** — 深色/浅色主题
- 📱 **Fully responsive** — 完全响应式布局
- 🔊 **Sound effects** — 音效反馈

---

## 🎮 Play / 开始游戏

**No server required — just open in any modern browser.**

```bash
# Option 1: Open directly
open game.html

# Option 2: Use a local server (for ES module support)
npx serve .
# Then visit http://localhost:3000/game.html
```

> 无需服务器 — 直接用浏览器打开 `game.html` 即可。

---

## 📖 Game Rules / 游戏规则

### Standard Gomoku / 标准五子棋

1. **Board**: 15×15 grid (棋盘：15×15 交叉点)
2. **Players**: Black (⚫) goes first, White (⚪) second (黑先白后)
3. **Objective**: Be the first to place **5 stones in a row** — horizontally, vertically, or diagonally (先连成五子者胜)
4. **Overline rule**: Exactly 5 in a row wins; 6+ does NOT count (标准规则：恰好五子连珠才算赢)

### Power Stones / 能量石

| Stone | Effect | Strategy |
|-------|--------|----------|
| 💣 **Bomb** | Removes a 3×3 area of stones | Clear opponent clusters |
| 🛡️ **Shield** | Protects a stone from removal | Guard key positions |
| ✌️ **Double** | Place two stones in one turn | Create surprise threats |

---

## 🤖 AI Difficulty / AI 难度

| Level | Algorithm | Depth | Time Limit | Description |
|-------|-----------|-------|------------|-------------|
| **Easy** 🟢 | Weighted random | — | Instant | Random moves with slight center preference. Blocks obvious wins ~70% of the time. Great for beginners. |
| **Medium** 🟡 | Minimax | 2 | 1s | Shallow search with basic pattern evaluation. Sees immediate threats and opportunities. |
| **Hard** 🟠 | Minimax + α-β | 4 | 3s | Deep search with advanced evaluation including gap patterns (e.g., ★★_★★). Plays strong. |
| **Master** 🔴 | Iterative deepening + Opening book | 6 | 2s | Uses opening book for first moves, iterative deepening with time-controlled search, and advanced pattern recognition. Tournament-level play. |

### AI Technical Details

- **Evaluation**: Pattern-based scoring (five, open/half-open fours, threes, twos)
- **Move ordering**: Heuristic pre-scoring for efficient alpha-beta pruning
- **Candidate generation**: Only considers moves within radius 2 of existing stones
- **Immediate threat detection**: Win/block checks before deep search

---

## 🏆 Campaign Levels / 战役关卡

| Level | Name | AI | Special Rules | Stars |
|-------|------|-----|---------------|-------|
| 1 | **First Steps** 初学乍练 | Easy | Standard rules | ⭐⭐⭐ |
| 2 | **The Apprentice** 小试牛刀 | Easy | Opponent starts with 1 stone | ⭐⭐⭐ |
| 3 | **Cornered** 困兽之斗 | Medium | 4 corner obstacles | ⭐⭐⭐ |
| 4 | **The Wall** 铜墙铁壁 | Medium | Row of obstacles across center | ⭐⭐⭐ |
| 5 | **Power Up** 能量觉醒 | Medium | Bomb stone unlocked | ⭐⭐⭐ |
| 6 | **Shield Bearer** 金盾护体 | Hard | Shield stone unlocked | ⭐⭐⭐ |
| 7 | **Double Trouble** 双子危机 | Hard | Double stone unlocked | ⭐⭐⭐ |
| 8 | **The Maze** 迷宫对决 | Hard | Complex obstacle layout | ⭐⭐⭐ |
| 9 | **Full Arsenal** 全副武装 | Hard | All power stones available | ⭐⭐⭐ |
| 10 | **Grand Master** 终极大师 | Master | All features, AI plays first | ⭐⭐⭐ |

---

## 🛠 Project Structure / 项目结构

```
gomoku/
├── index.html          # Landing page (入口页面)
├── game.html           # Main game page (游戏主页面)
├── css/
│   └── style.css       # All styles — dark theme, responsive (样式文件)
├── js/
│   ├── app.js          # Application controller — wires DOM to engine (应用控制器)
│   ├── game.js         # Pure game engine — rules, state, win detection (游戏引擎)
│   ├── board.js        # Canvas renderer — wood board, 3D stones, hover (棋盘渲染)
│   ├── ai.js           # AI engine — minimax, alpha-beta, 4 difficulties (AI 引擎)
│   ├── campaign.js     # Campaign / story mode system (战役模式)
│   └── game.test.mjs   # Unit tests for game engine (单元测试)
├── docs/
│   ├── GAMEPLAY.md     # Detailed gameplay guide (详细玩法指南)
│   └── TECHNICAL.md    # Technical documentation (技术文档)
├── package.json        # Project metadata
├── LICENSE             # MIT License
├── CHANGELOG.md        # Version history
└── README.md           # This file (本文件)
```

---

## 🏗 Built With / 技术栈

- **Pure HTML5 Canvas** + ES Modules — no frameworks, no build tools
- **Canvas 2D** for board rendering with procedural wood texture and 3D stone effects
- **AI**: Minimax with Alpha-Beta Pruning, pattern evaluation, opening book
- **[ForgeLoop](https://forgeloop.dev)** — Multi-agent development engine

---

## 🚀 Development / 开发

```bash
# Run tests
node --experimental-vm-modules js/game.test.mjs

# Start a local server (for ES module support)
npx serve .
```

No build step. No transpilation. Just clean, modern JavaScript.

---

## 📄 License

[MIT](LICENSE) © 2026 AcePeak

---

<p align="center">
  <strong>GomokuX</strong> — 五子棋，重新定义<br>
  <em>Made with ♟️ and ☕</em>
</p>
