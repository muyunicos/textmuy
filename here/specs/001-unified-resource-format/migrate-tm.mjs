// Migracion del espejo de desarrollo uploads/tm al formato unico.
// Constitucion IV v2.1: {thumbs:{w,h,c}, items:[[id,title,cats,file],...]}
// con id numerico >= 1; libre = tombstone [id,"","",""].
// Lee los formatos legacy (fonts.json tuplas string, img/catalogo.json
// objetos, presets por nombre de archivo) y escribe los catalogos
// canonicos, dejando backup .legacy al lado. Los .txm NO se re-escriben
// (la re-guarda del preset es del plugin/editor, Q4: rechazo con causa).
// Uso: node here/specs/001-unified-resource-format/migrate-tm.mjs
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const TM = [path.resolve(cwd, '..', 'uploads', 'tm'), path.resolve(cwd, 'uploads', 'tm')]
    .find((p) => fs.existsSync(p));
if (!TM) { console.error('No se hallo uploads/tm (corre desde textmuy/)'); process.exit(1); }
console.log('Migrando:', TM);

function esc(c) { return c.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'custom'; }

// ===== FONTS =====
(() => {
    const dir = path.join(TM, 'fonts');
    const fpath = path.join(dir, 'fonts.json');
    const raw = JSON.parse(fs.readFileSync(fpath, 'utf8'));
    if (raw && !Array.isArray(raw) && raw.thumbs) { console.log('fonts.json ya es canonico: se omite'); return; }
    fs.copyFileSync(fpath, fpath + '.legacy');
    let n = 0;
    const items = [];
    const vistos = new Set();
    const porArchivo = new Set();
    (Array.isArray(raw) ? raw : []).forEach((t) => {
        if (!Array.isArray(t) || t.length < 4) { console.warn('legacy invalida en fonts.json:', JSON.stringify(t)); return; }
        const [, titulo, cats, file] = t;
        const f = String(file || '').trim();
        if (!f) return; // sin referencia: se omite (equivalente legacy a libre)
        n++;
        const id = n;
        vistos.add(id);
        porArchivo.add(f);
        items.push([id, String(titulo || file), esc(String(cats || 'custom')), f]);
    });
    // Fisicas reales en disco (huerfanas del catalogo legacy: los MUY-*.ttf).
    const FIS = new Set(['.ttf', '.otf', '.woff', '.woff2']);
    fs.readdirSync(dir).filter((f) => FIS.has(path.extname(f).toLowerCase())).sort().forEach((f) => {
        if (porArchivo.has(f)) return; // ya catalogada
        n++;
        items.push([n, path.basename(f, path.extname(f)), 'custom', f]);
    });
    const out = { thumbs: { w: 180, h: 30, c: 4 }, items };
    fs.writeFileSync(fpath, JSON.stringify(out, null, 1), 'utf8');
    console.log('fonts.json:', items.length, 'items (ok)');
})();

// ===== IMG =====
(() => {
    const dir = path.join(TM, 'img');
    const fpath = path.join(dir, 'img.json');
    if (fs.existsSync(fpath)) { console.log('img.json ya existe: se omite'); return; }
    const src = path.join(dir, 'catalogo.json');
    if (!fs.existsSync(src)) { console.warn('img/catalogo.json ausente: se omite img'); return; }
    fs.copyFileSync(src, src + '.legacy');
    const raw = JSON.parse(fs.readFileSync(src, 'utf8'));
    let n = 0;
    const items = [];
    (Array.isArray(raw) ? raw : []).forEach((o) => {
        if (!o || typeof o !== 'object' || !o.nombre) { console.warn('legacy invalida en catalogo.json:', JSON.stringify(o)); return; }
        n++;
        items.push([n, String(o.titulo || o.nombre), esc(String(o.categoria || 'varios')), String(o.nombre)]);
    });
    const out = { thumbs: { w: 100, h: 100, c: 8 }, items };
    fs.writeFileSync(fpath, JSON.stringify(out, null, 1), 'utf8');
    console.log('img.json:', items.length, 'items (ok)');
})();

// ===== PRESETS =====
(() => {
    const dir = path.join(TM, 'presets');
    const fpath = path.join(dir, 'presets.json');
    if (fs.existsSync(fpath)) { console.log('presets.json ya existe: se omite'); return; }
    const txms = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.txm')).sort();
    let n = 0;
    const items = [];
    txms.forEach((f) => { n++; items.push([n, path.basename(f, path.extname(f)), 'custom', f]); });
    const out = { thumbs: { w: 200, h: 100, c: 4 }, items };
    fs.writeFileSync(fpath, JSON.stringify(out, null, 1), 'utf8');
    console.log('presets.json:', items.length, 'items (ok)');
})();

console.log('Listo. Re-guardar los .txm desde el editor para pasar de font.src string a id (Q4).');