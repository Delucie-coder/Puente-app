# Puente: Bridging the Digital Divide in African Education

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20App-brightgreen)](https://graceful-rebirth-production.up.railway.app/public/index.html)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue)](https://github.com/Delucie-coder/Puente-app)

## 🌉 Project Overview

**Puente** (Spanish for "bridge") is a web-based educational platform designed to provide affordable, localized learning resources to underprivileged African students. The platform targets vendors and motorcyclists who need practical English and French language skills for their daily work interactions.

### Problem Statement

Millions of African students lack access to quality learning materials due to:
- Poverty and infrastructure deficits
- Expensive textbooks and course materials
- Limited digital platforms addressing local needs
- No effective peer-to-peer learning opportunities

### Proposed Solution

Puente provides a free, accessible web platform where users can:
- Access localized language learning content (English/French)
- Learn practical phrases for market and transportation contexts
- Track their learning progress through weekly modules
- Complete interactive quizzes to test comprehension

---

## 🚀 Live Demo

**Public URL:** [https://graceful-rebirth-production.up.railway.app/public/index.html](https://graceful-rebirth-production.up.railway.app/public/index.html)

### Quick Demo Access
The login page includes **Demo Buttons** for quick access:
- **"Demo as Student"** - Auto-fills credentials and logs in as a student
- **"Demo as Admin"** - Auto-fills credentials and logs in as administrator

---

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v16.0.0 or higher)
- npm (comes with Node.js)
- Git

### Step-by-Step Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Delucie-coder/Puente-app.git
   cd Puente-app/puente-html-version
   ```

2. **Install dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run start:dev
   ```

4. **Open in browser**
   ```
   http://localhost:3001/public/index.html
   ```

### That's it! The app is now running locally.

---

## 👥 User Roles & Features

### Student
- **Login/Registration** - Create account and authenticate
- **Role Selection** - Choose between Vendor or Motorcyclist learning track
- **Weekly Lessons** - Access structured content per course
- **Video Content** - Watch educational videos (YouTube integration)
- **Vocabulary Practice** - Learn phrases with translations and phonetics
- **Interactive Quizzes** - MCQ-based assessments after each module
- **Progress Tracking** - View completed lessons and scores

### Administrator
- **Dashboard Analytics** - View user progress and quiz statistics
- **Settings Management** - Configure pass thresholds for assessments
- **Content Management** - Upload module videos and resources
- **User Management** - View registered users and their progress
- **Announcements** - Post updates for all learners

### Contributor
- **Resource Upload** - Add learning materials to the platform
- **Content Tagging** - Categorize resources by subject and level

---

## 📁 Project Structure

```
puente-html-version/
├── public/                    # Frontend files
│   ├── index.html            # Login page (with demo buttons)
│   ├── student-dashboard.html # Student role selection
│   ├── dashboard-vendor.html  # Vendor learning dashboard
│   ├── dashboard-moto.html    # Motorcyclist learning dashboard
│   ├── admin.html            # Admin dashboard
│   ├── lesson.html           # Lesson viewer
│   └── style.css             # Styles
├── server/                   # Backend
│   ├── server.js            # Express.js API server
│   ├── data/                # JSON data storage
│   │   ├── users.json       # User accounts
│   │   ├── lessons.json     # Course content
│   │   ├── progress.json    # User progress
│   │   └── attempts.json    # Quiz attempts
│   └── package.json
├── docs/                    # Documentation
└── README.md               # This file
```

---

## ⚙️ Technical Architecture

| Component | Technology |
|-----------|------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | JSON file-based storage |
| Hosting | Railway (PaaS) |
| Authentication | Custom token-based auth |

### Why This Stack?
- **Simple & Portable** - No complex build tools required
- **Low Bandwidth Friendly** - Minimal dependencies, fast loading
- **Self-Contained** - No external database services needed
- **Easy to Deploy** - Works on any Node.js hosting platform

---

## 🔗 Key Functionalities

| Feature | Status | Description |
|---------|--------|-------------|
| User Registration | ✅ Working | Email/username based signup |
| User Login | ✅ Working | Token-based authentication |
| Role Selection | ✅ Working | Student chooses Vendor/Moto track |
| Weekly Lessons | ✅ Working | Structured curriculum per course |
| Video Playback | ✅ Working | YouTube embedded videos |
| Vocabulary Lists | ✅ Working | Phrases with translations |
| Interactive Quizzes | ✅ Working | MCQ assessments |
| Progress Tracking | ✅ Working | Scores and completion status |
| Admin Dashboard | ✅ Working | Analytics and settings |
| Page Redirections | ✅ Working | Role-based navigation |

---

## 📝 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | User authentication |
| POST | `/api/register` | New user registration |
| GET | `/api/lessons` | List all available lessons |
| GET | `/api/lesson/:id` | Get lesson details |
| GET | `/api/lesson/:id/week/:week` | Get week content |
| POST | `/api/progress` | Save user progress |
| POST | `/api/attempts` | Record quiz attempt |
| GET | `/api/settings` | Get system settings |
| POST | `/api/settings` | Update settings (admin) |

---

## 🌍 Alignment with UN SDG 4

This project directly supports **UN Sustainable Development Goal 4**: *"Ensure inclusive and equitable quality education and promote lifelong learning opportunities for all."*

By providing free, accessible language education to African workers, Puente helps bridge the digital divide and enables economic empowerment through practical skills.

---

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3001
taskkill /F /PID <PID>

# Then restart
npm start
```

### Change Port
```bash
# Windows
set PORT=3002
npm start
```

---

## 📚 Related Documents

- [Developer Documentation](./docs/DEVELOPER.md)

---

## 👨‍💻 Author

**Delucie Rurangwa**  
African Leadership University (ALU)  
Email: d.rurangwa@alustudent.com

---

## 📄 License

This project is developed for educational purposes as part of the ALU Software Engineering curriculum.
