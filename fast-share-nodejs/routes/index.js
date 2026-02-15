/**
 * Register all API routes.
 * Order matters: e.g. GET /rooms/joined before GET /rooms/:code.
 */

const express = require('express');
const multer = require('multer');
const { attachClient } = require('../middleware/client');
const meHandler = require('../handlers/me');
const roomsHandler = require('../handlers/rooms');
const messagesHandler = require('../handlers/messages');
const filesHandler = require('../handlers/files');

const router = express.Router();

// Multer for file upload (memory storage; we write to disk in handler)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB
});

// --- /me (current client profile) ---
router.put('/me', attachClient, meHandler.putMe);

// --- /rooms ---
router.post('/rooms', attachClient, roomsHandler.createRoom);
router.get('/rooms/joined', attachClient, roomsHandler.getJoinedRooms);  // before :code
router.post('/rooms/:code/join', attachClient, roomsHandler.joinRoom);
router.delete('/rooms/:code', attachClient, roomsHandler.ownerDeleteRoom);
router.get('/rooms/:code', attachClient, roomsHandler.getRoomDetail);
router.post('/rooms/:code/extend', attachClient, roomsHandler.ownerExtendRoom);

// --- /rooms/:code/messages ---
router.post('/rooms/:code/messages', attachClient, messagesHandler.sendMessage);
router.get('/rooms/:code/messages', attachClient, messagesHandler.getRoomMessages);

// --- /messages/:id ---
router.put('/messages/:id', attachClient, messagesHandler.updateMessage);
router.delete('/messages/:id', attachClient, messagesHandler.deleteMessage);

// --- /rooms/:code/files ---
router.get('/rooms/:code/files', attachClient, filesHandler.getRoomFiles);
router.post('/rooms/:code/files', attachClient, upload.single('file'), filesHandler.uploadFile);

// --- /files/:id/download (allow cookie or header for client identity) ---
function attachClientForDownload(req, res, next) {
  const clientId = filesHandler.getClientIdForRequest(req);
  if (clientId) {
    req.clientId = clientId;
    return next();
  }
  attachClient(req, res, next);
}
router.get('/files/:id/download', attachClientForDownload, filesHandler.downloadFile);

// --- /files/:id (delete) ---
router.delete('/files/:id', attachClient, filesHandler.deleteFile);

module.exports = router;
