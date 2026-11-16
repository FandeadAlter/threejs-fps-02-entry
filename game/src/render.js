import * as T from 'three';
import { S } from './state.js';
import { buildMap, block } from './map.js';
let actorMeshes = [], grenadeMeshes = [], bombMesh, muzzle, gunBody, viewLight;
function mesh(geometry, color, parent, x = 0, y = 0, z = 0, metalness = 0) {
  const m = new T.Mesh(geometry, new T.MeshStandardMaterial({ color, roughness: .55, metalness }));
  m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
}
function box(w, h, d, color, parent, x, y, z, metalness = 0) { return mesh(new T.BoxGeometry(w, h, d), color, parent, x, y, z, metalness); }
function makeSoldier(team) {
  const root = new T.Group(), cloth = team ? '#997459' : '#367d83', armor = team ? '#453e37' : '#233b47';
  mesh(new T.CapsuleGeometry(.25, .43, 4, 8), cloth, root, 0, .98, 0);
  box(.48, .47, .29, armor, root, 0, 1.06, -.13);
  box(.14, .16, .06, team ? '#e2a163' : '#9ed8d2', root, -.13, 1.18, -.3);
  mesh(new T.SphereGeometry(.205, 12, 8), '#b89d80', root, 0, 1.57, 0);
  mesh(new T.SphereGeometry(.23, 12, 8, 0, Math.PI * 2, 0, Math.PI * .58), armor, root, 0, 1.63, 0);
  box(.32, .1, .09, '#111e28', root, 0, 1.6, -.19);
  for (const sign of [-1, 1]) {
    const leg = box(.18, .55, .21, cloth, root, sign * .14, .38, 0); root.userData[sign < 0 ? 'left' : 'right'] = leg;
    box(.2, .13, .35, '#202b31', root, sign * .14, .1, -.05);
    const arm = box(.16, .44, .18, cloth, root, sign * .32, 1.12, -.16); arm.rotation.x = -.8;
  }
  box(.12, .14, .7, '#182630', root, .15, 1.22, -.49);
  const flash = mesh(new T.OctahedronGeometry(.17), '#ffb861', root, .15, 1.22, -.95);
  flash.material = new T.MeshBasicMaterial({ color: '#ffd29a' }); root.userData.flash = flash;
  const badge = new T.Mesh(new T.RingGeometry(.31, .36, 24), new T.MeshBasicMaterial({ color: team ? '#ebaa71' : '#6cdbd0', transparent: true, opacity: .55, side: T.DoubleSide }));
  badge.rotation.x = -Math.PI / 2; badge.position.y = .025; root.add(badge);
  S.scene.add(root); return root;
}
function makeGun() {
  const gun = new T.Group(), metal = '#34434b', edge = '#869293';
  gunBody = box(.13, .15, .49, metal, gun, 0, 0, -.32, .7);
  box(.14, .08, .3, '#182b35', gun, 0, .1, -.32, .4);
  box(.055, .07, .07, edge, gun, 0, .16, -.55, .6);
  box(.1, .09, .38, '#1c3039', gun, 0, -.01, -.72, .5);
  box(.055, .055, .34, '#758585', gun, 0, .01, -1, .8);
  box(.09, .32, .14, '#182a33', gun, 0, -.19, -.3, .4).rotation.x = -.18;
  box(.08, .24, .1, '#615647', gun, 0, -.16, -.04).rotation.x = -.3;
  box(.12, .14, .3, '#645848', gun, 0, -.01, .12);
  box(.13, .15, .25, '#2d5560', gun, -.11, -.15, -.61).rotation.z = -.45;
  box(.14, .16, .25, '#2d5560', gun, .1, -.21, -.04).rotation.z = .25;
  box(.04, .04, .19, '#d7b16f', gun, .069, .03, -.37);
  muzzle = mesh(new T.OctahedronGeometry(.16), '#ffe1a5', gun, 0, .01, -1.2); muzzle.material = new T.MeshBasicMaterial({ color: '#ffd49a' });
  gun.position.set(.25, -.27, -.28); S.camera.add(gun); S.gun = gun;
}
export function initRender() {
  const renderer = new T.WebGLRenderer({ canvas: document.getElementById('view'), antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  const scene = new T.Scene(); scene.background = new T.Color('#34485e'); scene.fog = new T.FogExp2('#34485e', .017);
  const camera = new T.PerspectiveCamera(76, innerWidth / innerHeight, .05, 150); camera.rotation.order = 'YXZ'; scene.add(camera);
  S.renderer = renderer; S.scene = scene; S.camera = camera;
  scene.add(new T.HemisphereLight('#bacfef', '#34373b', 2));
  const sun = new T.DirectionalLight('#f1b780', 2.4); sun.position.set(-25, 28, 12); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -30; sun.shadow.camera.right = 30; sun.shadow.camera.top = 25; sun.shadow.camera.bottom = -25; sun.shadow.normalBias = .04; scene.add(sun);
  for (const [x, z] of [[-17, -6], [17, -9], [0, 12]]) {
    block(scene, x, 0, z, .13, 7.5, .13, '#52616b', false);
    block(scene, x, 7.2, z, 1.8, .13, .45, '#e5bf86', false);
    const glow = new T.PointLight('#ffa454', 55, 15, 2); glow.position.set(x, 6.7, z); scene.add(glow);
    const lamp = box(1.6, .06, .35, '#ffe0a5', scene, x, 7.15, z); lamp.material = new T.MeshBasicMaterial({ color: '#ffcc8a' });
  }
  buildMap(scene); makeGun();
  viewLight = new T.PointLight('#ffc380', 0, 5); camera.add(viewLight);
  for (let i = 0; i < 8; i++) actorMeshes.push(makeSoldier(i < 4 ? 0 : 1));
  bombMesh = new T.Group(); box(.55, .17, .35, '#303e43', bombMesh, 0, .1, 0); box(.25, .04, .14, '#e6ad62', bombMesh, .08, .21, 0);
  const diode = box(.05, .06, .05, '#ff7459', bombMesh, -.15, .21, 0); diode.material = new T.MeshBasicMaterial({ color: '#ff603e' }); scene.add(bombMesh);
  for (let i = 0; i < 8; i++) { const m = mesh(new T.SphereGeometry(.12, 8, 6), '#869561', scene); m.visible = false; grenadeMeshes.push(m); }
  for (let i = 0; i < 24; i++) {
    const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3));
    const line = new T.Line(geometry, new T.LineBasicMaterial({ color: '#ffc184', transparent: true, opacity: .8 })); line.frustumCulled = false; scene.add(line); S.tracers.push({ life: 0, mesh: line });
  }
  for (let i = 0; i < 5; i++) { const m = mesh(new T.IcosahedronGeometry(1, 1), '#ffc16c', scene); m.material = new T.MeshBasicMaterial({ color: '#ffc16c', transparent: true, opacity: .7, wireframe: true }); S.effects.push({ life: 0, mesh: m }); }
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
}
export function updateEffects(dt) {
  S.flash = Math.max(0, S.flash - dt); S.hit = Math.max(0, S.hit - dt); S.hurt = Math.max(0, S.hurt - dt); S.bannerTime = Math.max(0, S.bannerTime - dt);
  for (const t of S.tracers) t.life = Math.max(0, t.life - dt);
  for (const e of S.effects) e.life = Math.max(0, e.life - dt);
}
export function render() {
  const p = S.player, camera = S.camera;
  if (p && S.phase !== 'title') {
    camera.position.set(p.x, p.alive ? (p.crouch ? 1.05 : 1.65) : .65, p.z);
    camera.rotation.set(S.pitch + S.kick, S.yaw, p.alive ? 0 : .12, 'YXZ');
  } else if (!S.shot) { camera.position.set(-1, 9.5, 21); camera.lookAt(-2, 1, -5); }
  const showGun = p?.alive && S.phase !== 'title'; S.gun.visible = !!showGun;
  const pace = p ? Math.hypot(p.vx, p.vz) : 0;
  S.gun.position.set(.25 + Math.sin(S.time * 9) * pace * .002, -.27 + Math.cos(S.time * 18) * pace * .001 - (S.reload > 0 ? .18 : 0), -.28 + S.kick * 2);
  S.gun.rotation.set(S.reload > 0 ? -.35 : 0, 0, S.reload > 0 ? -.4 : 0);
  gunBody.scale.z = S.weapon === 'sniper' ? 1.5 : S.weapon === 'pistol' ? .55 : 1;
  muzzle.visible = S.flash > 0; muzzle.rotation.z = S.time * 90; viewLight.intensity = S.flash > 0 ? 10 : 0;
  for (let i = 0; i < actorMeshes.length; i++) {
    const m = actorMeshes[i], a = S.actors[i];
    m.visible = !!a && i !== 0;
    if (!a) continue;
    a.mesh = m; m.position.set(a.x, a.alive ? 0 : .12, a.z); m.rotation.set(a.alive ? 0 : -Math.PI / 2, a.yaw, 0); m.scale.y = a.crouch ? .7 : 1;
    const stride = a.alive ? Math.sin(S.time * 9 + i) * Math.min(.5, Math.hypot(a.vx, a.vz) * .15) : 0;
    m.userData.left.rotation.x = stride; m.userData.right.rotation.x = -stride; m.userData.flash.visible = a.flash > 0 && a.alive;
  }
  bombMesh.visible = S.bomb.planted || S.bomb.carrier < 0;
  bombMesh.position.set(S.bomb.x, .04, S.bomb.z); bombMesh.children[2].visible = Math.sin(S.time * 12) > 0;
  for (const m of grenadeMeshes) m.visible = false;
  for (let i = 0; i < S.grenades.length && i < grenadeMeshes.length; i++) { const n = S.grenades[i], m = grenadeMeshes[i]; n.mesh = m; m.visible = true; m.position.set(n.x, n.y, n.z); }
  for (const t of S.tracers) {
    t.mesh.visible = t.life > 0;
    if (t.life <= 0) continue;
    const a = t.mesh.geometry.attributes.position.array; a[0] = t.ax; a[1] = t.ay; a[2] = t.az; a[3] = t.bx; a[4] = t.by; a[5] = t.bz; t.mesh.geometry.attributes.position.needsUpdate = true;
  }
  for (const e of S.effects) { e.mesh.visible = e.life > 0; if (e.life > 0) { e.mesh.position.set(e.x, e.y, e.z); e.mesh.scale.setScalar((.5 - e.life) * 14 + .2); e.mesh.material.opacity = e.life; } }
  S.renderer.render(S.scene, camera);
}
