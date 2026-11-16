import * as T from 'three';
import { S } from './state.js';
export const boxes = [], nodes = [], sites = [{ name: 'A', x: -16, z: -9, r: 3.5 }, { name: 'B', x: 16, z: -8, r: 3.5 }];
const material = new Map();
function mat(color, roughness = .8) {
  if (!material.has(color)) material.set(color, new T.MeshStandardMaterial({ color, roughness }));
  return material.get(color);
}
export function block(scene, x, y, z, w, h, d, color, solid = true) {
  const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  if (solid) boxes.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y0: y, y1: y + h });
  return m;
}
export function label(scene, text, x, y, z, width = 3, color = '#e8c894', rotation = 0) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160;
  const g = c.getContext('2d'); g.fillStyle = '#10232b'; g.fillRect(0, 0, 512, 160);
  g.strokeStyle = color; g.lineWidth = 5; g.strokeRect(8, 8, 496, 144);
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 64px monospace'; g.fillText(text, 256, 84);
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
  const m = new T.Mesh(new T.PlaneGeometry(width, width * .3125), new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide }));
  m.position.set(x, y, z); m.rotation.y = rotation; scene.add(m); return m;
}
function container(scene, x, z, w, d, color, tag, y = 0) {
  block(scene, x, y, z, w, 2.8, d, color);
  for (let a = -w / 2 + .25; a < w / 2; a += .45) block(scene, x + a, y + .12, z + d / 2 + .025, .065, 2.55, .065, color, false);
  for (const side of [-1, 1]) {
    block(scene, x, y + .05, z + side * d / 2, w, .1, .12, '#547577', false);
    block(scene, x, y + 2.65, z + side * d / 2, w, .1, .12, '#547577', false);
  }
  label(scene, tag, x, y + 1.6, z + d / 2 + .07, Math.min(3, w * .7), '#9ac6bd');
}
export function clearAt(x, z, radius = .38) {
  if (x < -22.4 || x > 22.4 || z < -16.4 || z > 16.4) return false;
  for (const b of boxes) if (b.y0 < 1.8 && b.y1 > .1 && x > b.x0 - radius && x < b.x1 + radius && z > b.z0 - radius && z < b.z1 + radius) return false;
  return true;
}
export function move(a, dx, dz) {
  // Separate axes slide along obstacles; substeps prevent tunnelling even on slow frames.
  const count = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / .18));
  for (let i = 0; i < count; i++) {
    if (clearAt(a.x + dx / count, a.z)) a.x += dx / count; else a.vx = 0;
    if (clearAt(a.x, a.z + dz / count)) a.z += dz / count; else a.vz = 0;
  }
}
export function wallDistance(ox, oy, oz, dx, dy, dz, limit = 100, inflate = 0) {
  let closest = limit;
  for (const b of boxes) {
    let lo = 0, hi = closest;
    if (Math.abs(dx) < 1e-8) { if (ox < b.x0 - inflate || ox > b.x1 + inflate) continue; }
    else { const a = (b.x0 - inflate - ox) / dx, c = (b.x1 + inflate - ox) / dx; lo = Math.max(lo, Math.min(a, c)); hi = Math.min(hi, Math.max(a, c)); }
    if (Math.abs(dy) < 1e-8) { if (oy < b.y0 || oy > b.y1) continue; }
    else { const a = (b.y0 - oy) / dy, c = (b.y1 - oy) / dy; lo = Math.max(lo, Math.min(a, c)); hi = Math.min(hi, Math.max(a, c)); }
    if (Math.abs(dz) < 1e-8) { if (oz < b.z0 - inflate || oz > b.z1 + inflate) continue; }
    else { const a = (b.z0 - inflate - oz) / dz, c = (b.z1 + inflate - oz) / dz; lo = Math.max(lo, Math.min(a, c)); hi = Math.min(hi, Math.max(a, c)); }
    if (hi >= lo && hi > .001) closest = lo;
  }
  return closest;
}
export function visible(ax, az, bx, bz, height = 1.4, inflate = 0) {
  const d = Math.hypot(bx - ax, bz - az);
  return d < .01 || wallDistance(ax, height, az, (bx - ax) / d, 0, (bz - az) / d, d, inflate) >= d - .05;
}
export function pathTo(a, x, z) {
  if (visible(a.x, a.z, x, z, 1, .42)) { a.route.length = 0; a.route.push({ x, z }); a.routeIndex = 0; return; }
  let start = -1, end = -1, ds = Infinity, de = Infinity;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i], d = Math.hypot(n.x - a.x, n.z - a.z), e = Math.hypot(n.x - x, n.z - z);
    if (d < ds && visible(a.x, a.z, n.x, n.z, 1, .4)) { ds = d; start = i; }
    if (e < de && visible(x, z, n.x, n.z, 1, .4)) { de = e; end = i; }
  }
  a.route.length = 0; a.routeIndex = 0;
  if (start < 0 || end < 0) return;
  const queue = [start], parent = new Int16Array(nodes.length).fill(-1); parent[start] = start;
  for (let q = 0; q < queue.length && parent[end] < 0; q++) for (const k of nodes[queue[q]].edges) if (parent[k] < 0) { parent[k] = queue[q]; queue.push(k); }
  if (parent[end] < 0) return;
  let k = end;
  while (k !== start) { a.route.unshift(nodes[k]); k = parent[k]; }
  a.route.unshift(nodes[start]); a.route.push({ x, z });
}
export function buildMap(scene) {
  boxes.length = 0; nodes.length = 0;
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d'); g.fillStyle = '#28343a'; g.fillRect(0, 0, 512, 512);
  let seed = 171;
  for (let i = 0; i < 12000; i++) { seed = (seed * 16807) % 2147483647; const x = seed % 512; seed = (seed * 16807) % 2147483647; g.fillStyle = i % 2 ? '#2e393f' : '#253137'; g.fillRect(x, seed % 512, 2, 2); }
  g.strokeStyle = '#8d8058'; g.lineWidth = 5; g.setLineDash([32, 22]); g.beginPath(); g.moveTo(256, 0); g.lineTo(256, 512); g.stroke();
  const tex = new T.CanvasTexture(c); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(5, 4); tex.colorSpace = T.SRGBColorSpace;
  const ground = new T.Mesh(new T.PlaneGeometry(46, 34), new T.MeshStandardMaterial({ map: tex, roughness: .94 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  block(scene, 0, 0, -17.5, 47, 4, 1, '#35414c'); block(scene, 0, 0, 17.5, 47, 3, 1, '#35414c');
  block(scene, -23.5, 0, 0, 1, 5, 36, '#394650'); block(scene, 23.5, 0, 0, 1, 4, 36, '#394650');
  // West warehouse: a sheltered site with two entrances and a clear A-long approach.
  block(scene, -18, 0, -14, 10, 5.5, .5, '#687078');
  block(scene, -11.8, 0, -11, .5, 5.5, 6.5, '#626b72');
  block(scene, -11.8, 3.4, -5.7, .5, 2.1, 4, '#626b72');
  block(scene, -16.4, 3.4, -4, 9.5, 2.1, .45, '#626b72');
  block(scene, -16.5, 5.5, -9.5, 12.5, .3, 11, '#333e48');
  for (let x = -21; x < -13; x += 2.3) block(scene, x, 3.2, -13.7, 1.7, 1, .05, '#bd985e', false);
  label(scene, 'A / FREIGHT', -16.5, 4.45, -3.73, 7, '#f4bb6a');
  container(scene, -5.5, 2.5, 4, 7, '#236a70', 'DL / 047');
  container(scene, 5.5, -1.5, 4, 7, '#2f5965', 'NORTH 12');
  container(scene, 0, -2, 15, 2.5, '#3a7275', 'DUSKLINE', 3.1);
  container(scene, 17, -13, 9, 3, '#35696c', 'B / 029');
  container(scene, 20, -7, 3, 8, '#736248', 'DL 08');
  container(scene, 17, -13, 9, 3, '#986e49', 'STACK 02', 2.85);
  container(scene, 11, 7, 4, 4, '#3e6669', 'YARD 6');
  const crates = [[-16, 3, 2, 2], [-19, -10, 2, 2], [-12, 9, 2.2, 2], [3, 10, 2, 2], [15, 1, 2, 2], [18, 4, 1.7, 1.7], [11, -7, 2, 2], [-5, -11, 2.4, 2], [0, -9, 2, 1.2]];
  for (const [x, z, w, h] of crates) {
    block(scene, x, 0, z, w, h, w, '#806b50');
    for (const side of [-1, 1]) { block(scene, x, .12, z + side * (w / 2 + .02), w, .1, .07, '#b19a70', false); block(scene, x, h - .2, z + side * (w / 2 + .02), w, .1, .07, '#b19a70', false); }
  }
  for (const [x, z] of [[-21, 7], [21, 11], [8, -14], [-9, 14]]) {
    const barrel = new T.Mesh(new T.CylinderGeometry(.42, .45, 1.1, 12), mat('#986347')); barrel.position.set(x, .55, z); scene.add(barrel);
    boxes.push({ x0: x - .45, x1: x + .45, z0: z - .45, z1: z + .45, y0: 0, y1: 1.1 });
  }
  for (const site of sites) {
    const ring = new T.Mesh(new T.RingGeometry(site.r - .08, site.r, 64), new T.MeshBasicMaterial({ color: '#d7a55f', side: T.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(site.x, .025, site.z); scene.add(ring);
    label(scene, site.name + ' / PLANT', site.x, .035, site.z, 3.2, '#dcb475').rotation.x = -Math.PI / 2;
  }
  label(scene, 'DUSKLINE // 07', 0, 3.2, -16.9, 10, '#9ab4b6');
  label(scene, 'A  ←     →  B', 0, 2.1, 17, 5, '#e6b46e', Math.PI);
  // Silhouetted freight infrastructure beyond the playable perimeter.
  for (let i = 0; i < 13; i++) { const x = -40 + i * 7; block(scene, x, 0, -28, 5, 4 + (i % 4) * 2, 6, '#263746', false); }
  for (const x of [-20, 19]) {
    block(scene, x, 0, -19, .3, 13, .3, '#41505c', false); block(scene, x + 5, 12.5, -19, 12, .35, .35, '#41505c', false);
    block(scene, x + 10, 5, -19, .07, 7.5, .07, '#66727a', false);
  }
  // Navigation graph connects free grid points with body-clear links. Bridges remain traversable below.
  for (let z = -15; z <= 15; z += 2) for (let x = -21; x <= 21; x += 2) if (clearAt(x, z, .55)) nodes.push({ x, z, edges: [] });
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const a = nodes[i], b = nodes[j];
    if (Math.hypot(a.x - b.x, a.z - b.z) < 3 && visible(a.x, a.z, b.x, b.z, 1, .45)) { a.edges.push(j); b.edges.push(i); }
  }
  S.map = { boxes, nodes, sites };
}
