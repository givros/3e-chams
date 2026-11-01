import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.resolve(root, 'dist');
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

await mkdir(path.join(output, 'mbot2-lab'), { recursive: true });
await Promise.all(['index.html', 'app.js', 'style.css'].map(entry => cp(path.join(root, 'mbot2-lab', entry), path.join(output, 'mbot2-lab', entry))));
await writeFile(path.join(output, '.nojekyll'), '');
console.log('Studio built in dist/; other workshops in code-quest/ and mbot2-lab/.');
