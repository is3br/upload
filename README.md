# 🔒 Media Vault

A private media archive: anyone can upload, only you can browse & watch.

- **Frontend**: React (Vite) → deployed to GitHub Pages
- **Backend**: Express + SQLite → runs on your VPS
- **Auth**: JWT-protected admin area
- **Storage**: Files saved directly on VPS disk

---

## Project Structure

```
media-vault/
├── frontend/          ← React app (GitHub Pages)
├── backend/           ← Express API (VPS)
├── nginx.conf.example ← Nginx reverse proxy config
└── .github/
    └── workflows/
        └── deploy.yml ← Auto-deploy frontend on push
```

---

## 1 · VPS Setup (Backend)

### Prerequisites
```bash
# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 (process manager)
sudo npm install -g pm2

# Nginx
sudo apt install nginx
```

### Deploy backend
```bash
# Clone or copy backend files to VPS
mkdir -p /var/www/media-vault/backend
mkdir -p /var/www/media-vault/uploads
mkdir -p /var/log/media-vault

cd /var/www/media-vault/backend
npm install

# Generate your JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Hash your admin password (replace YOUR_PASSWORD)
node -e "const b=require('bcryptjs');console.log(b.hashSync('YOUR_PASSWORD',10))"

# Create .env from example
cp .env.example .env
nano .env   # Fill in JWT_SECRET, ADMIN_PASSWORD_HASH, ALLOWED_ORIGINS
```

### .env file (fill in real values)
```env
PORT=3001
JWT_SECRET=<generated above>
ADMIN_PASSWORD_HASH=<generated above>
ALLOWED_ORIGINS=https://YOUR_GITHUB_USERNAME.github.io
UPLOAD_DIR=/var/www/media-vault/uploads
DB_PATH=/var/www/media-vault/media.db
```

### Start with PM2
```bash
cd /var/www/media-vault/backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # Follow the printed command to auto-start on reboot
```

### Nginx reverse proxy
```bash
sudo cp /var/www/media-vault/backend/../nginx.conf.example \
     /etc/nginx/sites-available/media-vault

# Edit the file — replace YOUR_DOMAIN_OR_VPS_IP
sudo nano /etc/nginx/sites-available/media-vault

sudo ln -s /etc/nginx/sites-available/media-vault \
     /etc/nginx/sites-enabled/

sudo nginx -t && sudo systemctl reload nginx
```

### (Recommended) HTTPS with Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 2 · Frontend Setup (GitHub Pages)

### One-time repo setup
1. Push this repo to GitHub (e.g. `github.com/YOU/media-vault`)
2. Go to **Settings → Pages** → Source: **GitHub Actions**
3. Go to **Settings → Secrets → Actions** → add:
   - `VITE_API_URL` = `https://yourdomain.com` (or `http://VPS_IP:3001`)

### vite.config.js — set your repo name
```js
const REPO_NAME = "media-vault"; // ← change to match your GitHub repo name
```

### Deploy
Push to `main` — GitHub Actions builds and deploys automatically.

Or deploy manually:
```bash
cd frontend
npm install
VITE_API_URL=https://yourdomain.com npm run deploy
```

---

## 3 · Usage

| URL | Who | What |
|-----|-----|------|
| `https://you.github.io/media-vault/` | Anyone | Upload videos/images (max 200 MB) |
| `https://you.github.io/media-vault/login` | You | Enter admin password |
| `https://you.github.io/media-vault/admin` | You (logged in) | Browse, search, watch, edit, delete |

---

## 4 · Changing your admin password

```bash
node -e "const b=require('bcryptjs');console.log(b.hashSync('NEW_PASSWORD',10))"
```

Paste the hash into `.env` as `ADMIN_PASSWORD_HASH`, then restart:
```bash
pm2 restart media-vault
```

---

## 5 · Disk & backups

- Uploads are in `UPLOAD_DIR` (default `/var/www/media-vault/uploads/`)
- Database is a single SQLite file at `DB_PATH`
- To backup: copy both to a safe location regularly

```bash
# Simple backup script
tar czf ~/backup-$(date +%Y%m%d).tar.gz \
  /var/www/media-vault/uploads \
  /var/www/media-vault/media.db
```

---

## Security notes

- The JWT token is stored in `localStorage`; it expires in 7 days
- All media streaming requires a valid token — unauthenticated users cannot access files
- The token is passed as a query param for `<video src>` compatibility; this is standard practice
- Use HTTPS on your VPS to encrypt everything in transit
