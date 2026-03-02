## 📘 HRMS – Full-Stack Human Resource Management System

A **high-performance, scalable Human Resource Management System (HRMS)** designed to streamline employee data management and attendance tracking.

This project demonstrates a **successful architectural migration from Node.js to Python FastAPI**, showcasing adaptability across modern tech stacks and production-grade backend design.

---

## 🛠️ Technical Stack

| Layer      | Technology                   |
| ---------- | ---------------------------- |
| Frontend   | React 18, Vite, Tailwind CSS |
| Backend    | Python 3.10+, FastAPI        |
| Database   | PostgreSQL                   |
| ORM        | SQLAlchemy                   |
| Validation | Pydantic v2                  |

---

## 📁 Project Structure

```plaintext
hrms-lite/
├── frontend/              # React Frontend (Vite)
│   ├── src/
│   │   ├── components/    # Reusable UI elements (Buttons, Modals, Inputs)
│   │   ├── pages/         # Dashboard, Employee List, Attendance View
│   │   ├── hooks/         # Custom hooks for data fetching
│   │   └── services/      # API integration logic (Axios configuration)
│
├── backend/               # FastAPI Backend
│   ├── main.py            # App initialization & Middleware
│   ├── database.py        # SQLAlchemy Session & Engine setup
│   ├── models.py          # PostgreSQL schema definitions
│   └── routers/           # Modular API routes (Employee, Attendance, Dashboard)
│
└── README.md
```

---

## 💻 Local Installation & Setup

### 🎨 Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

🔧 **API Configuration**
Ensure `src/services/api.js` points to:

```js
http://localhost:8000
```

---

### 🔧 Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

📌 **Environment Configuration**

Create a `.env` file:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/hrms_db
```

---

## 📚 API Endpoints Summary

### Dashboard

* `GET /dashboard` – Aggregated HR statistics

### Employees

* `GET /employees`
* `POST /employees`
* `DELETE /employees/{id}`

### Attendance

* `GET /attendance`
* `POST /attendance`
* `GET /attendance/employee/{id}`

---

## ⚠️ Migration & Compatibility Note

* Originally built using **Node.js (Port 5000)**
* Fully migrated to **FastAPI (Port 8000)** to leverage:

  * Asynchronous performance
  * Strong validation with **Pydantic v2**
  * Improved error handling

✅ All frontend services have been updated to communicate with the new Python backend.

---

## 🚀 Final Note

This project reflects my ability to **design, migrate, and deploy production-ready applications** across multiple ecosystems.

Transitioning seamlessly from **JavaScript (Node.js)** to **Python (FastAPI)** while maintaining a **clean, modular, and scalable architecture**.

---

### 👨‍💻 Developed By

**Chirag Vakare**
Full-Stack Developer

---
