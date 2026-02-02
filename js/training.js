/**
 * Training Mode — replay classic games, step through moves, quiz mode.
 * Pure UI logic, no AI dependency.
 */

export class TrainingMode {
  /**
   * @param {object} opts
   * @param {object} opts.board  - BoardRenderer instance
   * @param {Function} opts.onStatus - setStatus(msg)
   */
  constructor({ board, onStatus }) {
    this.board = board;
    this.onStatus = onStatus || (() => {});
    this.games = [];
    this.currentGame = null;
    this.currentStep = 0;   // how many moves are shown (0 = empty board)
    this.autoTimer = null;
    this.quizMode = false;
    this.quizAnswered = false;
    this._boardClickHandler = null;
  }

  // ── Data loading ───────────────────────────────────────────────

  async loadGames() {
    try {
      const resp = await fetch('data/training-games.json');
      this.games = await resp.json();
      return this.games;
    } catch (e) {
      console.error('Failed to load training games:', e);
      this.games = [];
      return [];
    }
  }

  getFilteredGames(tag) {
    if (!tag || tag === 'all') return this.games;
    return this.games.filter(g => g.tags && g.tags.includes(tag));
  }

  // ── Game selection ─────────────────────────────────────────────

  selectGame(gameId) {
    this.currentGame = this.games.find(g => g.id === gameId) || null;
    this.currentStep = 0;
    this.quizMode = false;
    this.quizAnswered = false;
    this.stopAuto();
    this._renderBoard();
    return this.currentGame;
  }

  // ── Navigation ─────────────────────────────────────────────────

  goToStart() {
    this.currentStep = 0;
    this.quizAnswered = false;
    this._renderBoard();
  }

  goToEnd() {
    if (!this.currentGame) return;
    this.currentStep = this.currentGame.moves.length;
    this._renderBoard();
  }

  nextMove() {
    if (!this.currentGame) return false;
    if (this.currentStep >= this.currentGame.moves.length) return false;

    if (this.quizMode && !this.quizAnswered) {
      // In quiz mode, don't advance — user must guess
      return false;
    }

    this.currentStep++;
    this.quizAnswered = false;
    this._renderBoard();
    return true;
  }

  prevMove() {
    if (!this.currentGame || this.currentStep <= 0) return false;
    this.currentStep--;
    this.quizAnswered = false;
    this._renderBoard();
    return true;
  }

  // ── Auto-play ──────────────────────────────────────────────────

  toggleAuto() {
    if (this.autoTimer) {
      this.stopAuto();
      return false;
    }
    this.startAuto();
    return true;
  }

  startAuto() {
    this.stopAuto();
    this.autoTimer = setInterval(() => {
      if (!this.nextMove()) {
        this.stopAuto();
      }
    }, 800);
  }

  stopAuto() {
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
      this.autoTimer = null;
    }
  }

  get isAutoPlaying() {
    return !!this.autoTimer;
  }

  // ── Quiz mode ──────────────────────────────────────────────────

  toggleQuiz() {
    this.quizMode = !this.quizMode;
    this.quizAnswered = false;
    this.stopAuto();
    return this.quizMode;
  }

  /**
   * Handle a board click in quiz mode.
   * @param {number} col
   * @param {number} row
   * @returns {{ correct: boolean, actualCol: number, actualRow: number }|null}
   */
  checkGuess(col, row) {
    if (!this.quizMode || !this.currentGame) return null;
    if (this.quizAnswered) return null;
    if (this.currentStep >= this.currentGame.moves.length) return null;

    const nextMove = this.currentGame.moves[this.currentStep];
    const [actualCol, actualRow] = nextMove;
    const correct = (col === actualCol && row === actualRow);

    this.quizAnswered = true;

    // Show the actual move
    this.currentStep++;
    this._renderBoard();

    return { correct, actualCol, actualRow };
  }

  // ── Annotation for current step ────────────────────────────────

  getCurrentAnnotation() {
    if (!this.currentGame || this.currentStep === 0) return null;
    const anns = this.currentGame.annotations || [];
    return anns.find(a => a.move === this.currentStep - 1) || null;
  }

  // ── Board rendering ────────────────────────────────────────────

  _renderBoard() {
    if (!this.currentGame || !this.board) return;

    // Clear board completely
    this.board.clearBoard();
    this.board.clearMoveNumbers();

    // Draw stones up to currentStep
    const moves = this.currentGame.moves;
    for (let i = 0; i < this.currentStep && i < moves.length; i++) {
      const [col, row, player] = moves[i];
      const color = player === 1 ? 'black' : 'white';
      this.board.grid[row][col] = color === 'black' ? 0 : 1;
    }

    // Highlight last move with red dot
    if (this.currentStep > 0 && this.currentStep <= moves.length) {
      const [col, row] = moves[this.currentStep - 1];
      this.board.highlightedCell = { x: col, y: row };
    }

    // Show last few move numbers for context
    const showCount = Math.min(5, this.currentStep);
    for (let i = this.currentStep - showCount; i < this.currentStep; i++) {
      if (i < 0) continue;
      const [col, row, player] = moves[i];
      this.board.drawMoveNumber(col, row, i + 1, player === 1 ? 'black' : 'white');
    }

    // Show win line if at last move
    if (this.currentStep === moves.length && this.currentGame.winLine) {
      this.board.setWinLine(this.currentGame.winLine);
    }

    this.board.render();

    // Update status
    if (this.currentStep === 0) {
      this.onStatus(`${this.currentGame.title} — 点击 ▶ 开始回放`);
    } else if (this.currentStep >= moves.length) {
      const w = this.currentGame.winner;
      this.onStatus(`${this.currentGame.title} — ${w===1?'黑胜':w===2?'白胜':'和棋'} (${moves.length}手)`);
    } else {
      const [,,p] = moves[this.currentStep - 1];
      this.onStatus(`第 ${this.currentStep}/${moves.length} 手 — ${p===1?'黑':'白'}棋`);
    }
  }

  // ── Cleanup ────────────────────────────────────────────────────

  destroy() {
    this.stopAuto();
    this.currentGame = null;
  }
}
