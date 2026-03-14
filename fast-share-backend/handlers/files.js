/**
 * File handlers: upload, list room files, download, delete (owner/admin).
 * Uses attachClient for most; for download we also accept cookie (see routes).
 */

const fs = require('fs');
const path = require('path');
const { getDb } = require('../db/connection');
const { ok, fail } = require('../helpers/responses');
const { getClientUuid, nowUnix } = require('../middleware/client');
const config = require('../config');

// Dynamic storage imports based on configuration
let storageModule;
if (config.STORAGE_TYPE === 'cloudinary') {
  storageModule = require('../storage/cloudinary');
} else {
  storageModule = require('../storage/disk');
}

const { uploadFile: uploadToStorage, getFileUrl, getDownloadUrl, deleteFile: deleteFromStorage } = storageModule;

const MEDIA_DIR = 'media';

function resolveRoom(code, clientId) {
  const row = getDb().prepare(`
    SELECT r.id as roomId, r.expires_at
    FROM rooms r
    JOIN room_members rm ON rm.room_id = r.id
    WHERE r.code = ? AND rm.client_id = ?
  `).get(code, clientId);
  return row;
}

function resolveRoomRole(roomId, clientId) {
  const row = getDb().prepare(
    'SELECT role FROM room_members WHERE room_id = ? AND client_id = ?'
  ).get(roomId, clientId);
  return row ? row.role : null;
}

/**
 * Get clientId from header or cookie (for download). Returns clientId or null.
 */
function getClientIdForRequest(req) {
  const uuid = (req.get('X-Client-UUID') || req.cookies && req.cookies['X-Client-UUID'] || '').trim();
  if (!uuid || uuid.length < 8) return null;
  const row = getDb().prepare('SELECT id FROM clients WHERE uuid = ?').get(uuid);
  return row ? row.id : null;
}

