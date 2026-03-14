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

/**
 * Upload a file buffer to disk storage
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Original filename
 * @param {string} roomCode - Room code for organizing files
 * @returns {Promise<Object>} Upload result with path info
 */
async function uploadFile(buffer, filename, roomCode) {
  const MEDIA_DIR = 'media'; // This should be imported or configured
  const roomDir = path.join(MEDIA_DIR, roomCode);
  ensureDir(roomDir);
  const finalName = resolveFileName(roomDir, filename);
  const finalPath = path.join(roomDir, finalName);

  return new Promise((resolve, reject) => {
    try {
      fs.writeFileSync(finalPath, buffer);
      resolve({
        original_filename: filename,
        filename: finalName,
        path: finalPath
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get the file path for a local file (same as getFileUrl for disk storage)
 * @param {string} filePath - Local file path
 * @returns {string} File path
 */
function getDownloadUrl(filePath) {
  return filePath;
}

/**
 * Delete a file from disk storage
 * @param {string} filePath - Local file path
 * @returns {Promise<Object>} Delete result
 */
async function deleteFile(filePath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        resolve({ result: 'ok' });
      } catch (error) {
        reject(error);
      }
    } else {
      resolve({ result: 'not found' });
    }
  });
}

module.exports = {
  ensureDir,
  resolveFileName,
  uploadFile,
  getFileUrl,
  getDownloadUrl,
  deleteFile
};
