# Puente App - Developer Documentation

## Quick Start

```bash
# Local development
cd puente-html-version/server
npm install
npm run start:dev    # Uses nodemon for hot reload
# Visit http://localhost:3001/public/index.html
```

## Architecture Overview

```
puente-html-version/
├── public/              # Frontend (static HTML + vanilla JS)
│   ├── index.html       # Login page
│   ├── student-dashboard.html
│   ├── dashboard-vendor.html
│   ├── dashboard-moto.html
│   ├── admin.html
│   └── *.js             # Client-side scripts
├── server/              # Backend (Express.js)
│   ├── server.js        # Main server (~900 lines, all routes)
│   ├── data/            # JSON file storage (acts as database)
│   │   ├── users.json
│   │   ├── lessons.json
│   │   ├── progress.json
│   │   ├── attempts.json
│   │   └── uploads/     # User uploaded files
│   └── package.json
├── package.json         # Root package.json (for Railway)
└── railway.json         # Railway deployment config
```

## How It Works

### Frontend
- **Static HTML files** served by Express
- **Vanilla JavaScript** (no React/Vue/Angular)
- **Tailwind CSS** via CDN
- **Firebase** (optional) for bookmark sync only

### Backend
- **Express.js** server handling all API routes
- **JSON files** for data persistence (no database)
- **File uploads** stored locally in `data/uploads/`
- **Custom auth** with tokens stored in `users.json`

### Why This Architecture?
1. **Simple** - No build step, no framework complexity
2. **Portable** - Works anywhere Node.js runs
3. **Self-contained** - No external database needed
4. **Easy to understand** - One server file, plain HTML

## Key API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/login` | Authenticate user |
| POST | `/api/register` | Create new user |
| GET | `/api/lessons` | List all lessons |
| GET | `/api/lesson/:id/week/:week` | Get week content |
| POST | `/api/progress` | Save user progress |
| POST | `/api/attempts` | Record quiz attempt |
| GET | `/api/settings` | Get pass threshold |
| POST | `/api/profile/photo` | Upload profile picture |

## Deployment (Railway)

### Why Railway?
- ✅ **Persistent filesystem** - JSON files persist between deploys
- ✅ **Simple deployment** - Push to GitHub, auto-deploys
- ✅ **Free tier** - Good for demos/small projects
- ❌ **Not Vercel** - Vercel is serverless (no filesystem persistence)
- ❌ **Not Heroku** - Ephemeral filesystem (data would be lost)

### Deploy Steps
1. Push to GitHub: `git push origin main`
2. Railway auto-deploys from `puente-html-version/` folder
3. Domain: `https://graceful-rebirth-production.up.railway.app`

### Configuration Files
- `railway.json` - Build & start commands
- `package.json` (root) - Tells Railway it's a Node project
- `.railwayignore` - Excludes node_modules from upload

### Environment Variables
**None required!** App works fully standalone. Optional:
- `PORT` - Auto-set by Railway
- `__firebase_config` - Only for cloud bookmark sync

## User Roles

| Role | Dashboard | Capabilities |
|------|-----------|--------------|
| Student | student-dashboard.html | Choose vendor/moto track |
| Vendor | dashboard-vendor.html | Market English/French lessons |
| Moto | dashboard-moto.html | Motorcyclist language lessons |
| Admin | admin.html | Manage settings, view progress |
| Contributor | dashboard-contributor.html | Upload resources |

## Data Storage

All data lives in `server/data/`:
- `users.json` - User accounts, passwords (hashed), tokens
- `lessons.json` - Course content, weeks, exercises
- `progress.json` - User progress per lesson/week
- `attempts.json` - Quiz attempt history
- `settings.json` - Pass thresholds
- `resources.json` - Uploaded learning materials

## Common Tasks

### Add a new lesson
Edit `server/data/lessons.json` - follow existing structure

### Change pass threshold
Admin UI or edit `server/data/settings.json`

### Reset user data
Delete relevant entries from JSON files in `server/data/`

### View logs on Railway
```bash
railway logs
```

## Limitations & Future Improvements

1. **JSON files don't scale** - Consider PostgreSQL for production
2. **No real-time sync** - Could add WebSockets
3. **Single server** - No horizontal scaling
4. **Custom auth** - Could migrate to Auth0/Clerk

## Troubleshooting

### "Cannot GET /"
Server started from wrong directory. Ensure running from `puente-html-version/`

### Port already in use
```bash
# Find process
netstat -ano | findstr :3001
# Kill it
taskkill /F /PID <pid>
```

### Railway deploy fails
1. Check `.railwayignore` excludes `node_modules`
2. Try GitHub deploy instead of CLI upload
3. Check Railway dashboard for build logs

---

**Live URL**: https://graceful-rebirth-production.up.railway.app/public/index.html

**Railway Dashboard**: https://railway.com/project/de3bbb4e-240a-4ea6-bb54-615a8a8a3ba7
