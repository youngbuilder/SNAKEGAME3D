/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  public enabled = true;
  private boostOsc: OscillatorNode | null = null;
  private boostGain: GainNode | null = null;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playOrbCollect(value = 1) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const baseFreq = 520 + Math.min(600, value * 50);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  setBoost(active: boolean) {
    if (!this.enabled) {
      this.stopBoost();
      return;
    }
    try {
      this.init();
      if (!this.ctx) return;
      if (active) {
        if (!this.boostOsc) {
          this.boostOsc = this.ctx.createOscillator();
          this.boostGain = this.ctx.createGain();
          this.boostOsc.type = 'sawtooth';
          this.boostOsc.frequency.setValueAtTime(110, this.ctx.currentTime);
          this.boostGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
          this.boostGain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + 0.15);

          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(320, this.ctx.currentTime);
          this.boostOsc.connect(filter);
          filter.connect(this.boostGain);
          this.boostGain.connect(this.ctx.destination);
          this.boostOsc.start();
        }
      } else {
        this.stopBoost();
      }
    } catch {
      this.stopBoost();
    }
  }

  private stopBoost() {
    if (this.boostGain && this.ctx) {
      try {
        this.boostGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
        setTimeout(() => {
          if (this.boostOsc) {
            this.boostOsc.stop();
            this.boostOsc.disconnect();
            this.boostOsc = null;
          }
          this.boostGain = null;
        }, 80);
      } catch {
        this.boostOsc = null;
        this.boostGain = null;
      }
    } else {
      this.boostOsc = null;
      this.boostGain = null;
    }
  }

  playCrash() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.stopBoost();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.4);
    } catch {
      // Ignored
    }
  }
}

export const sounds = new SoundManager();
