const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const docs = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
const version = /hoy \*\*(RC\d+)\*\*/.exec(docs);
assert.ok(version, 'version actual documentada');
for (const file of ['index.html', 'render-core.html']) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const scripts = [...html.matchAll(/<script\b[^>]*src="(js\/[^\"]+)"/g)].map(m => m[1]);
    assert.ok(scripts.length > 0, file + ': scripts propios presentes');
    for (const src of scripts) assert.ok(src.endsWith('?v=' + version[1]), file + ': ' + src);
    if (file === 'index.html') assert.ok(html.includes('css/style.css?v=' + version[1]), 'CSS sincronizado');
}
console.log('OK: rc-bump.test.js (' + version[1] + ')');
