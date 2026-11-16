import { S, random, distance, say } from './state.js';
import { move, visible, pathTo, sites, clearAt } from './map.js';
import { shoot } from './combat.js';
import { plant } from './player.js';
import { sound } from './audio.js';
const holds = [[-17, -6], [15, -6], [-8, -9], [9, -10]];
function goal(a, x, z, state) { a.goalX = x; a.goalZ = z; a.state = state; pathTo(a, x, z); }
function chooseGoal(a) {
  const b = S.bomb;
  if (b.planted) {
    if (a.team === 1) goal(a, b.x, b.z, 'defuse');
    else {
      const angle = a.id * 2.1, x = b.x + Math.cos(angle) * 2.8, z = b.z + Math.sin(angle) * 2.8;
      goal(a, clearAt(x, z) ? x : b.x, clearAt(x, z) ? z : b.z, 'guard');
    }
  } else if (b.carrier === a.id) { const site = sites[a.id % 2]; goal(a, site.x, site.z, 'plant'); }
  else if (!a.team && b.carrier < 0) goal(a, b.x, b.z, 'recover');
  else if (!a.team) {
    const p = S.player;
    if (p.alive && S.time > 8 && distance(a, p) > 8) {
      const x = p.x + (a.id - 2) * 2, z = p.z + 2;
      goal(a, clearAt(x, z) ? x : p.x, clearAt(x, z) ? z : p.z, 'follow');
    } else { const site = sites[a.id % 2]; goal(a, site.x + (a.id === 3 ? 2 : 0), site.z + 5, 'advance'); }
  } else { const h = holds[a.id - 4]; goal(a, h[0], h[1], 'hold'); }
}
export function updateBots(dt) {
  const bomb = S.bomb;
  if (bomb.carrier < 0 && !bomb.planted) {
    let carrier = null, nearest = Infinity;
    for (const a of S.actors) if (a.alive && a.team === 0 && a.id !== 0) { const d = Math.hypot(a.x - bomb.x, a.z - bomb.z); if (d < nearest) { nearest = d; carrier = a; } }
    if (carrier && nearest < .9) { bomb.carrier = carrier.id; bomb.plant = 0; carrier.rethink = 0; say(carrier.name + ': recovered the bomb'); }
  }
  let defusing = false;
  for (const a of S.actors) {
    if (a.id === 0 || !a.alive) continue;
    a.cooldown -= dt; a.rethink -= dt; a.flash = Math.max(0, a.flash - dt);
    let target = null, nearest = 34;
    const old = S.actors[a.target];
    for (const b of S.actors) {
      if (!b.alive || a.team === b.team) continue;
      const d = distance(a, b), angle = Math.atan2(a.x - b.x, a.z - b.z);
      let delta = angle - a.yaw; delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      if (d < nearest && (Math.abs(delta) < 1.25 || d < 4 || b === old || S.time - a.damaged < 1) && visible(a.x, a.z, b.x, b.z, a.crouch ? 1 : 1.45)) { nearest = d; target = b; }
    }
    if (target) {
      if (a.target !== target.id) { a.target = target.id; a.reaction = .25 + random() * .2; a.sight = 0; if (!a.team) say('Enemy at ' + (target.x < 0 ? 'A' : 'B')); }
      a.reaction -= dt; a.sight += dt; a.state = 'engage';
      a.yaw = Math.atan2(a.x - target.x, a.z - target.z);
      a.vx = a.vz = 0;
      if (a.reaction <= 0 && a.cooldown <= 0) {
        const error = (.11 / (1 + a.sight * 2) + .012) * (a.team ? 1.25 : 1);
        const dx = target.x - a.x + (random() - .5) * error * nearest;
        const dz = target.z - a.z + (random() - .5) * error * nearest;
        const head = random() < .12, ty = head ? (target.crouch ? 1.03 : 1.58) : .95;
        const dy = ty - 1.45 + (random() - .5) * error * nearest, len = Math.hypot(dx, dy, dz);
        shoot(a, a.x, 1.45, a.z, dx / len, dy / len, dz / len, a.team ? 18 : 23);
        sound('rifle', Math.max(.04, .35 - distance(a, S.player) / 100)); a.cooldown = .24 + random() * .22;
      }
    } else {
      if (a.target >= 0) { const last = S.actors[a.target]; a.target = -1; a.rethink = 1.2; goal(a, last.x, last.z, 'search'); }
      if (a.rethink <= 0) { chooseGoal(a); a.rethink = 2 + random(); }
      if (!bomb.planted) for (const n of S.noises) if (n.team !== a.team && Math.hypot(a.x - n.x, a.z - n.z) < n.radius && a.state !== 'plant' && a.state !== 'recover') {
        a.yaw = Math.atan2(a.x - n.x, a.z - n.z);
        if (a.team && a.state !== 'search') { goal(a, n.x, n.z, 'rotate'); a.rethink = 1.5; }
        break;
      }
      const waypoint = a.route[a.routeIndex];
      if (waypoint) {
        const dx = waypoint.x - a.x, dz = waypoint.z - a.z, d = Math.hypot(dx, dz);
        if (d < .22) { a.routeIndex++; a.vx = a.vz = 0; }
        else {
          const speed = a.state === 'defuse' ? 3.3 : 2.65;
          a.vx = dx / d * speed; a.vz = dz / d * speed; a.yaw = Math.atan2(-dx, -dz); move(a, a.vx * dt, a.vz * dt);
        }
      } else { a.vx = a.vz = 0; if (a.state === 'hold' || a.state === 'guard') a.yaw += Math.sin(S.time * .5 + a.id) * dt * .3; }
      if (bomb.carrier === a.id) plant(a, dt, !waypoint || Math.hypot(a.x - a.goalX, a.z - a.goalZ) < .5);
    }
    if (bomb.planted && a.team && Math.hypot(a.x - bomb.x, a.z - bomb.z) < 1.15 && S.time - a.damaged > .5 && !defusing) {
      if (bomb.defuser !== a.id) { bomb.defuse = 0; bomb.defuser = a.id; say('Defusing!'); }
      a.state = 'defuse'; a.vx = a.vz = 0; bomb.defuse += dt; defusing = true;
    }
  }
  if (!defusing) { bomb.defuse = 0; bomb.defuser = -1; }
}
