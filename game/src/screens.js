import { S } from './state.js';
import { newMatch } from './rounds.js';
import { buy, guns } from './weapons.js';
import { unlockAudio } from './audio.js';
const el = {};
export function lock() {
  unlockAudio();
  const result = document.getElementById('view').requestPointerLock();
  if (result?.catch) result.catch(() => { S.paused = true; });
}
export function initScreens() {
  for (const id of ['screen','intro','result','result-kicker','result-title','result-score','result-copy','again','buy','pause']) el[id] = document.getElementById(id);
  document.getElementById('play').onclick = () => { unlockAudio(); newMatch(); };
  el.again.onclick = () => { unlockAudio(); newMatch(); };
  document.getElementById('resume').onclick = () => { S.paused = false; lock(); };
  document.getElementById('mute').onclick = () => { S.muted = !S.muted; };
  for (const b of document.querySelectorAll('[data-buy]')) b.onclick = () => buy(b.dataset.buy);
  document.addEventListener('pointerlockchange', () => {
    S.locked = !!document.pointerLockElement; S.mouse = false;
    if (!S.locked && ['buy','live','end'].includes(S.phase) && !S.buyOpen) S.paused = true;
  });
}
export function toggleBuy() {
  if (S.phase !== 'buy') return;
  S.buyOpen = !S.buyOpen; S.mouse = false;
  if (S.buyOpen) { if (document.pointerLockElement) document.exitPointerLock(); }
  else lock();
}
export function updateScreens() {
  const title = S.phase === 'title', result = S.phase === 'end' || S.phase === 'match';
  el.screen.hidden = !title && !result; el.intro.hidden = !title; el.result.hidden = !result;
  el.buy.hidden = !title && !(S.phase === 'buy' && S.buyOpen); el.pause.hidden = !S.paused || S.shot;
  document.getElementById('hud').style.opacity = title ? '.4' : '1';
  if (result) {
    el['result-kicker'].textContent = S.phase === 'match' ? 'MATCH COMPLETE / FIRST TO FIVE' : `ROUND ${S.round} COMPLETE`;
    el['result-title'].textContent = S.winner === 0 ? 'ATTACKERS WIN' : 'DEFENDERS WIN';
    el['result-score'].textContent = S.score[0] + ' : ' + S.score[1];
    el['result-copy'].textContent = S.result + (S.phase === 'match' ? ` Best round: ${S.bestRound} eliminations. Best match: ${S.best} rounds won.` : ` +$${S.winner ? 400 : 800} · Next round in ${Math.ceil(S.phaseTime)}s.`);
    el.again.hidden = S.phase !== 'match';
  }
  for (const button of document.querySelectorAll('[data-buy]')) {
    const id = button.dataset.buy, cost = id === 'frag' ? 200 : id === 'armor' ? 500 : guns[id].cost;
    button.disabled = title || S.phase !== 'buy' || S.money < cost || (id === 'frag' && S.frags >= 2) || (id === 'armor' && S.player?.armor >= 100);
  }
}
