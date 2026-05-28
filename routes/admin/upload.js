const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Asegurar que existan los directorios
const uploadDirs = [
  'public/uploads/cursos',
  'public/uploads/modulos',
  'public/uploads/blogs',
  'public/uploads/otros'
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configuración de almacenamiento de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determinar destino según el parámetro 'type'
    const type = req.query.type || 'otros';
    let dest = 'public/uploads/otros';
    
    if (type === 'cursos') {
      dest = 'public/uploads/cursos';
    } else if (type === 'modulos') {
      dest = 'public/uploads/modulos';
    } else if (type === 'blogs') {
      dest = 'public/uploads/blogs';
    }
    
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const type = req.query.type || 'otros';
    const timestamp = Math.floor(Date.now() / 1000);
    const randomHex = crypto.randomBytes(4).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Nombre único estructurado: tipo_timestamp_random.extension
    const uniqueName = `${type}_${timestamp}_${randomHex}${ext}`;
    cb(null, uniqueName);
  }
});

// Filtro de formato
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato no permitido. Solo se aceptan archivos PNG, JPG, JPEG o WEBP.'), false);
  }
};

// Configurar multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Limite de 5MB
  }
}).single('image');

// Endpoint POST /api/admin/upload
router.post('/upload', (req, res) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Error de límites de Multer (ej. archivo muy grande)
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'El archivo excede el tamaño límite permitido de 5MB.' });
      }
      return res.status(400).json({ error: `Error de subida: ${err.message}` });
    } else if (err) {
      // Error personalizado del filtro
      return res.status(400).json({ error: err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'Por favor, selecciona un archivo para subir.' });
    }
    
    // Obtener los metadatos para enviar de vuelta
    const filename = req.file.filename;
    const sizeBytes = req.file.size;
    const sizeKB = (sizeBytes / 1024).toFixed(1);
    const mimeType = req.file.mimetype;
    
    // Construir la URL relativa pública de la imagen
    const type = req.query.type || 'otros';
    const publicUrl = `/uploads/${type}/${filename}`;
    
    res.json({
      success: true,
      url: publicUrl,
      meta: {
        filename,
        mimeType,
        size: `${sizeKB} KB`
      }
    });
  });
});

module.exports = router;
