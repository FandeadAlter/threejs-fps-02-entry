import { S } from './state.js';
import { guns, spread } from './weapons.js';
import { sites, boxes } from './map.js';
const ids = ['health','armor','health-bar','money','weapon','mag','reserve','tools','score-a','score-b','round','timer','alive','bomb-status','feed','banner','hint','progress-wrap','progress-label','progress','crosshair','hitmarker','hurt','buy-funds','buy-copy','mute'];
const el = {};
let ctx, lastFeed = '', tick = 0;
export function initHud() { for (const id of ids) el[id] = document.getElementById(id); ctx = document.getElementById('minimap').getContext('2d'); }
function mapHud() {
  const g = ctx; g.clearRect(0, 0, 340, 266); g.fillStyle = '#0d222d'; g.fillRect(0, 0, 340, 266);
  const scale = 6.7, px = x => 170 + x * scale, pz = z => 133 + z * scale;
  g.fillStyle = '#4e656b';
  for (const b of boxes) if (b.y0 < 2) g.fillRect(px(b.x0), pz(b.z0), (b.x1-b.x0)*scale, (b.z1-b.z0)*scale);
  for (const s of sites) { g.strokeStyle = '#d1a36b'; g.beginPath(); g.arc(px(s.x), pz(s.z), s.r * scale, 0, 7); g.stroke(); g.fillStyle = '#e5bd83'; g.font = 'bold 17px monospace'; g.fillText(s.name, px(s.x)-5,pz(s.z)+5); }
  for (const a of S.actors) {
    if (!a.alive || (a.team && a.target < 0 && S.time - a.damaged > 1)) continue;
    g.fillStyle = a.team ? '#eeaa75' : a.id ? '#79c9c5' : '#ffffff'; g.beginPath(); g.arc(px(a.x), pz(a.z), a.id ? 4 : 5, 0, 7); g.fill();
    if (!a.id) { g.strokeStyle = '#ffffff'; g.beginPath(); g.moveTo(px(a.x), pz(a.z)); g.lineTo(px(a.x)-Math.sin(S.yaw)*13,pz(a.z)-Math.cos(S.yaw)*13); g.stroke(); }
  }
  if (S.bomb.planted) { g.fillStyle = '#ffb66d'; g.fillRect(px(S.bomb.x)-4,pz(S.bomb.z)-4,8,8); }
}
export function updateHud(dt = 0) {
  const p = S.player; if (!p) return;
  el.health.textContent = Math.ceil(p.hp); el.armor.textContent = '◇ ' + Math.ceil(p.armor) + ' KEVLAR'; el['health-bar'].style.width = p.hp + '%';
  el.money.textContent = '$' + S.money.toLocaleString('en-US'); el['buy-funds'].textContent = '$' + S.money.toLocaleString('en-US');
  el.weapon.textContent = guns[S.weapon].name + (S.reload > 0 ? ' / RELOADING' : '');
  el.mag.textContent = S.mag; el.reserve.textContent = '/ ' + (S.reserve === Infinity ? '∞' : S.reserve);
  el.tools.textContent = `G / FRAG ×${S.frags}    ${S.weapon === 'pistol' ? '1 / PRIMARY' : '2 / P9 SIDEARM'}`;
  el['score-a'].textContent = S.score[0]; el['score-b'].textContent = S.score[1]; el.round.textContent = (S.phase === 'buy' ? 'BUY / ' : 'ROUND ') + String(S.round).padStart(2, '0');
  const b = S.bomb, sec = Math.max(0, Math.ceil(b.planted ? b.fuse : S.phase === 'buy' ? S.phaseTime : S.timer));
  el.timer.textContent = String(Math.floor(sec / 60)).padStart(2,'0') + ':' + String(sec % 60).padStart(2,'0'); el.timer.style.color = b.planted ? '#efb56e' : '';
  let friends = 0, foes = 0; for (const a of S.actors) if (a.alive) { if (a.team) foes++; else friends++; }
  el.alive.textContent = `${friends} ATTACK ALIVE / ${foes} DEFEND ALIVE`;
  el['bomb-status'].textContent = b.planted ? '◈ PAYLOAD LIVE / ' + b.site : b.carrier === 0 ? '◇ PAYLOAD CARRIED' : b.carrier < 0 ? '◇ PAYLOAD DROPPED' : '◇ ' + S.actors[b.carrier].name + ' CARRYING';
  const feed = S.feed.filter(f => f.until > S.time).map(f => f.text).join('|');
  if (feed !== lastFeed) { el.feed.replaceChildren(); for (const text of feed.split('|')) if (text) { const d = document.createElement('div'); d.textContent = text; el.feed.append(d); } lastFeed = feed; }
  el.banner.textContent = S.bannerTime > 0 ? S.banner : '';
  const site = sites.find(s => Math.hypot(p.x-s.x,p.z-s.z)<s.r);
  el.hint.textContent = !p.alive ? 'SQUAD STILL ACTIVE / WATCH THE YARD' : b.planted ? 'HOLD THE SITE / PREVENT THE DEFUSE' : site && b.carrier === 0 ? 'HOLD [E] FOR 3 SECONDS TO PLANT / STAND STILL' : S.phase === 'buy' ? 'B / FIELD REQUISITIONS · DEPLOY IN ' + Math.ceil(S.phaseTime) : '';
  const progress = b.defuse > 0 ? b.defuse / 5 : b.plant / 3;
  el['progress-wrap'].hidden = progress <= 0; el['progress-label'].textContent = b.defuse > 0 ? 'ENEMY DEFUSING' : 'PLANTING PAYLOAD'; el.progress.firstElementChild.style.width = progress * 100 + '%';
  const width = 22 + spread() * 450; el.crosshair.style.width = el.crosshair.style.height = width + 'px'; el.crosshair.style.opacity = p.alive && !S.buyOpen && S.phase === 'live' ? 1 : 0;
  el.hitmarker.style.opacity = S.hit > 0 ? 1 : 0; el.hurt.style.opacity = S.hurt;
  el['buy-copy'].textContent = `KILL +$300 / WIN +$800 / LOSS +$400 · B TO CLOSE · ${Math.max(0, Math.ceil(S.phaseTime))}s TO DEPLOY`;
  el.mute.textContent = S.muted ? 'M / AUDIO OFF' : 'M / AUDIO ON';
  tick += dt; if (tick > .08 || S.shot) { tick = 0; mapHud(); }
}
