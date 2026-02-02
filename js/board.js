/**
 * Board - Canvas-based Gomoku board renderer
 * 15x15 grid with wood texture, 3D stones, hover preview, last-move highlight,
 * stone drop animation, win line glow, obstacle rendering, and touch support.
 */

export class Board {
  /** @type {number} */
  static SIZE = 15;

  constructor() {
    /** @type {HTMLCanvasElement} */
    this.canvas = null;
    /** @type {CanvasRenderingContext2D} */
    this.ctx = null;

    // Layout constants (recalculated on resize)
    this.padding = 0;
    this.cellSize = 0;
    this.stoneRadius = 0;
    this.boardPixelSize = 0;

    // State
    /** @type {Array<Array<number|null>>} 0 = black, 1 = white, null = empty */
    this.grid = [];
    this.hoverCell = null;   // {x, y}
    this.highlightedCell = null; // {x, y}

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseLeave = this._onMouseLeave.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);

    // Pre-built wood pattern (created once in init)
    this._woodPattern = null;

    // ── Animation state ─────────────────────────────────
    /** Map of "x,y" → { startTime } for stone drop animations */
    this._animStones = new Map();
    this._animDuration = 150; // ms

    /** Win line animation */
    this._winLine = null;       // [{x,y}, …]
    this._winAnimStart = 0;

    /** requestAnimationFrame id */
    this._animFrameId = null;

    // ── Obstacles ───────────────────────────────────────
    /** Set of "x,y" keys for blocked cells */
    this.obstacles = new Set();

    // ── Hover colour override ───────────────────────────
    /** 'black' | 'white' — set externally by app.js */
    this.currentColor = null;

    // ── Click-to-highlight callback (for move history) ──
    /** {x,y} temporarily highlighted from move history click */
    this._historyHighlight = null;
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Attach to a <canvas> element and perform first render.
   * @param {HTMLCanvasElement} canvas
   */
  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this._clearGrid();
    this._measure();
    this._buildWoodPattern();

