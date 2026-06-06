let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playMoveSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  // Fast frequency sweep down to simulate a knock/click
  osc.frequency.setValueAtTime(350, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.09);
}

export function playCaptureSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const noise = ctx.createOscillator(); // we will mix a lower oscillator and high pitch decay
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);

  // Short noise burst using triangle wave at high frequency decaying fast
  noise.type = 'triangle';
  noise.frequency.setValueAtTime(800, now);
  noise.frequency.exponentialRampToValueAtTime(300, now + 0.05);

  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

  osc.connect(gain);
  noise.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  noise.start(now);
  osc.stop(now + 0.16);
  noise.stop(now + 0.16);
}

export function playCheckSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // Two quick high pitch warning beeps (dyad)
  const playBeep = (freq: number, startTime: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    
    gain.gain.setValueAtTime(0.15, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration - 0.01);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  playBeep(587.33, now, 0.08); // D5
  playBeep(783.99, now + 0.08, 0.15); // G5
}

export function playGameOverSound(won: boolean) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const playNote = (freq: number, startTime: number, duration: number, volume: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);
    
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration - 0.02);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  if (won) {
    // Majestic major chord arpeggio
    playNote(261.63, now, 0.35, 0.2);        // C4
    playNote(329.63, now + 0.12, 0.35, 0.2); // E4
    playNote(392.00, now + 0.24, 0.35, 0.2); // G4
    playNote(523.25, now + 0.36, 0.6, 0.2);  // C5
  } else {
    // Somber minor/descending progression
    playNote(293.66, now, 0.35, 0.2);        // D4
    playNote(349.23, now + 0.15, 0.35, 0.2); // F4
    playNote(220.00, now + 0.30, 0.6, 0.2);  // A3
  }
}
