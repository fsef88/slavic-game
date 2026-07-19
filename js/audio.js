// ============================================================
//  AUDIO — процедурная музыка + SFX
// ============================================================
let AC = null, master = null, musicGain = null, lastHit = 0, lastPick = 0, lastHurt = 0, audioOk = true;
let musicOn = false, drumsTimer = 0, bassNote = 0, leadNote = 0;
const BASS_NOTES = [55, 55, 73, 82, 65, 55, 49, 65];
const LEAD_NOTES = [220, 247, 277, 330, 294, 247, 220, 196, 220, 247, 277, 330, 392, 330, 277, 247];

function initAudio() { if (AC || !audioOk) return; try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = (typeof LS !== 'undefined' ? LS.num('cl_vol', 35) : 35) / 100; master.connect(AC.destination); musicGain = AC.createGain(); musicGain.gain.value = ((typeof LS !== 'undefined' ? LS.num('cl_mus', 25) : 25) / 100) * 0.4; musicGain.connect(master); } catch (e) { audioOk = false; AC = null; } }
function resumeAudio() { initAudio(); if (AC && AC.state === 'suspended') AC.resume(); if (!musicOn && AC) { musicOn = true; tickMusic(); } }

function tone(freq, dur, type, vol, slideTo, target) { if (!AC) return; try { const o = AC.createOscillator(), g = AC.createGain(); o.type = type || 'square'; o.frequency.setValueAtTime(freq, AC.currentTime); if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), AC.currentTime + dur); g.gain.setValueAtTime(vol || 0.2, AC.currentTime); g.gain.exponentialRampToValueAtTime(0.0008, AC.currentTime + dur); if (target) target.connect(g); else g.connect(master); o.connect(g); o.start(); o.stop(AC.currentTime + dur + 0.02); } catch (e) {} }
function noise(dur, vol, ff, target) { if (!AC) return; try { const n = AC.createBufferSource(), b = AC.createBuffer(1, Math.max(1, AC.sampleRate * dur | 0), AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; n.buffer = b; const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = ff || 1200; const g = AC.createGain(); g.gain.setValueAtTime(vol || 0.2, AC.currentTime); g.gain.exponentialRampToValueAtTime(0.0008, AC.currentTime + dur); if (target) target.connect(g); else g.connect(master); n.connect(f); f.connect(g); n.start(); n.stop(AC.currentTime + dur + 0.02); } catch (e) {} }

function sfxHit() { const t = performance.now(); if (t - lastHit < 35) return; lastHit = t; noise(0.05, 0.18, 2200); tone(380, 0.04, 'square', 0.08, 180); }
function sfxCrit() { noise(0.08, 0.25, 800); tone(220, 0.08, 'sawtooth', 0.15, 440); tone(880, 0.1, 'square', 0.1, 1320); }
function sfxSwing() { noise(0.04, 0.06, 900); }
function sfxDeath() { noise(0.18, 0.3, 500); tone(180, 0.15, 'sawtooth', 0.15, 40); }
function sfxPick() { const t = performance.now(); if (t - lastPick < 40) return; lastPick = t; tone(1100, 0.05, 'triangle', 0.1, 1800); }
function sfxLevel() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.2), i * 70)); }
function sfxHurt() { const t = performance.now(); if (t - lastHurt < 400) return; lastHurt = t; tone(140, 0.2, 'sawtooth', 0.18, 40); noise(0.12, 0.15, 300); if (typeof flashScreen === 'function') flashScreen('#c14a3a', 0.3); }
function sfxBoss() { if (!AC) return; tone(80, 0.8, 'sawtooth', 0.3, 30); setTimeout(() => noise(0.6, 0.35, 300), 250); }
function sfxEvo() { if (!AC) return; [659, 784, 988, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.22), i * 100)); }
function sfxAch() { if (!AC) return; tone(880, 0.12, 'triangle', 0.22); setTimeout(() => tone(1320, 0.18, 'triangle', 0.22), 120); setTimeout(() => tone(1760, 0.25, 'triangle', 0.2), 240); }
function sfxAnomaly() { tone(440, 0.2, 'sine', 0.15, 880); tone(660, 0.3, 'sine', 0.12, 1320); }
function sfxUpgrade() { tone(523, 0.1, 'square', 0.15, 1047); setTimeout(() => tone(1047, 0.15, 'square', 0.18, 1568), 80); }

let musicTimer = null;
function tickMusic() {
  if (!AC || !musicOn) return;
  if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
  drumsTimer -= 1 / 60; bassNote -= 1 / 60;
  if (drumsTimer <= 0) { tone(60, 0.1, 'sine', 0.15, 30, musicGain); noise(0.05, 0.06, 2000, musicGain); drumsTimer = 0.5; }
  if (bassNote <= 0) { const idx = Math.floor((typeof time !== 'undefined' ? time : 0) / 2) % BASS_NOTES.length; const n = BASS_NOTES[idx]; tone(n, 0.4, 'triangle', 0.18, n * 0.95, musicGain); tone(n * 0.5, 0.4, 'sine', 0.1, n * 0.48, musicGain); bassNote = 2; }
  if (Math.random() < 0.1) { const idx = Math.floor((typeof time !== 'undefined' ? time : 0) * 2) % LEAD_NOTES.length; const n = LEAD_NOTES[idx]; tone(n * 2, 0.3, 'triangle', 0.04, n * 4, musicGain); }
  musicTimer = setTimeout(tickMusic, 1000 / 30);
}

addEventListener('keydown', resumeAudio);
addEventListener('pointerdown', resumeAudio);
addEventListener('touchstart', resumeAudio);
