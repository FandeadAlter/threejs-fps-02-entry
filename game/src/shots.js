import { S, say, banner } from './state.js';
import { newMatch, endRound } from './rounds.js';
// Frozen, seeded setups use exactly the same map, actors, gun and HUD as play.
export function setupShot() {
  const query = new URLSearchParams(location.search), name = query.get('shot');
  if (!['title','play','plant','win'].includes(name)) return false;
  S.shot = name; S.seed = Number(query.get('seed')) || 1; newMatch(); S.buyOpen = false; S.time = 24; S.bannerTime = 0;
  const p = S.player;
  if (name === 'title') {
    S.phase = 'title'; S.camera.position.set(3, 8, 20); S.camera.lookAt(-2, 1, -5);
  } else {
    S.phase = 'live'; S.phaseTime = 0; S.score[0] = 2; S.score[1] = 1; S.round = 4; S.timer = 74; S.money = 2100; S.frags = 1; p.armor = 64;
    if (name === 'play') {
      p.x = -10; p.z = 7; S.yaw = -.19; S.pitch = -.015; p.hp = 82; S.mag = 23;
      const positions = [[-14, 3], [-18, -1], [0, 10], [-8, -5], [-18, -7], [9, -8], [15, -5]];
      for (let i = 1; i < 8; i++) { S.actors[i].x = positions[i-1][0]; S.actors[i].z = positions[i-1][1]; S.actors[i].yaw = Math.PI; }
      S.actors[4].target = 0; S.actors[4].flash = .08; S.flash = .07; S.kick = .012;
      Object.assign(S.tracers[0], { life: .09, ax: -8, ay: 1.3, az: -5, bx: -10, by: 1.3, bz: 7 });
      say('ROOK: Enemy at A'); banner('A-LONG / CONTACT', 3);
    } else if (name === 'plant') {
      p.x = -18; p.z = -6; S.yaw = -1.7; S.pitch = -.14; p.hp = 67; S.mag = 17;
      Object.assign(S.bomb, { planted: true, carrier: -1, x: -16, z: -8, site: 'A', fuse: 22, defuse: 1.3, defuser: 4 });
      S.actors[4].x = -15.7; S.actors[4].z = -8.7; S.actors[4].yaw = Math.PI; S.actors[4].state = 'defuse';
      S.actors[1].x = -13; S.actors[1].z = -5; say('VALE: Defusing!'); banner('BOMB PLANTED / SITE A', 5);
    } else {
      p.x = -10; p.z = 6; S.yaw = -.3; S.score[0] = 4; S.score[1] = 2; S.round = 7; S.bestRound = 3; S.best = 5;
      endRound(0, 'Payload detonated. The yard is ours.');
    }
  }
  return true;
}
