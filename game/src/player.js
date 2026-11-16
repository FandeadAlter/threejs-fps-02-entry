import { S, noise, banner, say } from './state.js';
import { move, sites } from './map.js';
import { sound } from './audio.js';
export function look(dx, dy) {
  if (!S.locked || S.paused || S.buyOpen) return;
  S.yaw -= dx * .002; S.pitch = Math.max(-1.4, Math.min(1.4, S.pitch - dy * .002));
}
export function plant(a, dt, held) {
  const b = S.bomb;
  if (b.planted || b.carrier !== a.id) return;
  const site = sites.find(s => Math.hypot(a.x - s.x, a.z - s.z) < s.r);
  if (!site || !held || Math.hypot(a.vx, a.vz) > .3) { b.plant = 0; return; }
  b.plant += dt;
  if (b.plant >= 3) {
    b.planted = true; b.carrier = -1; b.x = a.x; b.z = a.z; b.site = site.name; b.fuse = 35; b.plant = 0; b.defuse = 0;
    sound('beep'); banner('BOMB PLANTED / SITE ' + site.name); say('Bomb planted ' + site.name + ' — hold the site'); noise(a.x, a.z, 0, 100);
    for (const bot of S.actors) bot.rethink = 0;
  }
}
export function updatePlayer(dt) {
  const p = S.player;
  if (!p.alive) return;
  const k = S.keys;
  p.crouch = !!(k.ControlLeft || k.KeyC);
  const slow = k.ShiftLeft || k.ShiftRight, speed = p.crouch ? 1.65 : slow ? 2.6 : 4.5;
  let x = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0), z = (k.KeyS ? 1 : 0) - (k.KeyW ? 1 : 0);
  const length = Math.hypot(x, z); if (length > 0) { x /= length; z /= length; }
  const active = S.phase === 'live' && !S.buyOpen;
  const tx = active ? (x * Math.cos(S.yaw) + z * Math.sin(S.yaw)) * speed : 0;
  const tz = active ? (-x * Math.sin(S.yaw) + z * Math.cos(S.yaw)) * speed : 0;
  const f = 1 - Math.exp(-(length ? 13 : 18) * dt);
  p.vx += (tx - p.vx) * f; p.vz += (tz - p.vz) * f;
  move(p, p.vx * dt, p.vz * dt); p.yaw = S.yaw;
  const moving = Math.hypot(p.vx, p.vz);
  if (moving > 3 && active) { S.step += dt; if (S.step > .38) { S.step = 0; sound('step'); noise(p.x, p.z, 0, 12); } }
  if (S.phase === 'live') plant(p, dt, !!k.KeyE);
}
