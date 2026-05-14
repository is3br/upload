const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const Database = require("better-sqlite3");

// ─── Config ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-in-production-please";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync("admin1234", 10);
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "uploads");
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "media.db");
// Allowed frontend origins (GitHub Pages + localhost dev)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:3000").split(",");

// ─── Setup ─────────────────────────────────────────────────────────────────
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    original_name TEXT NOT NULL,
    filename TEXT NOT NULL,
    mimetype TEXT NOT NULL,
    size INTEGER NOT NULL,
    description TEXT,
    uploader_note TEXT,
    upload_date TEXT NOT NULL,
    type TEXT NOT NULL
  );
`);

const app = express();

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.some(o => origin.startsWith(o.trim()))) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json());

// Serve uploaded files statically (only admin can view via signed URL trick, but we gate at API level)
app.use("/files", express.static(UPLOAD_DIR));

// ─── Multer ────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
  fileFilter: (req, file, cb) => {
    const allowed = /video\/(mp4|webm|ogg|quicktime|x-msvideo|x-matroska)|image\/(jpeg|png|gif|webp)/;
    if (allowed.test(file.mimetype)) return cb(null, true);
    cb(new Error("Only video and image files are allowed"));
  },
});

// ─── Auth middleware ───────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    if (payload.role !== "admin") throw new Error();
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ─── Routes ────────────────────────────────────────────────────────────────

// Health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Admin login
app.post("/api/auth/login", async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password required" });
  const ok = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if (!ok) return res.status(401).json({ error: "Wrong password" });
  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token });
});

// Public upload — anyone can upload
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file provided" });
  const { description } = req.body;
  const id = uuidv4();
  const type = req.file.mimetype.startsWith("video") ? "video" : "image";
  db.prepare(`
    INSERT INTO media (id, original_name, filename, mimetype, size, description, upload_date, type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, description || "", new Date().toISOString(), type);
  res.json({ success: true, id });
});

// Admin — list all media (paginated)
app.get("/api/admin/media", requireAdmin, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const q = req.query.q || "";
  const offset = (page - 1) * limit;
  const search = `%${q}%`;
  const rows = db.prepare(`
    SELECT * FROM media WHERE description LIKE ? OR original_name LIKE ?
    ORDER BY upload_date DESC LIMIT ? OFFSET ?
  `).all(search, search, limit, offset);
  const total = db.prepare(`
    SELECT COUNT(*) as c FROM media WHERE description LIKE ? OR original_name LIKE ?
  `).get(search, search).c;
  res.json({ items: rows, total, page, pages: Math.ceil(total / limit) });
});

// Admin — get single media item
app.get("/api/admin/media/:id", requireAdmin, (req, res) => {
  const row = db.prepare("SELECT * FROM media WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

// Admin — update description
app.patch("/api/admin/media/:id", requireAdmin, (req, res) => {
  const { description } = req.body;
  const result = db.prepare("UPDATE media SET description = ? WHERE id = ?").run(description, req.params.id);
  if (!result.changes) return res.status(404).json({ error: "Not found" });
  res.json({ success: true });
});

// Admin — delete media
app.delete("/api/admin/media/:id", requireAdmin, (req, res) => {
  const row = db.prepare("SELECT * FROM media WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  const filePath = path.join(UPLOAD_DIR, row.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.prepare("DELETE FROM media WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Admin — stream a file (with token auth via query param for video src tags)
app.get("/api/admin/stream/:filename", (req, res) => {
  // Token can come from header OR query string (for <video src>)
  const token = req.query.token || (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== "admin") throw new Error();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const filename = path.basename(req.params.filename); // prevent path traversal
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "video/mp4",
    });
    file.pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

// ─── Error handler ─────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.message);
  if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "File too large (max 200MB)" });
  res.status(500).json({ error: err.message || "Server error" });
});

app.listen(PORT, () => console.log(`✅ Media Vault backend running on port ${PORT}`));
