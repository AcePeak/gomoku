/**
 * CampaignManager – 10-level single-player campaign with power stones,
 * obstacles, star ratings, and localStorage persistence.
 */

export class CampaignManager {
  constructor() {
    /**
     * Level definitions.
     * obstacles: [x, y] pairs (x = col, y = row) matching Board/Game convention.
     * powerStones: { bomb, shield, double } counts.
     * starThresholds: [1-star, 2-star, 3-star] max move counts.
     */
    this.levels = [
      {
        id: 1, name: 'First Steps', ai: 'easy',
        obstacles: [],
        powerStones: {},
        starThresholds: [30, 20, 15],
        desc: 'Win your first game!',
      },
      {
        id: 2, name: "Bomb's Away", ai: 'easy',
        obstacles: [],
        powerStones: { bomb: 1 },
        starThresholds: [25, 18, 12],
        desc: 'Use your bomb to remove an enemy stone.',
      },
      {
        id: 3, name: 'Defend!', ai: 'medium',
        obstacles: [[3, 3], [11, 11]],
        powerStones: { shield: 1 },
        starThresholds: [30, 22, 16],
        desc: 'Place a shield to block key cells.',
      },
      {
        id: 4, name: 'Double Trouble', ai: 'medium',
        obstacles: [[5, 5], [9, 9]],
        powerStones: { double: 1 },
        starThresholds: [28, 20, 14],
        desc: 'Place two stones in a single turn!',
      },
      {
        id: 5, name: 'Rocky Road', ai: 'medium',
        obstacles: [[2, 7], [4, 4], [7, 2], [7, 12], [10, 10], [12, 7]],
        powerStones: { bomb: 1, shield: 1 },
        starThresholds: [35, 25, 18],
        desc: 'Navigate a field of obstacles.',
      },
      {
        id: 6, name: 'The Gauntlet', ai: 'hard',
        obstacles: [[3, 7], [7, 3], [7, 11], [11, 7]],
        powerStones: { bomb: 1, shield: 1, double: 1 },
        starThresholds: [40, 30, 22],
        desc: 'All power stones, tougher AI.',
      },
      {
        id: 7, name: 'Mind Games', ai: 'hard',
        obstacles: [],
        powerStones: {},
        starThresholds: [35, 25, 18],
        desc: 'No powers, no obstacles — pure skill.',
      },
      {
        id: 8, name: 'Fortress', ai: 'hard',
        obstacles: [
          [3, 3], [4, 3], [5, 3],
          [9, 11], [10, 11], [11, 11],
          [6, 6], [7, 6], [7, 8], [8, 8],
        ],
        powerStones: { bomb: 2, shield: 1 },
        starThresholds: [45, 35, 25],
        desc: 'Break through the fortress walls.',
      },
      {
        id: 9, name: "Master's Trial", ai: 'master',
        obstacles: [[4, 4], [4, 10], [10, 4], [10, 10]],
        powerStones: { bomb: 1, double: 1 },
        starThresholds: [50, 38, 28],
        desc: 'Face a master-level opponent.',
      },
      {
        id: 10, name: 'Grand Master', ai: 'master',
        obstacles: [[2, 2], [2, 12], [7, 7], [12, 2], [12, 12]],
        powerStones: { bomb: 2, shield: 1, double: 1 },
        starThresholds: [55, 40, 30],
        desc: 'The ultimate challenge.',
      },
    ];

    this.currentLevel = 0;
    this.stars = new Array(this.levels.length).fill(0);
    this.unlockedLevel = 0; // index of highest unlocked level

    this.loadProgress();
  }

  /* ── Queries ──────────────────────────────────────────────────── */

  /** Deep-clone a level config so callers can mutate powerStones freely. */
  getLevelConfig(index) {
    if (index < 0 || index >= this.levels.length) return null;
    const lvl = this.levels[index];
    return {
      ...lvl,
      obstacles: lvl.obstacles.map((o) => [...o]),
      powerStones: { ...lvl.powerStones },
    };
  }

  /** Total stars earned across all levels. */
  getTotalStars() {
    return this.stars.reduce((a, b) => a + b, 0);
  }

  /** Maximum possible stars (levels × 3). */
  getMaxStars() {
    return this.levels.length * 3;
  }

  /* ── Actions ──────────────────────────────────────────────────── */

  /**
   * Start a level. Returns the config or null if locked.
   * @param {number} index 0-based level index.
   */
  startLevel(index) {
    if (index < 0 || index >= this.levels.length) return null;
    if (index > this.unlockedLevel) return null;
    this.currentLevel = index;
    return this.getLevelConfig(index);
  }

  /**
   * Complete the current level.
   * @param {boolean} won  Did the human win?
   * @param {number} moveCount  Human's move count.
   * @returns {{ stars: number, unlockNext: boolean }}
   */
  completeLevel(won, moveCount) {
    if (!won) {
      return { stars: 0, unlockNext: false };
    }

    const config = this.levels[this.currentLevel];
    const [one, two, three] = config.starThresholds;

    let earnedStars = 1;
    if (moveCount <= two) earnedStars = 2;
    if (moveCount <= three) earnedStars = 3;

    // Keep best result
    if (earnedStars > this.stars[this.currentLevel]) {
      this.stars[this.currentLevel] = earnedStars;
    }

    // Unlock next
    let unlockNext = false;
    if (
      this.currentLevel + 1 < this.levels.length &&
      this.currentLevel + 1 > this.unlockedLevel
    ) {
      this.unlockedLevel = this.currentLevel + 1;
      unlockNext = true;
    }

    this.saveProgress();
    return { stars: earnedStars, unlockNext };
  }

  /* ── Persistence ──────────────────────────────────────────────── */

  saveProgress() {
    try {
      localStorage.setItem(
        'gomoku-campaign',
        JSON.stringify({
          stars: this.stars,
          unlockedLevel: this.unlockedLevel,
        }),
      );
    } catch {
      /* storage full or unavailable */
    }
  }

  loadProgress() {
    try {
      const raw = localStorage.getItem('gomoku-campaign');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.stars) && data.stars.length === this.levels.length) {
        this.stars = data.stars;
      }
      if (typeof data.unlockedLevel === 'number') {
        this.unlockedLevel = Math.min(
          data.unlockedLevel,
          this.levels.length - 1,
        );
      }
    } catch {
      /* corrupt data — start fresh */
    }
  }
}
