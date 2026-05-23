# StaySphere 🏨
> **Hostel Management System**
>
> A premium, full-stack, state-of-the-art web application designed to streamline and automate hostel administration, room allocation, mess management, and attendee tracking for Students, Faculty, Admin, and Authority roles.

---

## 🌟 Key Features

### 👤 Student Dashboard
* **Real-time Status**: Overview of attendance, mess cuts, and active room allocations.
* **Home Going / Outgoing Requests**: Quick and intuitive departure or return check-ins.
* **Mess Cuts**: Submit mess-cut requests with automated validations.
* **Monthly Stats**: Sleek dashboards filtered strictly to the current month's records.

### 👩‍🏫 Faculty Dashboard
* **Mess Cut Auto-Approvals**: Automated checks and verification for instant request approvals.
* **Home-Going Operations**: Modern inline notification banners (success/error states) when marking departure/return records.
* **Monthly Activity Cards**: Visualize current month stats for hostel operations.

### 👑 Authority Dashboard
* **Smart Room Auto-Allocation**:
  * Prioritizes filling partially occupied rooms first to maximize space efficiency.
  * Easy-to-use dropdown menus organized by **Floor** instead of arbitrary Case designations.
  * Standard layout containing structural topbar, sidebar, and "Back to Dashboard" navigation.
* **Mess Bill Calculation**:
  * Interactive stage-by-stage calculations.
  * Editable previous month leftover stock for accounting flexibility.
  * Multi-step process finalized with a beautiful green "Finish" button.

### 🛡️ Admin Dashboard
* **User Management**: Bulk add or edit users using robust Excel templates.
* **Direct Template Download**: Prompt-bypass for seamless direct downloading of formatting layouts.

---

## 🛠️ Technology Stack

* **Frontend**: Angular (v16+) with Vanilla CSS (harmonics, HSL palettes, glassmorphism, dynamic transitions, modern layouts).
* **Backend**: Node.js & Express with JWT (JSON Web Tokens) authentication and robust password hashing.
* **Database**: MongoDB (Mongoose ODM) with schemas for Users, Rooms, Attendance, Mess Cuts, and Stock.
* **Deployment & Environments**: Docker / Render configurations ready, standard cross-platform Node.js scripts.

---

## 📁 Repository Structure

```text
miniproject-1/
├── backend/                  # Express REST API Backend
│   ├── config/               # Database connection configurations
│   ├── controllers/          # Business logic handlers
│   ├── middleware/           # Auth and validation middlewares
│   ├── models/               # Mongoose DB schemas
│   ├── routes/               # Express API endpoints
│   ├── uploads/              # Media and PDF letter uploads (.gitkeep maintained)
│   ├── utils/                # Helper utilities (email senders, password generators)
│   └── server.js             # Main server entrypoint
│
├── docs/                     # Project diagrams and assets
│   ├── er-diagram.mmd        # Entity-Relationship diagram source (Mermaid)
│   ├── er-diagram.svg        # Scalable Vector Graphics ER visualization
│   ├── er-diagram.png        # Portable Network Graphic ER visualization
│   └── class-diagram.mmd     # Class diagram source (Mermaid)
│
├── frontend/                 # Angular Frontend
│   ├── src/
│   │   ├── web/              # Core modules, routing, and guards
│   │   │   ├── components/   # Reusable UI components
│   │   │   ├── pages/        # Role-based screens (Student, Faculty, Admin, Authority)
│   │   │   └── services/     # Angular HTTP services
│   │   ├── index.html        # Main HTML entry
│   │   ├── main.ts           # Application bootstrapper
│   │   └── styles.css        # Premium central design system stylesheet
│   └── angular.json          # Angular CLI configurations
│
├── package.json              # Main project scripts
├── render.yaml               # Cloud deployment configuration
└── README.md                 # Project documentation (this file)
```

---

## 🚀 Setup & Installation

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+ recommended)
* [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) or a local running MongoDB instance.

### 1. Root Installation
From the root folder, run:
```bash
npm run install:all
```
This automatically triggers `npm install` inside both `backend/` and `frontend/` directories.

### 2. Environment Variables Configuration
Create a `.env` file inside the `backend/` directory:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/staysphere
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
EMAIL_USER=your_system_email@gmail.com
EMAIL_PASS=your_email_app_password
FRONTEND_URL=http://localhost:4200
HOSTEL_LAT=9.4265
HOSTEL_LON=76.9246
RETURN_RADIUS=200
```

### 3. Running Locally

#### Run Backend Dev Server
```bash
cd backend
npm run dev
```
The backend server will launch on `http://localhost:5000`.

#### Run Frontend Dev Server
```bash
cd frontend
npm run start
```
The Angular web app will be available on `http://localhost:4200`.

---

## 📦 Building & Production

To compile and package the entire application:
```bash
npm run build
```
This compiles the Angular frontend assets into the `frontend/dist/staysphere-frontend` folder, creates `backend/dist/`, and copies the production-ready assets there, allowing the Node backend to serve the client app statically on Render or any cloud environment.

---

## 📊 Database & Design Documentation
All visual design and database schematics are stored in the [docs](file:///c:/Users/User/Documents/Mini%20Project/miniproject-1/docs) folder:
* **Entity Relationship Diagram**: Check [er-diagram.svg](file:///c:/Users/User/Documents/Mini%20Project/miniproject-1/docs/er-diagram.svg) or [er-diagram.png](file:///c:/Users/User/Documents/Mini%20Project/miniproject-1/docs/er-diagram.png) to explore schemas, field types, and relationships.
* **Class Schematics**: Look through [class-diagram.mmd](file:///c:/Users/User/Documents/Mini%20Project/miniproject-1/docs/class-diagram.mmd) for object boundaries.
