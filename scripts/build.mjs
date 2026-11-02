import { cp, mkdir, rm, writeFile, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.resolve(root, 'dist');
const assetVersion = process.env.GITHUB_SHA || String(Date.now());
if (path.dirname(output) !== path.resolve(root) || path.basename(output) !== 'dist') {
  throw new Error('Build output must be the project dist directory.');
}

const workshopEntries = [
  'index.html', 'styles.css', 'src',
  'Background', 'Items', 'Main Characters', 'Menu', 'Other', 'Terrain', 'Traps'
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await mkdir(path.join(output, 'code-quest'), { recursive: true });
await Promise.all(workshopEntries.map(entry => cp(path.join(root, entry), path.join(output, 'code-quest', entry), { recursive: true })));

const studioEntries = ['index.html', 'view.html', 'studio.css', 'src', 'assets'];
await Promise.all(studioEntries.map(entry => cp(path.join(root, 'juvign-miam', entry), path.join(output, entry), { recursive: true })));
// Version the complete studio module graph, not just its entry file. Old HTML
// must keep using a consistent set of imports during a Pages rollout.
for (const file of await readdir(path.join(output, 'src'), { recursive: true })) {
  if (!file.endsWith('.js')) continue;
  const target = path.join(output, 'src', file);
  const source = await readFile(target, 'utf8');
  await writeFile(target, source.replace(/(\bfrom\s*['"])(\.\.?\/[^'"?]+\.js)(['"])/g, (_, before, reference, after) => `${before}${reference}?v=${assetVersion}${after}`));
}
for (const file of ['index.html', 'view.html']) {
  const target = path.join(output, file), source = await readFile(target, 'utf8');
  await writeFile(target, source.replace(/((?:src|href)=")(src\/[^"?]+\.js|studio\.css)(")/g, (_, before, reference, after) => `${before}${reference}?v=${assetVersion}${after}`));
}

await mkdir(path.join(output, 'mbot2-lab'), { recursive: true });
await Promise.all(['index.html', 'app.js', 'style.css'].map(entry => cp(path.join(root, 'mbot2-lab', entry), path.join(output, 'mbot2-lab', entry))));
await writeFile(path.join(output, '.nojekyll'), '');
await writeFile(path.join(output, 'version.json'), JSON.stringify({ revision: process.env.GITHUB_SHA || 'local', builtAt: new Date().toISOString() }));
console.log('Studio built in dist/; other workshops in code-quest/ and mbot2-lab/.');
