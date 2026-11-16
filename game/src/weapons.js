import { S, random, banner } from './state.js';
import { shoot, explode } from './combat.js';
import { clearAt } from './map.js';
import { sound } from './audio.js';
export const guns = {
  rifle: { name: 'VK-47', damage: 34, size: 30, reserve: 90, interval: .115, reload: 2.2, spread: .003, move: .024, bloom: .004, kick: .014, cost: 0 },
  smg: { name: 'HORNET-9', damage: 22, size: 32, reserve: 128, interval: .075, reload: 1.8, spread: .009, move: .026, bloom: .003, kick: .009, cost: 600 },
  sniper: { name: 'LONGSHOT-12', damage: 95, size: 5, reserve: 15, interval: 1.2, reload: 3, spread: .0004, move: .1, bloom: .02, kick: .055, cost: 1500 },
  pistol: { name: 'P9 / SIDEARM', damage: 20, size: 12, reserve: Infinity, interval: .23, reload: 1.4, spread: .006, move: .018, bloom: .007, kick: .018, cost: 0 },
};
export function equip(id, fresh = false) {
  if (!fresh) S.magazines[S.weapon] = { mag: S.mag, reserve: S.reserve };
  const g = guns[id], saved = fresh ? null : S.magazines[id]; S.weapon = id;
  S.mag = saved ? saved.mag : g.size; S.reserve = saved ? saved.reserve : g.reserve; S.reload = 0; S.cooldown = .2; S.bloom = 0;
}
export function buy(id) {
  if (S.phase !== 'buy' || !S.player.alive) return;
  const cost = id === 'frag' ? 200 : id === 'armor' ? 500 : guns[id]?.cost;
  if (cost === undefined || S.money < cost) { banner('INSUFFICIENT FUNDS', 1.5); return; }
  if (id === 'frag' && S.frags >= 2) return;
  if (id === 'armor' && S.player.armor >= 100) return;
  S.money -= cost;
  if (id === 'frag') S.frags++; else if (id === 'armor') S.player.armor = 100;
  else { S.primary = id; equip(id, true); }
  sound('reload');
}
export function reload() {
  const g = guns[S.weapon];
  if (S.phase === 'live' && S.player.alive && S.reload <= 0 && S.mag < g.size && S.reserve > 0) { S.reload = g.reload; sound('reload'); }
}
export function spread() {
  const p = S.player, g = guns[S.weapon];
  return (g.spread + Math.min(1, Math.hypot(p.vx, p.vz) / 4.5) * g.move + S.bloom) * (p.crouch ? .45 : 1);
}
export function throwGrenade() {
  if (S.phase !== 'live' || !S.player.alive || S.frags <= 0 || S.buyOpen || S.bomb.plant > 0) return;
  S.frags--;
  const p = S.player, cp = Math.cos(S.pitch);
  S.grenades.push({ x: p.x, y: 1.4, z: p.z, vx: -Math.sin(S.yaw) * cp * 10, vy: 3 + Math.sin(S.pitch) * 6, vz: -Math.cos(S.yaw) * cp * 10, life: 2.1, owner: p, mesh: null, beep: .5 });
  sound('reload');
}
export function updateWeapons(dt) {
  S.cooldown = Math.max(0, S.cooldown - dt); S.kick *= Math.exp(-dt * 13); S.bloom *= Math.exp(-dt * 7);
  if (S.reload > 0) {
    S.reload -= dt;
    if (S.reload <= 0) { const add = Math.min(guns[S.weapon].size - S.mag, S.reserve); S.mag += add; S.reserve -= add; sound('reload'); }
  }
  const p = S.player, g = guns[S.weapon];
  if (S.mouse && S.locked && p.alive && S.phase === 'live' && !S.buyOpen && S.reload <= 0 && S.cooldown <= 0 && S.bomb.plant <= 0) {
    if (S.mag <= 0) { S.cooldown = .25; banner(S.reserve > 0 ? 'R / RELOAD' : '2 / DRAW P9 SIDEARM', 1); }
    else {
      const s = spread(), yaw = S.yaw + (random() - .5) * s * 2, pitch = S.pitch + S.kick + (random() - .5) * s * 2, cp = Math.cos(pitch);
      shoot(p, p.x, p.crouch ? 1.05 : 1.65, p.z, -Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp, g.damage);
      S.mag--; S.cooldown = g.interval; S.bloom = Math.min(.065, S.bloom + g.bloom); S.kick += g.kick; S.flash = .07; sound(S.weapon);
    }
  }
  for (let i = S.grenades.length - 1; i >= 0; i--) {
    const n = S.grenades[i]; n.life -= dt; n.beep -= dt; n.vy -= 9.8 * dt;
    if (clearAt(n.x + n.vx * dt, n.z, .12)) n.x += n.vx * dt; else n.vx *= -.5;
    if (clearAt(n.x, n.z + n.vz * dt, .12)) n.z += n.vz * dt; else n.vz *= -.5;
    n.y += n.vy * dt;
    if (n.y < .15) { n.y = .15; n.vy = Math.abs(n.vy) * .38; n.vx *= .93; n.vz *= .93; }
    if (n.beep <= 0) { sound('beep', .25); n.beep = .5; }
    if (n.life <= 0) { explode(n.x, n.y, n.z, n.owner); if (n.mesh) n.mesh.visible = false; S.grenades.splice(i, 1); }
  }
}
