import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-threejs.ts';

const source = fileURLToPath(new URL('.', import.meta.url));
const target = process.env.MAKEFUN_OUTPUT_DIR || '/output';
mkdirSync(target, { recursive: true });
cpSync(join(source, 'game'), join(target, 'game'), { recursive: true });
mkdirSync(join(target, 'screenshots'), { recursive: true });
const shots = join(source, 'screenshots');
if (existsSync(shots)) cpSync(shots, join(target, 'screenshots'), { recursive: true });
const caps = { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, game_max_files: 993, game_max_bytes: 50331648 };
const dossier = buildDossier(target, caps);
writeFileSync(join(target, 'dossier.json'), dossier);
console.log(`Wrote ${join(target, 'dossier.json')}`);
