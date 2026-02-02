/**
 * SoundManager – Programmatic sound effects using Web Audio API.
 * No external audio files needed; all sounds are generated with oscillators.
 */

export class SoundManager {
  constructor() {
    /** @type {AudioContext|null} */
    this._ctx = null;
    this._muted = false;
    this._initialized = false;
    this._volume = 0.3;

    // Restore mute preference
    try {
      this._muted = localStorage.getItem('gomoku-muted') === 'true';
    } catch { /* ignore */ }
  }

  /* ── Public API ──────────────────────────────────────────────── */

  get muted() { return this._muted; }

  set muted(v) {
    this._muted = !!v;
    try { localStorage.setItem('gomoku-muted', this._muted); } catch { /* ignore */ }
  }

  /** Toggle mute and return new muted state. */
  toggle() {
    this.muted = !this._muted;
    return this._muted;
  }

  /**
   * Play a named sound effect.
   * @param {'place'|'capture'|'win'|'lose'} name
   */
  play(name) {
    if (this._muted) return;
    this._ensureContext();
    if (!this._ctx) return;

    // Resume context if suspended (autoplay policy)
    if (this._ctx.state === 'suspended') {
      this._ctx.resume();
    }

    switch (name) {
      case 'place':   this._playPlace();   break;
      case 'capture': this._playCapture(); break;
      case 'win':     this._playWin();     break;
      case 'lose':    this._playLose();    break;
    }
  }

  /* ── Internals ───────────────────────────────────────────────── */

  _ensureContext() {
    if (this._initialized) return;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._initialized = true;
    } catch {
      this._ctx = null;
    }
  }

  /** Create a gain node connected to destination with given volume. */
  _makeGain(vol = this._volume) {
    const gain = this._ctx.createGain();
    gain.connect(this._ctx.destination);
    gain.gain.value = vol;
    return gain;
  }

  /* ── Sound: Place ("tok") ──────────────────────────────────── */

  _playPlace() {
    const ctx = this._ctx;
    const t = ctx.currentTime;

    // Two layered oscillators for a woody "tok" click
    // Layer 1: High attack
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(900, t);
    osc1.frequency.exponentialRampToValueAtTime(350, t + 0.04);
    g1.gain.setValueAtTime(this._volume, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc1.connect(g1).connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.08);

    // Layer 2: Low body
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(200, t);
    osc2.frequency.exponentialRampToValueAtTime(100, t + 0.06);
    g2.gain.setValueAtTime(this._volume * 0.5, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc2.connect(g2).connect(ctx.destination);
    osc2.start(t);
    osc2.stop(t + 0.1);

    // Layer 3: Noise burst for "click" texture
    this._noiseHit(t, 0.05, this._volume * 0.15);
  }

  /* ── Sound: Capture / Bomb ("pop") ─────────────────────────── */

  _playCapture() {
    const ctx = this._ctx;
    const t = ctx.currentTime;

    // Quick pitch-down pop
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.12);
    g.gain.setValueAtTime(this._volume * 0.8, t);
    g.gain.setValueAtTime(this._volume * 0.6, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);

    // Secondary pop burst
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(300, t + 0.02);
    osc2.frequency.exponentialRampToValueAtTime(80, t + 0.1);
    g2.gain.setValueAtTime(this._volume * 0.2, t + 0.02);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc2.connect(g2).connect(ctx.destination);
    osc2.start(t + 0.02);
    osc2.stop(t + 0.15);
  }

  /* ── Sound: Win (ascending chime) ──────────────────────────── */

  _playWin() {
    const ctx = this._ctx;
    const t = ctx.currentTime;
    // C5, E5, G5, C6 — major arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50];

    notes.forEach((freq, i) => {
      const delay = i * 0.11;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, t + delay);
      g.gain.linearRampToValueAtTime(this._volume * 0.7, t + delay + 0.015);
      g.gain.setValueAtTime(this._volume * 0.5, t + delay + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.45);

      osc.connect(g).connect(ctx.destination);
      osc.start(t + delay);
      osc.stop(t + delay + 0.5);

      // Harmonic overtone
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2;
      g2.gain.setValueAtTime(0, t + delay);
      g2.gain.linearRampToValueAtTime(this._volume * 0.15, t + delay + 0.01);
      g2.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.3);
      osc2.connect(g2).connect(ctx.destination);
      osc2.start(t + delay);
      osc2.stop(t + delay + 0.35);
    });
  }

  /* ── Sound: Lose (descending tone) ─────────────────────────── */

  _playLose() {
    const ctx = this._ctx;
    const t = ctx.currentTime;
    // G4, Eb4, C4, G3 — minor descending
    const notes = [392.00, 311.13, 261.63, 196.00];

    notes.forEach((freq, i) => {
      const delay = i * 0.16;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, t + delay);
      g.gain.linearRampToValueAtTime(this._volume * 0.45, t + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.4);

      osc.connect(g).connect(ctx.destination);
      osc.start(t + delay);
      osc.stop(t + delay + 0.45);
    });
  }

  /* ── Utility: noise burst ──────────────────────────────────── */

  _noiseHit(startTime, duration, volume) {
    const ctx = this._ctx;
    const sampleRate = ctx.sampleRate;
    const length = Math.ceil(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      // Exponential decay noise
      const env = Math.exp(-i / (length * 0.2));
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Bandpass filter to shape the noise
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 4000;
    filter.Q.value = 1.5;

    const g = ctx.createGain();
    g.gain.value = volume;

    source.connect(filter).connect(g).connect(ctx.destination);
    source.start(startTime);
  }
}
