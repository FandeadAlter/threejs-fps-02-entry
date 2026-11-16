import { S } from './state.js';
import { initRender, render, updateEffects } from './render.js';
import { updatePlayer, look } from './player.js';
import { updateWeapons, reload, throwGrenade, equip } from './weapons.js';
import { updateBots } from './bots.js';
import { newMatch, updateRounds } from './rounds.js';
import { initHud, updateHud } from './hud.js';
import { initScreens, updateScreens, toggleBuy, lock } from './screens.js';
import { setupShot } from './shots.js';
try { S.best = Number(localStorage.getItem('duskline.best')) || 0; } catch { /* private storage */ }
initRender(); initHud(); initScreens(); newMatch(); S.phase = 'title'; S.buyOpen = false;
const shot = setupShot();
addEventListener('keydown', e => {
  if (['Space','ControlLeft','Tab'].includes(e.code)) e.preventDefault();
  S.keys[e.code] = true; if (e.repeat || S.shot) return;
  if (e.code === 'KeyM') S.muted = !S.muted;
  if (e.code === 'KeyB') toggleBuy();
  if (e.code === 'KeyR') reload();
  if (e.code === 'KeyG') throwGrenade();
  if ((e.code === 'Digit1' || e.code === 'Digit2') && S.player.alive && S.phase === 'live') equip(e.code === 'Digit1' ? S.primary : 'pistol');
  if (e.code === 'Escape' && S.locked) { S.paused = true; S.mouse = false; }
});
addEventListener('keyup', e => { S.keys[e.code] = false; });
addEventListener('mousemove', e => look(e.movementX, e.movementY));
addEventListener('mousedown', e => { if (e.button !== 0 || S.shot) return; if (S.locked && !S.paused) S.mouse = true; else if (e.target.id === 'view' && S.phase === 'live') { S.paused = false; lock(); } });
addEventListener('mouseup', () => { S.mouse = false; });
addEventListener('blur', () => { for (const k in S.keys) S.keys[k] = false; S.mouse = false; if (!S.shot && S.phase === 'live') S.paused = true; });
const STEP = 1 / 60;
let last = performance.now(), accumulator = 0, frames = 0;
function simulate(dt) {
  S.time += dt; updateEffects(dt);
  for (let i = S.noises.length - 1; i >= 0; i--) if (S.noises[i].until < S.time) S.noises.splice(i, 1);
  if (S.phase === 'live' || S.phase === 'buy') updatePlayer(dt);
  if (S.phase === 'live') { updateWeapons(dt); updateBots(dt); }
  updateRounds(dt);
}
function frame(now) {
  accumulator += Math.min(.2, (now - last) / 1000); last = now;
  while (accumulator >= STEP) { if (!S.paused && !shot) simulate(STEP); accumulator -= STEP; }
  render(); updateHud(1 / 60); updateScreens();
  if (shot && ++frames >= 3) window.__shotReady = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
