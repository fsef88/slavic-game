// ============================================================
//  INPUT — клавиатура, тач, джойстик
// ============================================================
const keys = {};
const touchMove = { x: 0, y: 0, active: false };

function setKey(e, v) {
  if (e && e.key) keys[e.key.toLowerCase()] = v;
  if (e && e.code) keys[e.code] = v;
}

addEventListener('keydown', e => {
  setKey(e, 1);
  if (e.key === 'Escape') {
    if (typeof togglePause === 'function') togglePause();
  }
  if (e.key === 'q' || e.key === 'Q' || e.key === 'ц' || e.key === 'Ц') {
    if (typeof useSpecial === 'function') useSpecial();
  }
});

addEventListener('keyup', e => setKey(e, 0));
