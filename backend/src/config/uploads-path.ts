import fs from 'fs';
import path from 'path';

/** Project image library at <repo>/uploads. */
export function getUploadsDir(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(dir, 'backend')) && fs.existsSync(path.join(dir, 'frontend'))) {
      const uploads = path.join(dir, 'uploads');
      fs.mkdirSync(uploads, { recursive: true });
      return uploads;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  const fallback = path.resolve(process.cwd(), '../uploads');
  fs.mkdirSync(fallback, { recursive: true });
  return fallback;
}
