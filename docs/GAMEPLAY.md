# Gameplay Guide / 游戏攻略

A complete guide to playing GomokuX — from first stone to Grand Master.

---

## Table of Contents

1. [How to Play](#how-to-play)
2. [Basic Strategy](#basic-strategy)
3. [Power Stones](#power-stones)
4. [Campaign Walkthrough Hints](#campaign-walkthrough-hints)
5. [AI Difficulty Comparison](#ai-difficulty-comparison)

---

## How to Play

### Getting Started / 快速入门

1. Open `game.html` in your browser (打开 `game.html`)
2. You play as **Black** (⚫) and go first (你执黑先行)
3. Click any intersection on the board to place a stone (点击棋盘交叉点落子)
4. AI responds as **White** (⚪) automatically (AI 自动执白应答)
5. First to get **5 in a row** wins! (先连五子者胜！)

### Board Layout / 棋盘布局

```
  0  1  2  3  4  5  6  7  8  9 10 11 12 13 14
  ┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐
0 │  │  │  │  │  │  │  │  │  │  │  │  │  │  │
  ├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤
  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │
  ├──┼──┼──┼──┼──★──┼──┼──┼──┼──★──┼──┼──┤   ★ = star points
  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │
  ...
7 │  │  │  │  │  │  │  ◉  │  │  │  │  │  │  │   ◉ = center (7,7)
  ...
```

The board is a **15×15 grid** with intersections. Star points (★) are marked at positions (3,3), (3,7), (3,11), (7,3), (7,7), (7,11), (11,3), (11,7), and (11,11).

### Controls / 控制

| Action | How |
|--------|-----|
| Place stone | Click/tap an empty intersection |
| Undo | Click "↩ Undo" button |
| New Game | Click "✦ New Game" button |
| Return to menu | Click "← Menu" button |

### Win Conditions / 胜利条件

- Place exactly **5 consecutive stones** in a line (horizontal, vertical, or diagonal)
- **Overline rule**: 6 or more in a row does **not** count as a win (standard rules)
- If the board is completely filled with no winner → **Draw** (平局)

### Example: Winning Move

```
Before:                     After (Black wins!):
. . . . . . .               . . . . . . .
. . ⚫ ⚫ ⚫ ⚫ .             . . ⚫ ⚫ ⚫ ⚫ ⚫  ← 5 in a row!
. . . . . . .               . . . . . . .
```

---

## Basic Strategy

### Opening / 开局

- **Control the center**: The center intersection (7,7) gives maximum reach in all directions. Always start near the center.
- **Knight's move**: On your second move, consider placing 2 squares away diagonally — this creates flexible attacking angles.

### Key Patterns to Know / 关键棋型

| Pattern | Name | Threat Level |
|---------|------|-------------|
| `⚫⚫⚫⚫_` | Half-open Four (活四) | **Critical** — wins next move if unblocked |
| `_⚫⚫⚫⚫_` | Open Four (双活四) | **Unstoppable** — wins regardless |
| `_⚫⚫⚫_` | Open Three (活三) | **High** — becomes open four next turn |
| `⚫⚫⚫__` | Half-open Three | **Medium** — still dangerous |
| `_⚫⚫_` | Open Two (活二) | **Low** — building potential |

### Offensive Tips / 进攻技巧

1. **Create double threats**: Build two open threes simultaneously — opponent can only block one
2. **Fork attacks**: Form an L-shape or T-shape to threaten in multiple directions
3. **Use obstacles**: In campaign mode, place stones so obstacles protect your flanks

### Defensive Tips / 防守技巧

1. **Always check for opponent's open threes** — block them immediately
2. **Count to four**: If the opponent has 3 in a row with both ends open, you MUST block
3. **Don't chase blindly**: Sometimes the best defense is a strong counter-attack

### Common Mistakes / 常见错误

- ❌ Playing too far from existing stones (easy for opponent to ignore)
- ❌ Focusing only on offense (missing opponent's threats)
- ❌ Building only in one direction (easily blocked)
- ❌ Ignoring diagonal lines (they're just as valid!)

---

## Power Stones

Power stones add a strategic layer beyond traditional Gomoku. They're unlocked during the campaign.

### 💣 Bomb Stone / 炸弹石

**Effect**: Removes all stones (yours and opponent's) in a 3×3 area around the target.

**Strategy Tips**:
- Use to **break up** enemy clusters approaching 4-in-a-row
- Target intersections where opponent has **overlapping patterns**
- Don't waste on isolated stones — maximize collateral
- Be careful: your own stones in the blast zone are destroyed too!
- **Pro tip**: Bomb a position where the opponent has 3 stones and you have 0-1

### 🛡️ Shield Stone / 护盾石

**Effect**: Places an indestructible shield on one of your existing stones. Protected stones cannot be removed by Bomb.

**Strategy Tips**:
- Shield the **keystone** of your longest chain
- Protect stones at **intersection points** where two of your lines cross
- Use preemptively — once your stone is bombed, it's too late
- **Pro tip**: Shield a stone that serves double duty (part of both a horizontal and diagonal line)

### ✌️ Double Stone / 双子石

**Effect**: Place **two stones** in a single turn instead of one.

**Strategy Tips**:
- Save for **critical moments** — don't waste early
- Use to **complete a fork**: place both stones to create two simultaneous threats
- Perfect for **surprise finishes**: jump from 3-in-a-row to winning in one turn
- **Pro tip**: Place one stone to block an opponent's threat, and the second to advance your own position

### Power Stone Economy

- Power stones are **limited per level** — use them wisely
- You earn power stones by **completing campaign levels** with high star ratings
- Some levels **require** creative power stone use to achieve 3 stars

---

## Campaign Walkthrough Hints

> 💡 These are hints, not solutions. The fun is in figuring it out yourself!
>
> 提示而非答案，探索的乐趣留给你自己！

### Levels 1–2: The Basics / 基础关卡

- Play naturally, focus on learning the controls
- The AI is easy — use this time to practice building open threes
- **Hint**: Don't overthink it. Aggressive center play wins easily.

### Levels 3–4: Obstacles Enter / 障碍登场

- Obstacles block intersections — no one can play there
- Rethink your lines: a 5-in-a-row path that hits an obstacle is worthless
- **Hint for Level 3**: The corner obstacles actually help you by limiting AI options
- **Hint for Level 4**: The center wall divides the board — dominate one side first

### Levels 5–7: Power Stones Unlock / 能量石解锁

- Each level introduces a new power stone — learn one at a time
- Don't use them immediately; observe the board state first
- **Hint for Level 5**: Save the Bomb for when the AI builds a 3-in-a-row
- **Hint for Level 6**: Shield your center stone early — it pays off
- **Hint for Level 7**: Double stone + open three = instant win potential

### Levels 8–9: Full Challenge / 完全挑战

- The AI plays Hard now — it sees 4 moves ahead with gap analysis
- Obstacles get more complex — plan your routes carefully
- **Hint for Level 8**: Map out all possible 5-in-a-row paths before playing
- **Hint for Level 9**: Combine power stones! Bomb to clear, Shield to protect, Double to finish

### Level 10: Grand Master / 终极大师

- Master-level AI with opening book — it plays near-optimal openings
- AI goes first (you play White)
- All features active
- **Hint**: Play defensively for the first ~10 moves. The AI's opening book runs out after ~6 stones. Once it's in pure search mode, look for complex multi-directional threats that exceed its search depth.

---

## AI Difficulty Comparison

### Side-by-Side / 难度对比

| Aspect | Easy 🟢 | Medium 🟡 | Hard 🟠 | Master 🔴 |
|--------|---------|----------|--------|-----------|
| **Search** | None (random) | 2-ply minimax | 4-ply minimax+αβ | 6-ply iterative deepening |
| **Blocks threats?** | ~70% of the time | Always (1 move ahead) | Yes (2 moves ahead) | Yes (3+ moves ahead) |
| **Sees forks?** | No | Rarely | Often | Almost always |
| **Gap patterns?** | No | No | Yes (★★_★★) | Yes + advanced |
| **Opening book?** | No | No | No | Yes (first 3 moves) |
| **Typical game** | You win by move 20 | Competitive | Challenging | You'll probably lose |
| **Best for** | Learning rules | Casual play | Serious practice | Masochists 😈 |

### How to Beat Each Level

- **Easy**: Just play toward center and build freely
- **Medium**: Create one solid threat — it can't plan far enough to stop you
- **Hard**: You need fork attacks (double threats) — single threats get blocked
- **Master**: Play for complex board states with threats in 3+ directions. The AI's horizon is limited, so very long-range plans can succeed.

---

<p align="center"><em>Good luck, and may the best strategist win! 祝你好运！</em></p>
