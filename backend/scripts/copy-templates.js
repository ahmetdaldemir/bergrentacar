/**
 * Build sonrası rentacar sözleşme HTML şablonlarını dist'e kopyalar.
 * npm run build içinden çağrılır.
 */
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'modules', 'rentacar', 'templates');
const destDir = path.join(__dirname, '..', 'dist', 'modules', 'rentacar', 'templates');

if (!fs.existsSync(srcDir)) {
  console.warn('copy-templates: src templates dir not found, skipping');
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
const files = fs.readdirSync(srcDir);
let count = 0;
for (const f of files) {
  if (f.endsWith('.html') || f.endsWith('.md')) {
    fs.copyFileSync(path.join(srcDir, f), path.join(destDir, f));
    count++;
  }
}
console.log('copy-templates: copied', count, 'file(s) to dist/modules/rentacar/templates/');

// Voucher PDF (Noto Sans TTF)
const fontsSrc = path.join(__dirname, '..', 'src', 'assets', 'fonts');
const fontsDest = path.join(__dirname, '..', 'dist', 'assets', 'fonts');
if (fs.existsSync(fontsSrc)) {
  fs.mkdirSync(fontsDest, { recursive: true });
  let n = 0;
  for (const f of fs.readdirSync(fontsSrc)) {
    if (f.endsWith('.ttf')) {
      fs.copyFileSync(path.join(fontsSrc, f), path.join(fontsDest, f));
      n++;
    }
  }
  if (n > 0) console.log('copy-templates: copied', n, 'font file(s) to dist/assets/fonts/');
}
