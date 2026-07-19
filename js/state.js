// ============================================================
//  STATE — состояние игры
// ============================================================
let P = { x: 1000, y: 1000, r: 14, hp: 100, maxhp: 100, spd: 200, fx: 1, fy: 0, pickup: 70, dmgMul: 1, rateMul: 1, areaMul: 1, animT: 0, atk: 0, moving: false, specialRate: 1 };
let cam = { x: 0, y: 0 };
let enemies = [], slashes = [], bolts = [], zones = [], hazards = [], anomalies = [], relics = [];
let shake = 0, hitstop = 0, timeScale = 1;
let time = 0, kills = 0, gold = 0, level = 1, xp = 0, xpNext = 6;
let paused = false, over = false, won = false, runEnded = false, runSeed = 0, prngState = 0;
let spawnTimer = 0;

const weapons = [{ id: 'sword', cd: 0.8, t: 0, evo: false }];
let hasOrbit = false, orbAngle = 0, orbCount = 0;
let hasBolt = false, boltCd = 1.6, boltT = 0;
let swordLvl = 1, boltLvl = 1;
let poison = { on: false, lvl: 1, t: 0 }, thorn = { on: false, lvl: 1 }, frost = { on: false, lvl: 1 };
let bossE = null, bossSpawned = false, eliteT = 45;
