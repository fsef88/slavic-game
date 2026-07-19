// ============================================================
//  UI — HUD, экраны, карты, достижения, магазин, древо, уведомления
// ============================================================

function fmt(t) {
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function log(text, cls) {
  const el = document.createElement('div');
  el.className = 'logitem' + (cls ? ' ' + cls : '');
  el.textContent = text;
  const log = document.getElementById('log');
  log.appendChild(el);
  while (log.children.length > 3) log.firstChild.remove();
  setTimeout(() => el.remove(), 4100);
}

function openStats() {
  if (typeof paused !== 'undefined') paused = true;
  const s = document.getElementById('statsov');
  if (s) s.style.display = 'flex';
  const t = document.getElementById('statstable');
  if (!t) return;
  const best = (typeof stats !== 'undefined' && stats.length) ? Math.max(...stats.map(s => s.time || 0)) : 0;
  const bestK = (typeof stats !== 'undefined' && stats.length) ? Math.max(...stats.map(s => s.kills || 0)) : 0;
  const wins = (typeof stats !== 'undefined') ? stats.filter(s => s.won).length : 0;
  const total = (typeof stats !== 'undefined') ? stats.length : 0;
  const achCount = (typeof achData !== 'undefined' && achData.unlocked) ? Object.keys(achData.unlocked).length : 0;
  const achTotal = (typeof ACHIEVEMENTS !== 'undefined') ? ACHIEVEMENTS.length : 0;
  let html = '<tr><th>Параметр</th><th>Значение</th></tr>';
  html += `<tr><td>Лучшее время</td><td>${fmt(best)}</td></tr>`;
  html += `<tr><td>Лучшие убийства</td><td>${bestK}</td></tr>`;
  html += `<tr><td>Побед / Всего</td><td>${wins} / ${total}</td></tr>`;
  html += `<tr><td>Золото Заставы</td><td>${(typeof metaGold !== 'undefined') ? metaGold : 0} ◆</td></tr>`;
  html += `<tr><td>Достижения</td><td>${achCount} / ${achTotal}</td></tr>`;
  if (stats && stats.length) {
    html += `<tr><th colspan=2>Последние забеги</th></tr>`;
    stats.slice(-5).reverse().forEach(s => {
      html += `<tr><td>${fmt(s.time || 0)} · ${(s.won ? '🏆' : '☠')}</td><td>${s.kills || 0}☠ ${s.level || 0}ур ${s.gold || 0}◆</td></tr>`;
    });
  }
  t.innerHTML = html;
}

function openAch() {
  if (typeof paused !== 'undefined') paused = true;
  const el = document.getElementById('achov');
  if (el) el.style.display = 'flex';
}

function openTree() {
  if (typeof paused !== 'undefined') paused = true;
  const el = document.getElementById('treeov');
  if (el) el.style.display = 'flex';
}
