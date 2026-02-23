# 📊 Distributor Portal

A full-stack web application with role-based access for managing distributor monthly reports.

## 🏗️ Architecture

- **Frontend**: React (single JSX file, no build step needed with Vite/CRA)  
- **Backend**: Node.js + Express  
- **Database**: MongoDB  
- **Email**: Nodemailer (SMTP)

---

## 🚀 Quick Setup

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your real values:
```
MONGODB_URI=mongodb://localhost:27017/distributor-portal
JWT_SECRET=your-strong-secret-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-gmail-app-password        # NOT your real password
ADMIN_EMAIL=admin@yourcompany.com
FRONTEND_URL=http://localhost:3000
```

> For Gmail, generate an **App Password** at https://myaccount.google.com/apppasswords

Start the server:
```bash
npm run dev       # development (with nodemon)
npm start         # production
```

Server runs on **http://localhost:5000**

---

### 2. Default Admin Credentials

On first run, the system auto-creates an admin:
- **Email**: value of `ADMIN_EMAIL` in .env (or `admin@portal.com`)
- **Password**: `Admin@123`
- ⚠️ Change this immediately after first login!

---

### 3. Frontend Setup

**Option A: Use with Create React App**
```bash
npx create-react-app distributor-frontend
cd distributor-frontend
cp path/to/DistributorPortal.jsx src/App.jsx
npm install xlsx
npm start
```

**Option B: Use with Vite**
```bash
npm create vite@latest distributor-frontend -- --template react
cd distributor-frontend
npm install
cp path/to/DistributorPortal.jsx src/App.jsx
# In src/main.jsx, import App from './App'
npm install xlsx
npm run dev
```

Frontend runs on **http://localhost:3000** (or 5173 for Vite)

> If using Vite (port 5173), update `FRONTEND_URL` in backend `.env` and update `API_BASE` at top of the JSX file.

---

## 📁 Backend File Structure

```
backend/
├── src/
│   ├── server.js              # Entry point
│   ├── models/
│   │   ├── User.js            # Admin & Distributor model
│   │   └── Report.js          # Report model
│   ├── routes/
│   │   ├── auth.js            # Login, /me, change-password
│   │   ├── distributors.js    # CRUD for distributors (admin only)
│   │   └── reports.js         # Upload, view, edit, export reports
│   ├── middleware/
│   │   └── auth.js            # JWT auth + admin guard
│   └── utils/
│       ├── email.js           # Nodemailer email templates
│       └── seedAdmin.js       # Auto-create default admin
├── uploads/                   # Uploaded Excel files (auto-created)
├── .env.example
└── package.json
```

---

## 🔑 API Endpoints

### Auth
| Method | Path | Access |
|--------|------|--------|
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Authenticated |
| PUT | `/api/auth/change-password` | Authenticated |

### Distributors
| Method | Path | Access |
|--------|------|--------|
| GET | `/api/distributors` | Admin |
| POST | `/api/distributors` | Admin |
| PUT | `/api/distributors/:id` | Admin |
| DELETE | `/api/distributors/:id` | Admin |
| POST | `/api/distributors/:id/reset-password` | Admin |

### Reports
| Method | Path | Access |
|--------|------|--------|
| POST | `/api/reports/upload` | Distributor |
| GET | `/api/reports` | Admin (all) / Distributor (own) |
| GET | `/api/reports/:id` | Owner or Admin |
| PUT | `/api/reports/:id` | Owner or Admin |
| DELETE | `/api/reports/:id` | Owner or Admin |
| GET | `/api/reports/:id/export` | Owner or Admin |

---

## ✨ Features

### Admin
- ✅ View all distributors
- ✅ Create distributor accounts (auto-generate & email credentials)
- ✅ Activate/deactivate accounts
- ✅ Reset distributor passwords
- ✅ View all reports from all distributors
- ✅ View reports in editable table format
- ✅ Change report status (Pending / Reviewed / Approved)
- ✅ Export any report as Excel
- ✅ Receive email notifications on report upload

### Distributor
- ✅ Login with emailed credentials
- ✅ Upload monthly reports (Excel: .xlsx, .xls, .csv)
- ✅ View own reports in editable table
- ✅ Add/edit/delete rows inline
- ✅ Export reports as Excel
- ✅ Change password

---

## 📧 Email Configuration

The system sends two types of emails:

1. **Credentials Email** — When admin creates a distributor, their login credentials are automatically emailed.
2. **Upload Notification** — When a distributor uploads a report, the admin receives an email notification.

If email delivery fails (e.g. wrong SMTP config), the system still works — it returns the temporary password in the API response so the admin can share it manually.

---

## 🔐 Security Notes

- Passwords are hashed with bcrypt (12 rounds)
- JWT tokens expire in 7 days
- File uploads are limited to 10MB
- Only .xlsx, .xls, .csv files accepted
- Role-based middleware on all protected routes
