/**
 * File storage helpers: ensure directory exists, resolve unique filename.
 */

const fs = require('fs');
const path = require('path');

/**
 * Create directory (and parents) if it does not exist.
 */
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * If filename already exists in dir, return a unique name like file(1).jpg, file(2).jpg.
 */
function resolveFileName(dir, filename) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let finalName = filename;
  let i = 1;

  while (true) {
    const fullPath = path.join(dir, finalName);
    if (!fs.existsSync(fullPath)) {
      return finalName;
    }
    finalName = base + '(' + i + ')' + ext;
    i++;
  }
}

module.exports = {
  ensureDir,
  resolveFileName
};