    // HiDPI support
    this._setupHiDPI();

    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mouseleave', this._onMouseLeave);
    this.canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });

    this.render();
  }

  /**
   * Place a stone on the board with a drop animation.
   * @param {number} x  column 0-14
   * @param {number} y  row 0-14
   * @param {'black'|'white'} color
   */
  drawStone(x, y, color) {
    if (x < 0 || x >= Board.SIZE || y < 0 || y >= Board.SIZE) return;
    this.grid[y][x] = color === 'black' ? 0 : 1;
    this.highlightedCell = { x, y };
    this._historyHighlight = null;

    // Trigger drop animation
    this._animStones.set(`${x},${y}`, { startTime: performance.now() });
    this._startAnimLoop();

    this.render();
  }

  /**
   * Remove a stone (used by undo).
   */
  removeStone(x, y) {
    if (x < 0 || x >= Board.SIZE || y < 0 || y >= Board.SIZE) return;
    this.grid[y][x] = null;
    this._animStones.delete(`${x},${y}`);
    this.render();
  }

  /**
   * Reset board to empty state.
   */
  clearBoard() {
    this._clearGrid();
    this.highlightedCell = null;
    this.hoverCell = null;
    this._historyHighlight = null;
    this._animStones.clear();
    this.clearWinLine();
    this.obstacles.clear();
    this.render();
  }

  /* ── Win line animation ────────────────────────────────────── */

  /**
   * Set win line cells and start the pulsing glow animation.
   * @param {Array<{x:number,y:number}>} cells
   */
  setWinLine(cells) {
    if (!cells || cells.length === 0) return;
    this._winLine = cells;
    this._winAnimStart = performance.now();
    this._startAnimLoop();
  }

  /** Clear the win line animation. */
  clearWinLine() {
    this._winLine = null;
    this._winAnimStart = 0;
  }

  /* ── Obstacles ─────────────────────────────────────────────── */

  /** Mark a cell as blocked / obstacle. */
  setObstacle(x, y) {
    this.obstacles.add(`${x},${y}`);
    this.grid[y][x] = -1; // special marker
    this.render();
  }

  /** Remove all obstacles. */
  clearObstacles() {
    for (const key of this.obstacles) {
      const [x, y] = key.split(',').map(Number);
      if (this.grid[y]?.[x] === -1) this.grid[y][x] = null;
    }
    this.obstacles.clear();
    this.render();
  }

  /* ── History highlight ─────────────────────────────────────── */

  /** Temporarily highlight a stone from the move history list. */
  highlightHistoryMove(x, y) {
    this._historyHighlight = { x, y };
    this.render();
  }

  /** Clear the history highlight. */
  clearHistoryHighlight() {
    this._historyHighlight = null;
    this.render();
  }

  /**
   * Mark a cell with the last-move indicator.
   */
  highlightCell(x, y) {
    this.highlightedCell = { x, y };
    this.render();
  }

  /**
   * Convert pixel coordinates (from a click/touch event) to board coords.
   * Returns {x, y} or null if outside the grid.
   */
  getCellFromClick(mouseX, mouseY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const px = (mouseX - rect.left) * scaleX;
    const py = (mouseY - rect.top) * scaleY;

    const col = Math.round((px - this.padding) / this.cellSize);
    const row = Math.round((py - this.padding) / this.cellSize);

    if (col < 0 || col >= Board.SIZE || row < 0 || row >= Board.SIZE) return null;

    // Check if close enough to the intersection
    const ix = this.padding + col * this.cellSize;
    const iy = this.padding + row * this.cellSize;
    const dist = Math.hypot(px - ix, py - iy);
    if (dist > this.cellSize * 0.45) return null;

    return { x: col, y: row };
  }

  /**
   * Check if a cell is empty (not occupied and not an obstacle).
   */
  isEmpty(x, y) {
    const v = this.grid[y]?.[x];
    return v === null || v === undefined;
  }

  /**
   * Force a full re-render.
   */
  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    this._drawBoard(ctx);
    this._drawStarPoints(ctx);
    this._drawGridLines(ctx);
    this._drawObstacles(ctx);
    this._drawAllStones(ctx);
    this._drawHighlight(ctx);
    this._drawHistoryHighlight(ctx);
    this._drawWinGlow(ctx);
    this._drawMoveNumbers(ctx);
    this._drawHover(ctx);
  }

  /**
   * Re-measure and re-render (call on resize).
   */
  resize() {
    this._measure();
    this._setupHiDPI();
    this._buildWoodPattern();
    this.render();
  }

  /* ------------------------------------------------------------------ */
  /*  Internal helpers                                                   */
  /* ------------------------------------------------------------------ */

  _clearGrid() {
    this.grid = Array.from({ length: Board.SIZE }, () =>
      Array(Board.SIZE).fill(null)
    );
  }

  _measure() {
    // The canvas element's CSS size determines layout
    const rect = this.canvas.getBoundingClientRect();
    const side = Math.min(rect.width, rect.height);
    this.boardPixelSize = side * window.devicePixelRatio;
    this.padding = this.boardPixelSize * 0.05;
    this.cellSize =
      (this.boardPixelSize - this.padding * 2) / (Board.SIZE - 1);
    this.stoneRadius = this.cellSize * 0.44;
  }

  _setupHiDPI() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
  }

  /* ---------- Wood pattern ---------- */

  _buildWoodPattern() {
    const size = 256;
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const c = off.getContext('2d');

    // Base colour
    c.fillStyle = '#dcb35c';
    c.fillRect(0, 0, size, size);

    // Grain lines
    c.strokeStyle = 'rgba(160, 120, 50, 0.18)';
    for (let i = 0; i < size; i += 4) {
      c.beginPath();
      c.lineWidth = 1 + Math.random() * 2;
      c.moveTo(0, i + Math.random() * 3);
      let x = 0;
      while (x < size) {
        x += 10 + Math.random() * 20;
        c.lineTo(x, i + (Math.random() - 0.5) * 4);
      }
      c.stroke();
    }

    // Subtle noise overlay
    const imgData = c.getImageData(0, 0, size, size);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 12;
      d[i] += n;
      d[i + 1] += n;
      d[i + 2] += n;
    }
    c.putImageData(imgData, 0, 0);

    this._woodPattern = this.ctx.createPattern(off, 'repeat');
  }

  /* ---------- Drawing primitives ---------- */

  _drawBoard(ctx) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const r = 12 * (window.devicePixelRatio || 1);

    // Rounded rect filled with wood pattern
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, r);
    ctx.clip();

    ctx.fillStyle = this._woodPattern || '#dcb35c';
    ctx.fillRect(0, 0, w, h);

    // Warm overlay gradient
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
    g.addColorStop(0, 'rgba(255,235,180,0.18)');
    g.addColorStop(1, 'rgba(120,80,20,0.12)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();

    // Board edge shadow (inset)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, r);
    ctx.strokeStyle = 'rgba(80, 50, 10, 0.5)';
    ctx.lineWidth = 2 * (window.devicePixelRatio || 1);
    ctx.stroke();
    ctx.restore();
  }

  _drawGridLines(ctx) {
    const p = this.padding;
    const cs = this.cellSize;
    const n = Board.SIZE;

    ctx.save();
    ctx.strokeStyle = 'rgba(50, 30, 5, 0.55)';
    ctx.lineWidth = 1 * (window.devicePixelRatio || 1);

    for (let i = 0; i < n; i++) {
      const pos = p + i * cs;

      // Horizontal
      ctx.beginPath();
      ctx.moveTo(p, pos);
      ctx.lineTo(p + (n - 1) * cs, pos);
      ctx.stroke();

      // Vertical
      ctx.beginPath();
      ctx.moveTo(pos, p);
      ctx.lineTo(pos, p + (n - 1) * cs);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawStarPoints(ctx) {
    const points = [3, 7, 11]; // standard star point positions
    const r = this.cellSize * 0.1;

    ctx.save();
    ctx.fillStyle = 'rgba(50, 30, 5, 0.6)';
    for (const row of points) {
      for (const col of points) {
        const cx = this.padding + col * this.cellSize;
        const cy = this.padding + row * this.cellSize;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  _drawAllStones(ctx) {
    const now = performance.now();
    for (let y = 0; y < Board.SIZE; y++) {
      for (let x = 0; x < Board.SIZE; x++) {
        const v = this.grid[y][x];
        if (v === null || v === -1) continue;

        // Check for drop animation
        const key = `${x},${y}`;
        const anim = this._animStones.get(key);
        let scale = 1;

        if (anim) {
          const elapsed = now - anim.startTime;
          const progress = Math.min(elapsed / this._animDuration, 1);
          // Ease-out cubic for snappy feel
          const eased = 1 - Math.pow(1 - progress, 3);
          scale = 0.3 + 0.7 * eased;

          if (progress >= 1) {
            this._animStones.delete(key);
          }
        }

        this._renderStone(ctx, x, y, v === 0 ? 'black' : 'white', 1, scale);
      }
    }
  }

  _renderStone(ctx, col, row, color, alpha = 1, scale = 1) {
    const cx = this.padding + col * this.cellSize;
    const cy = this.padding + row * this.cellSize;
    const r = this.stoneRadius * scale;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Shadow
    ctx.beginPath();
    ctx.arc(cx + r * 0.08, cy + r * 0.12, r * 1.02, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();

    // Stone body
    const grad = ctx.createRadialGradient(
      cx - r * 0.3,
      cy - r * 0.3,
      r * 0.1,
      cx,
      cy,
      r
    );

    if (color === 'black') {
      grad.addColorStop(0, '#555');
      grad.addColorStop(0.5, '#222');
      grad.addColorStop(1, '#000');
    } else {
      grad.addColorStop(0, '#fff');
      grad.addColorStop(0.5, '#eee');
      grad.addColorStop(1, '#bbb');
    }

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Gloss highlight
    const gloss = ctx.createRadialGradient(
      cx - r * 0.25,
      cy - r * 0.25,
      0,
      cx - r * 0.25,
      cy - r * 0.25,
      r * 0.6
    );
    gloss.addColorStop(0, `rgba(255,255,255,${color === 'black' ? 0.18 : 0.5})`);
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = gloss;
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draw a move number label on a stone (for training replay).
   * @param {number} col
   * @param {number} row
   * @param {number} num  Move number to display
   * @param {string} color  'black' or 'white' (stone color, text will contrast)
   */
  drawMoveNumber(col, row, num, color) {
    // Store for re-render
    if (!this._moveNumbers) this._moveNumbers = [];
    this._moveNumbers.push({ col, row, num, color });
    this.render();
  }

  /** Clear all move number labels. */
  clearMoveNumbers() {
    this._moveNumbers = [];
  }

  /** @private Draw move numbers on rendered board */
  _drawMoveNumbers(ctx) {
    if (!this._moveNumbers || this._moveNumbers.length === 0) return;
    ctx.save();
    for (const { col, row, num, color } of this._moveNumbers) {
      const cx = this.padding + col * this.cellSize;
      const cy = this.padding + row * this.cellSize;
      const fontSize = Math.max(10, this.stoneRadius * 0.75);
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color === 'black' ? '#fff' : '#000';
      ctx.fillText(String(num), cx, cy + 1);
    }
    ctx.restore();
  }

  /* ---------- Last-move indicator (red dot) ---------- */

  _drawHighlight(ctx) {
    if (!this.highlightedCell) return;
    const { x, y } = this.highlightedCell;
    const v = this.grid[y]?.[x];
    if (v === null || v === -1 || v === undefined) return;

    const cx = this.padding + x * this.cellSize;
    const cy = this.padding + y * this.cellSize;
    const r = this.stoneRadius * 0.25;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();

    // Glow
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.8, 0, Math.PI * 2);
    const glow = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.8);
    glow.addColorStop(0, 'rgba(239,68,68,0.35)');
    glow.addColorStop(1, 'rgba(239,68,68,0)');
    ctx.fillStyle = glow;
    ctx.fill();

    ctx.restore();
  }

  /* ---------- History move highlight (blue ring) ---------- */

  _drawHistoryHighlight(ctx) {
    if (!this._historyHighlight) return;
    const { x, y } = this._historyHighlight;
    const v = this.grid[y]?.[x];
    if (v === null || v === -1 || v === undefined) return;

    const cx = this.padding + x * this.cellSize;
    const cy = this.padding + y * this.cellSize;
    const r = this.stoneRadius;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2 * (window.devicePixelRatio || 1), 0, Math.PI * 2);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3 * (window.devicePixelRatio || 1);
    ctx.stroke();

    // Outer glow
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2);
    const glow = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.4);
    glow.addColorStop(0, 'rgba(59,130,246,0.2)');
    glow.addColorStop(1, 'rgba(59,130,246,0)');
    ctx.fillStyle = glow;
    ctx.fill();

    ctx.restore();
  }

  /* ---------- Win line pulsing glow ---------- */

  _drawWinGlow(ctx) {
    if (!this._winLine || this._winLine.length === 0) return;

    const now = performance.now();
    const elapsed = now - this._winAnimStart;
    // Pulse with a sine wave — period ~1.2s
    const pulse = 0.5 + 0.5 * Math.sin(elapsed / 190);
    const glowAlpha = 0.25 + pulse * 0.4;
    const glowSize = 1.2 + pulse * 0.5;

    ctx.save();
    for (const { x, y } of this._winLine) {
      const cx = this.padding + x * this.cellSize;
      const cy = this.padding + y * this.cellSize;
      const r = this.stoneRadius;

      // Outer glow
      ctx.beginPath();
      ctx.arc(cx, cy, r * glowSize, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * glowSize);
      grad.addColorStop(0, `rgba(250, 204, 21, ${glowAlpha})`);
      grad.addColorStop(0.6, `rgba(250, 204, 21, ${glowAlpha * 0.4})`);
      grad.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Inner ring
      ctx.beginPath();
      ctx.arc(cx, cy, r + 2 * (window.devicePixelRatio || 1), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(250, 204, 21, ${0.6 + pulse * 0.4})`;
      ctx.lineWidth = (2 + pulse) * (window.devicePixelRatio || 1);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- Obstacle rendering ---------- */

  _drawObstacles(ctx) {
    if (this.obstacles.size === 0) return;

    ctx.save();
    const dpr = window.devicePixelRatio || 1;

    for (const key of this.obstacles) {
      const [x, y] = key.split(',').map(Number);
      const cx = this.padding + x * this.cellSize;
      const cy = this.padding + y * this.cellSize;
      const halfSize = this.cellSize * 0.32;

      // Gray square background
      ctx.fillStyle = 'rgba(120, 120, 140, 0.25)';
      ctx.fillRect(cx - halfSize, cy - halfSize, halfSize * 2, halfSize * 2);

      // X mark
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(200, 60, 60, 0.6)';
      ctx.lineWidth = 2.5 * dpr;
      ctx.lineCap = 'round';
      const s = halfSize * 0.7;
      ctx.moveTo(cx - s, cy - s);
      ctx.lineTo(cx + s, cy + s);
      ctx.moveTo(cx + s, cy - s);
      ctx.lineTo(cx - s, cy + s);
      ctx.stroke();
    }

    ctx.restore();
  }

  /* ---------- Hover preview ---------- */

  _drawHover(ctx) {
    if (!this.hoverCell) return;
    const { x, y } = this.hoverCell;
    const v = this.grid[y]?.[x];
    if (v !== null && v !== undefined) return;

    // Use currentColor if set externally, otherwise count stones
    let color;
    if (this.currentColor) {
      color = this.currentColor;
    } else {
      let count = 0;
      for (let r = 0; r < Board.SIZE; r++)
        for (let c = 0; c < Board.SIZE; c++)
          if (this.grid[r][c] !== null && this.grid[r][c] !== -1) count++;
      color = count % 2 === 0 ? 'black' : 'white';
    }
    this._renderStone(ctx, x, y, color, 0.35);
  }

  /* ---------- Animation loop ---------- */

  _startAnimLoop() {
    if (this._animFrameId) return;
    this._animLoop();
  }

  _animLoop() {
    const hasStoneAnims = this._animStones.size > 0;
    const hasWinAnim = this._winLine && this._winLine.length > 0;

    if (!hasStoneAnims && !hasWinAnim) {
      this._animFrameId = null;
      return;
    }

    this.render();
    this._animFrameId = requestAnimationFrame(() => this._animLoop());
  }

  /* ---------- Event handlers ---------- */

  _onMouseMove(e) {
    const cell = this.getCellFromClick(e.clientX, e.clientY);
    const prev = this.hoverCell;

    if (
      cell &&
      (!prev || prev.x !== cell.x || prev.y !== cell.y)
    ) {
      this.hoverCell = cell;
      this.render();
    } else if (!cell && prev) {
      this.hoverCell = null;
      this.render();
    }
  }

  _onMouseLeave() {
    if (this.hoverCell) {
      this.hoverCell = null;
      this.render();
    }
  }

  _onTouchStart(e) {
    // Prevent mouse event emulation and scrolling while playing
    e.preventDefault();

    const touch = e.touches[0];
    if (!touch) return;

    const cell = this.getCellFromClick(touch.clientX, touch.clientY);
    if (cell) {
      // Set hover for visual feedback, then fire a synthetic click
      this.hoverCell = cell;
      this.render();

      // Dispatch a click event so the existing click handler in app.js works
      const clickEvent = new MouseEvent('click', {
        clientX: touch.clientX,
        clientY: touch.clientY,
        bubbles: true,
      });
      this.canvas.dispatchEvent(clickEvent);
    }
  }
}
