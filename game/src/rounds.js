import { S, actor, banner, say } from './state.js';
import { equip } from './weapons.js';
import { sound } from './audio.js';
const names = ['YOU', 'ROOK', 'VALE', 'ASH', 'WARDEN', 'FLINT', 'CINDER', 'SLATE'];
export function newMatch() {
  S.score[0] = S.score[1] = 0; S.money = 800; S.round = 1; S.kills = 0; S.bestRound = 0; S.primary = 'rifle'; S.frags = 0; S.feed.length = 0;
  startRound();
}
export function startRound() {
  S.actors.length = 0;
  for (let i = 0; i < 8; i++) {
    const team = i < 4 ? 0 : 1, x = team ? [-17, 15, -8, 9][i - 4] : (i - 1.5) * 2;
    S.actors.push(actor(i, team, x, team ? (i === 5 ? -10 : -12) : 14, names[i]));
  }
  S.player = S.actors[0]; S.yaw = 0; S.pitch = 0; S.kick = 0; S.bloom = 0;
  S.magazines = {}; equip(S.primary, true); S.roundKills = 0;
  Object.assign(S.bomb, { planted: false, carrier: 0, x: S.player.x, z: 14, site: '', fuse: 35, plant: 0, defuse: 0, defuser: -1, beep: 0 });
  for (const n of S.grenades) if (n.mesh) n.mesh.visible = false;
  S.grenades.length = 0; S.noises.length = 0; S.timer = 100; S.phase = 'buy'; S.phaseTime = 12; S.buyOpen = true; S.mouse = false;
  banner('ROUND ' + S.round + ' / PREPARE', 3); say('Choose your loadout. Attack either site.');
  S.paused = false;
  if (document.pointerLockElement) document.exitPointerLock();
}
export function endRound(team, reason) {
  if (S.phase !== 'live') return;
  S.score[team]++; S.winner = team; S.result = reason; S.bestRound = Math.max(S.bestRound, S.roundKills);
  S.money = Math.min(9000, S.money + (team === 0 ? 800 : 400)); S.phaseTime = 5;
  S.phase = S.score[team] >= 5 ? 'match' : 'end'; S.buyOpen = false; S.mouse = false;
  banner('ROUND ' + S.round + ' — ' + (team ? 'DEFENDERS WIN' : 'ATTACKERS WIN'), 5); sound(team ? 'lose' : 'win');
  if (S.phase === 'match') {
    S.best = Math.max(S.best, S.score[0]);
    try { localStorage.setItem('duskline.best', String(S.best)); } catch { /* storage can be disabled */ }
    if (document.pointerLockElement) document.exitPointerLock();
  }
}
export function updateRounds(dt) {
  if (S.phase === 'buy') {
    S.phaseTime -= dt;
    if (S.phaseTime <= 0) { S.phase = 'live'; S.buyOpen = false; S.paused = !S.locked; banner('PROTOCOL LIVE / TAKE A SITE', 2); }
    return;
  }
  if (S.phase === 'end') { S.phaseTime -= dt; if (S.phaseTime <= 0) { S.round++; startRound(); } return; }
  if (S.phase !== 'live') return;
  const b = S.bomb; S.timer = Math.max(0, S.timer - dt);
  let allies = 0, enemies = 0;
  for (const a of S.actors) if (a.alive) { if (a.team) enemies++; else allies++; }
  if (b.planted) {
    b.fuse -= dt; b.beep -= dt;
    if (b.beep <= 0) { sound('beep'); b.beep = b.fuse < 8 ? .22 : .8; }
    if (b.defuse >= 5) { endRound(1, 'The signal was neutralized. Bomb defused.'); return; }
    if (b.fuse <= 0) { sound('blast'); endRound(0, 'Payload detonated. The yard is ours.'); return; }
  }
  if (!enemies) endRound(0, 'All defenders eliminated.');
  else if (!allies && !b.planted) endRound(1, 'Attack squad eliminated.');
  else if (S.timer <= 0 && !b.planted) endRound(1, 'Time expired. No payload planted.');
}
