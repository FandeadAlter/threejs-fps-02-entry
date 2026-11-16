import { S, say, noise } from './state.js';
import { wallDistance, visible } from './map.js';
import { sound } from './audio.js';
export function damage(victim, amount, attacker, head = false) {
  if (!victim.alive || S.phase !== 'live') return;
  if (victim.armor > 0) { const absorb = Math.min(victim.armor, amount * .5); victim.armor -= absorb; amount -= absorb; }
  victim.hp = Math.max(0, victim.hp - amount); victim.damaged = S.time;
  if (victim.id === 0) { S.hurt = .45; sound('hit', .4); S.bomb.plant = 0; }
  if (S.bomb.defuser === victim.id) { S.bomb.defuse = 0; S.bomb.defuser = -1; }
  if (attacker?.id === 0) { S.hit = .16; sound(head ? 'head' : 'hit'); }
  if (victim.hp > 0) return;
  victim.alive = false; victim.vx = victim.vz = 0;
  say(`${attacker?.name || 'FRAG'} ${head ? '◇' : '›'} ${victim.name}`);
  if (attacker && attacker.team !== victim.team) {
    attacker.kills++;
    if (attacker.id === 0) { S.money = Math.min(9000, S.money + 300); S.kills++; S.roundKills++; }
  }
  if (S.bomb.carrier === victim.id && !S.bomb.planted) { S.bomb.carrier = -1; S.bomb.x = victim.x; S.bomb.z = victim.z; S.bomb.plant = 0; say('BOMB DROPPED — squad recovering'); }
}
function sphere(ox, oy, oz, dx, dy, dz, x, y, z, radius) {
  const ax = ox - x, ay = oy - y, az = oz - z;
  const b = ax * dx + ay * dy + az * dz, c = ax * ax + ay * ay + az * az - radius * radius, det = b * b - c;
  if (det < 0) return Infinity;
  const t = -b - Math.sqrt(det); return t > .01 ? t : Infinity;
}
export function shoot(a, ox, oy, oz, dx, dy, dz, amount) {
  let nearest = wallDistance(ox, oy, oz, dx, dy, dz, 80), victim = null, head = false;
  for (const b of S.actors) {
    if (!b.alive || b.team === a.team) continue;
    const h = b.crouch ? 1.03 : 1.58;
    const ht = sphere(ox, oy, oz, dx, dy, dz, b.x, h, b.z, .23);
    if (ht < nearest) { nearest = ht; victim = b; head = true; }
    // Upright capsule: analytic cylinder plus end-cap spheres.
    const low = .38, high = h - .35, ax = ox - b.x, az = oz - b.z;
    const aa = dx * dx + dz * dz, bb = ax * dx + az * dz, cc = ax * ax + az * az - .28 * .28;
    const det = bb * bb - aa * cc;
    let body = Infinity;
    if (det >= 0 && aa > 1e-8) { const t = (-bb - Math.sqrt(det)) / aa, y = oy + dy * t; if (t > .01 && y >= low && y <= high) body = t; }
    body = Math.min(body, sphere(ox, oy, oz, dx, dy, dz, b.x, low, b.z, .28), sphere(ox, oy, oz, dx, dy, dz, b.x, high, b.z, .28));
    if (body < nearest) { nearest = body; victim = b; head = false; }
  }
  if (victim) damage(victim, amount * (head ? 2 : 1), a, head);
  const tracer = S.tracers.find(t => t.life <= 0);
  if (tracer) { tracer.life = .09; tracer.ax = ox; tracer.ay = oy; tracer.az = oz; tracer.bx = ox + dx * nearest; tracer.by = oy + dy * nearest; tracer.bz = oz + dz * nearest; tracer.team = a.team; }
  noise(a.x, a.z, a.team); a.flash = .08;
}
export function explode(x, y, z, owner) {
  sound('blast'); noise(x, z, -1, 45);
  for (const a of S.actors) {
    const d = Math.hypot(a.x - x, a.z - z);
    if (a.alive && d <= 7 && visible(x, z, a.x, a.z, .6)) damage(a, d < 4 ? 70 : 40, owner);
  }
  const effect = S.effects.find(e => e.life <= 0);
  if (effect) { effect.x = x; effect.y = y; effect.z = z; effect.life = .5; }
}
