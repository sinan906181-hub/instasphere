import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const uploadsDir = path.join(process.cwd(), 'uploads');

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Multer Storage Configuration
  const storageConfig = multer.diskStorage({
    destination: (req, _file, cb) => {
      const folderParam = (typeof req.query.folder === 'string' ? req.query.folder : '') ||
                          (typeof req.body?.folder === 'string' ? req.body.folder : '');
      const subPath = folderParam.replace(/[^a-zA-Z0-9_\-\/]/g, '');
      const targetDir = subPath ? path.join(uploadsDir, subPath) : uploadsDir;
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      cb(null, targetDir);
    },
    filename: (_req, file, cb) => {
      const cleanName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${cleanName}`;
      cb(null, uniqueName);
    }
  });

  const upload = multer({
    storage: storageConfig,
    limits: {
      fileSize: 100 * 1024 * 1024 // 100MB max
    }
  });

  // Health API
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // Upload Single Media File
  app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      const relPath = path.relative(uploadsDir, req.file.path).replace(/\\/g, '/');
      const mediaUrl = `/api/media/${relPath}`;
      return res.status(200).json({
        success: true,
        url: mediaUrl,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      });
    } catch (err: any) {
      console.error('Server upload error:', err);
      return res.status(500).json({ error: err?.message || 'Upload processing failed' });
    }
  });

  // Upload Multiple Media Files
  app.post('/api/upload-multiple', upload.array('files', 10), (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }
      const urls = files.map((f) => {
        const relPath = path.relative(uploadsDir, f.path).replace(/\\/g, '/');
        return `/api/media/${relPath}`;
      });
      return res.status(200).json({
        success: true,
        urls
      });
    } catch (err: any) {
      console.error('Multiple upload error:', err);
      return res.status(500).json({ error: err?.message || 'Multiple upload failed' });
    }
  });

  // Serve Media Files safely with CORS & Range support for video playback
  app.get('/api/media/:filePath(*)', (req, res) => {
    const rawPath = (req.params as Record<string, string>)['filePath(*)'] || (req.params as any).filePath || '';
    const safePath = path.normalize(rawPath).replace(/^(\.\.[\/\\])+/, '');
    const absolutePath = path.join(uploadsDir, safePath);

    if (!absolutePath.startsWith(uploadsDir) || !fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'Media file not found' });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.sendFile(absolutePath, {
      acceptRanges: true,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  });

  // Multer Error Handling Middleware
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File size exceeds maximum limit of 100MB.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
    if (err) {
      console.error('Server error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
    next();
  });

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MediaSphere Full-Stack Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
