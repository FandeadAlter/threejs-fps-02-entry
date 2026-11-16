// All mutable simulation and presentation state lives here. Positions are world metres.
export const S = {
  phase: 'title', paused: false, buyOpen: false, shot: '', time: 0, round: 1,
  timer: 100, phaseTime: 12, score: [0, 0], money: 800, kills: 0,
  roundKills: 0, bestRound: 0, best: 0, seed: 1, actors: [], player: null,
  keys: Object.create(null), mouse: false, locked: false, yaw: 0, pitch: 0,
  bloom: 0, kick: 0, hit: 0, hurt: 0, flash: 0, banner: '', bannerTime: 0,
  feed: [], noises: [], grenades: [], effects: [], tracers: [],
  bomb: { planted: false, carrier: 0, x: 0, z: 14, site: '', fuse: 35, plant: 0, defuse: 0, defuser: -1, beep: 0 },
  weapon: 'rifle', primary: 'rifle', mag: 30, reserve: 90, reload: 0, cooldown: 0,
  magazines: {}, frags: 0, recoil: 0, step: 0, result: '', winner: -1,
  scene: null, camera: null, renderer: null, gun: null, map: null, muted: false,
};
export function random() { S.seed = (Math.imul(S.seed, 1664525) + 1013904223) >>> 0; return S.seed / 4294967296; }
export function actor(id, team, x, z, name) {
  return { id, team, x, z, y: 0, vx: 0, vz: 0, hp: 100, armor: 0, alive: true,
    name, yaw: team ? 0 : Math.PI, crouch: false, mesh: null, target: -1,
    reaction: 0, sight: 0, cooldown: .6, damaged: -10, state: 'patrol',
    route: [], routeIndex: 0, goalX: x, goalZ: z, rethink: 0, hold: 0, flash: 0, kills: 0 };
}
export function say(text) {
  S.feed.unshift({ text, until: S.time + 6 });
  if (S.feed.length > 5) S.feed.pop();
}
export function banner(text, seconds = 3) { S.banner = text; S.bannerTime = seconds; }
export function noise(x, z, team, radius = 25) {
  S.noises.push({ x, z, team, radius, until: S.time + .35 });
}
export function distance(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
