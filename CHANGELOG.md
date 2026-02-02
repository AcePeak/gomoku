# Changelog

All notable changes to GomokuX will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-02-02

### 🎉 Initial Release

#### Added
- **Game Board**: 15×15 board with HTML5 Canvas rendering
  - Procedural wood texture background
  - 3D stone rendering with radial gradients and gloss highlights
  - Hover preview showing ghost stone at cursor position
  - Last-move red dot indicator
  - Star points at standard positions (3,3), (3,7), (3,11), etc.
  - HiDPI / Retina display support

- **Game Engine**: Pure logic module with no DOM dependencies
  - Standard Gomoku rules (exactly 5 in a row wins)
  - Optional overline rule (6+ can be toggled)
  - Full move history with undo support
  - State serialization / deserialization
  - Smart move generation (radius-based candidate filtering)

- **AI Opponent**: 4 difficulty levels
  - **Easy**: Weighted random with center preference, blocks obvious wins 70%
  - **Medium**: Minimax depth 2, basic pattern evaluation
  - **Hard**: Minimax depth 4 with alpha-beta pruning, advanced gap-aware evaluation
  - **Master**: Iterative deepening to depth 6, opening book, time-limited search

- **Campaign Mode**: 10-level progressive campaign
  - Increasing AI difficulty across levels
  - Board obstacles for strategic depth
  - Power stone unlocks (Bomb, Shield, Double)
  - 3-star rating system per level

- **Power Stones**: Special abilities that alter gameplay
  - 💣 Bomb: Remove stones in a 3×3 area
  - 🛡️ Shield: Protect a stone from removal
  - ✌️ Double: Place two stones in a single turn

- **UI & UX**
  - Dark theme with warm gold accents
  - Landing page with gradient title and play button
  - Sidebar with turn indicator, score, and action buttons
  - Fixed status bar for game messages
  - Responsive layout for mobile, tablet, and desktop
  - CSS transitions and hover effects

- **Sound Effects**: Audio feedback for stone placement and game events

- **Technical Foundation**
  - Pure ES Modules (no bundler required)
  - Zero external dependencies
  - Unit test suite for game engine

---

[1.0.0]: https://github.com/AcePeak/gomoku/releases/tag/v1.0.0
