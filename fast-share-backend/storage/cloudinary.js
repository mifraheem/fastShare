/**
 * Cloudinary storage helpers: upload, get URL, delete files.
 */

const cloudinary = require('cloudinary').v2;
const config = require('../config');

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET
});

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Original filename
 * @param {string} roomCode - Room code for organizing files
 * @returns {Promise<Object>} Cloudinary upload result
 */
async function uploadFile(buffer, filename, roomCode) {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: `fastshare/${roomCode}`,
      public_id: filename,
      resource_type: 'auto',
      overwrite: false,
      use_filename: true,
      unique_filename: false
    };

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    // Write buffer to stream
    stream.end(buffer);
  });
}

/**
 * Get the public URL for a Cloudinary file
 * @param {string} publicId - Cloudinary public ID
 * @returns {string} Public URL
 */
function getFileUrl(publicId) {
  return cloudinary.url(publicId, {
    secure: true
  });
}

/**
 * Get the download URL for a Cloudinary file (forces download)
 * @param {string} publicId - Cloudinary public ID
 * @returns {string} Download URL
 */
function getDownloadUrl(publicId) {
  // Use the regular URL and add attachment transformation
  const regularUrl = getFileUrl(publicId);
  return regularUrl.replace('/upload/', '/upload/fl_attachment/');
}

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} Cloudinary delete result
 */
async function deleteFile(publicId) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

module.exports = {
  uploadFile,
  getFileUrl,
  getDownloadUrl,
  deleteFile
};