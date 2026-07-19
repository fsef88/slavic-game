// ============================================================
//  ENTITIES — враги, спавн, типы, AI
// ============================================================
const ETYPES = {
  rootling: { hp: 12, spd: 55, dmg: 3, col: '#5a4a38', r: 10, eye: '#2e2e1a', ai: 'chase', update(t) { }, frames: 6 },
  imp: { hp: 20, spd: 85, dmg: 6, col: '#3a2a20', r: 13, eye: '#5a4a38', ai: 'zigzag', update(t) { }, frames: 6 },
  troll: { hp: 120, spd: 28, dmg: 18, col: '#2a4018', r: 26, eye: '#4a3a2a', ai: 'tank', update(t) { }, frames: 8 },
  shaman: { hp: 22, spd: 45, dmg: 4, col: '#4a2a30', r: 11, eye: '#7a5a4a', ai: 'tank', update(t) { }, frames: 4 },
  wraith: { hp: 8, spd: 110, dmg: 4, col: '#283040', r: 9, eye: '#3a2a20', ai: 'kamikaze', update(t) { }, frames: 4 }
};

function spawn(forceDistant) { return null; }
function spawnElite() { return null; }
function spawnBoss() { return null; }
function spawnAnomaly() { return null; }