// --- Upload file ---
async function uploadFile(req, res) {
  const code = (req.params.code || '').trim();
  if (!code) return fail(res, 400, 'BAD_REQUEST', 'missing room code');

  const clientId = req.clientId;
  const room = resolveRoom(code, clientId);
  if (!room) return fail(res, 403, 'FORBIDDEN', 'not a room member');
  if (room.expires_at <= nowUnix()) {
    return fail(res, 410, 'ROOM_EXPIRED', 'room expired');
  }

  if (!req.file) return fail(res, 400, 'BAD_REQUEST', 'file is required');

  const originalName = path.basename(req.file.originalname || req.file.filename || 'file');
  if (!originalName || originalName === '.' || originalName === '/') {
    return fail(res, 400, 'BAD_REQUEST', 'invalid filename');
  }

  const buffer = req.file.buffer;
  const size = buffer.length;

  try {
    if (config.STORAGE_TYPE === 'cloudinary') {
      // Upload to Cloudinary
      const uploadResult = await storageModule.uploadFile(buffer, originalName, code);

      const n = nowUnix();

      const result = getDb().prepare(`
        INSERT INTO files (room_id, uploader_client_id, filename, path, cloudinary_public_id, cloudinary_url, size, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(room.roomId, clientId, uploadResult.original_filename || originalName, '', uploadResult.public_id, uploadResult.secure_url, size, n);

      return ok(res, 201, {
        id: result.lastInsertRowid,
        filename: uploadResult.original_filename || originalName,
        size,
        url: uploadResult.secure_url,
        uploaded_at: n
      });
    } else {
      // Upload to disk (original logic)
      const uploadResult = await storageModule.uploadFile(buffer, originalName, code);

      const n = nowUnix();

      const result = getDb().prepare(`
        INSERT INTO files (room_id, uploader_client_id, filename, path, size, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(room.roomId, clientId, uploadResult.filename, uploadResult.path, size, n);

      return ok(res, 201, {
        id: result.lastInsertRowid,
        filename: uploadResult.filename,
        size,
        path: uploadResult.path,
        uploaded_at: n
      });
    }
  } catch (err) {
    console.error('UploadFile error:', err);
    return fail(res, 500, 'STORAGE_ERROR', `failed to ${config.STORAGE_TYPE === 'cloudinary' ? 'upload' : 'save'} file`);
  }
}

// --- Get room files ---
function getRoomFiles(req, res) {
  const code = (req.params.code || '').trim();
  if (!code) return fail(res, 400, 'BAD_REQUEST', 'missing room code');

  const clientId = req.clientId;
  const room = resolveRoom(code, clientId);
  if (!room) return fail(res, 403, 'FORBIDDEN', 'not a room member');
  if (room.expires_at <= nowUnix()) {
    return fail(res, 410, 'ROOM_EXPIRED', 'room expired');
  }

  let query;
  let selectFields;
  
  if (config.STORAGE_TYPE === 'cloudinary') {
    selectFields = 'id, filename, size, downloaded, created_at, cloudinary_url';
    query = `
      SELECT ${selectFields}
      FROM files WHERE room_id = ? ORDER BY id DESC
    `;
  } else {
    selectFields = 'id, filename, size, downloaded, created_at';
    query = `
      SELECT ${selectFields}
      FROM files WHERE room_id = ? ORDER BY id DESC
    `;
  }

  const rows = getDb().prepare(query).all(room.roomId);

  const files = rows.map((f) => {
    const fileData = {
      id: f.id,
      filename: f.filename,
      size: f.size,
      downloaded: f.downloaded,
      created_at: f.created_at
    };

    if (config.STORAGE_TYPE === 'cloudinary') {
      fileData.url = f.cloudinary_url;
    } else {
      // For disk storage, provide download endpoint URL
      fileData.url = `/api/files/${f.id}/download`;
    }

    return fileData;
  });

  return ok(res, 200, { files });
}

// --- Download file ---
function downloadFile(req, res) {
  const fileId = parseInt(req.params.id, 10);
  if (!fileId || fileId <= 0) return fail(res, 400, 'BAD_REQUEST', 'invalid id');

  const clientId = getClientIdForRequest(req);
  if (!clientId) return fail(res, 400, 'BAD_REQUEST', 'missing client identity');

  let query;
  if (config.STORAGE_TYPE === 'cloudinary') {
    query = `
      SELECT f.filename, f.cloudinary_url, f.cloudinary_public_id, r.expires_at
      FROM files f
      JOIN rooms r ON r.id = f.room_id
      JOIN room_members rm ON rm.room_id = r.id
      WHERE f.id = ? AND rm.client_id = ?
    `;
  } else {
    query = `
      SELECT f.filename, f.path, r.expires_at
      FROM files f
      JOIN rooms r ON r.id = f.room_id
      JOIN room_members rm ON rm.room_id = r.id
      WHERE f.id = ? AND rm.client_id = ?
    `;
  }

  const row = getDb().prepare(query).get(fileId, clientId);

  if (!row) return fail(res, 404, 'NOT_FOUND', 'file not found or no access');
  if (row.expires_at <= nowUnix()) {
    return fail(res, 410, 'ROOM_EXPIRED', 'room expired');
  }

  getDb().prepare('UPDATE files SET downloaded = downloaded + 1 WHERE id = ?').run(fileId);

  res.setHeader('Content-Disposition', 'attachment; filename="' + row.filename + '"');

  if (config.STORAGE_TYPE === 'cloudinary') {
    if (!row.cloudinary_url) {
      return fail(res, 404, 'NOT_FOUND', 'file not available');
    }
    // Modify the secure URL to force download by adding fl_attachment
    const downloadUrl = row.cloudinary_url.replace('/upload/', '/upload/fl_attachment/');
    return res.redirect(downloadUrl);
  } else {
    if (!fs.existsSync(row.path)) {
      return fail(res, 404, 'NOT_FOUND', 'file missing on disk');
    }
    return res.sendFile(path.resolve(row.path));
  }
}

// --- Delete file (owner/admin only) ---
async function deleteFile(req, res) {
  const fileId = parseInt(req.params.id, 10);
  if (!fileId || fileId <= 0) return fail(res, 400, 'BAD_REQUEST', 'invalid id');

  const clientId = req.clientId;

  let query;
  if (config.STORAGE_TYPE === 'cloudinary') {
    query = `
      SELECT f.room_id, f.cloudinary_public_id, r.expires_at
      FROM files f
      JOIN rooms r ON r.id = f.room_id
      WHERE f.id = ?
    `;
  } else {
    query = `
      SELECT f.room_id, f.path, r.expires_at
      FROM files f
      JOIN rooms r ON r.id = f.room_id
      WHERE f.id = ?
    `;
  }

  const fileRow = getDb().prepare(query).get(fileId);

  if (!fileRow) return fail(res, 404, 'NOT_FOUND', 'file not found');

  const role = resolveRoomRole(fileRow.room_id, clientId);
  if (!role) return fail(res, 403, 'FORBIDDEN', 'not a room member');
  if (role !== 'owner' && role !== 'admin') {
    return fail(res, 403, 'FORBIDDEN', 'only owner or admin can delete file');
  }

  // Delete from storage
  if (config.STORAGE_TYPE === 'cloudinary') {
    if (fileRow.cloudinary_public_id) {
      try {
        await storageModule.deleteFile(fileRow.cloudinary_public_id);
      } catch (e) {
        console.error('DeleteFile Cloudinary error:', e);
        // Continue with DB deletion even if Cloudinary delete fails
      }
    }
  } else {
    if (fileRow.path && fs.existsSync(fileRow.path)) {
      try {
        fs.unlinkSync(fileRow.path);
      } catch (e) {
        console.error('DeleteFile unlink error:', e);
      }
    }
  }

  getDb().prepare('DELETE FROM files WHERE id = ?').run(fileId);

  return ok(res, 200, { status: 'deleted', id: fileId });
}

module.exports = {
  uploadFile,
  getRoomFiles,
  downloadFile,
  deleteFile,
  getClientIdForRequest
};
