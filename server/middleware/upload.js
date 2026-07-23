// ============================================
//  上传中间件 — Multer 图片上传配置
// ============================================
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { fileURLToPath } from 'url'
import { UPLOAD_MAX_SIZE, ALLOWED_IMAGE_TYPES } from '../config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

export const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname)),
  }),
  limits: { fileSize: UPLOAD_MAX_SIZE },
  fileFilter: (req, file, cb) =>
    cb(null, ALLOWED_IMAGE_TYPES.test(path.extname(file.originalname))),
})
