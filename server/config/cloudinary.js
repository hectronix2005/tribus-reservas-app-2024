const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || 'demo',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'demo',
  secure: true
});

console.log('☁️ Cloudinary configurado:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? '✓ Configurado' : '⚠️ Usando demo',
  api_key: process.env.CLOUDINARY_API_KEY ? '✓ Configurado' : '⚠️ Usando demo',
  api_secret: process.env.CLOUDINARY_API_SECRET ? '✓ Configurado' : '⚠️ Usando demo'
});

module.exports = cloudinary;
