# Hems Transport Services — Transit OS (WS102 & CC106)

A decoupled, offline-capable Progressive Web App (PWA) for provincial bus reservations and Ro-Ro transit dispatch between Metro Manila (PITX & Buendia) and Mindoro (Calapan & Abra de Ilog ports).

---

## Live Production URLs

| Service | Host | URL |
| :--- | :--- | :--- |
| **Frontend (PWA / HTTPS)** | Netlify | https://dancing-llama-b209c2.netlify.app |
| **Backend REST API Health** | Render | https://hems-transport.onrender.com/api/health |
| **Cloud MySQL Cluster** | TiDB Cloud | `gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000` (`hems_transport`) |
| **GitHub Repository** | GitHub | https://github.com/Hems1217/Hems-transport |

---

## 1. System Architecture & Full CRUD

* **Frontend (`src/`)**: React 19 (functional components & hooks), Bootstrap 5.3 + Bootstrap Icons, React Router v7.
* **Backend (`server/index.js`)**: Node.js + Express 5 REST API with `cors`, `express.json()`, `multer` upload handling, `bcryptjs`, and transactional MySQL queries (`mysql2/promise`).
* **Database (`database/hems_transport.sql`, `server/ensureSchedules.js`)**: Normalized MySQL schema (`users`, `municipalities`, `terminals`, `routes`, `drivers`, `buses`, `schedules`, `bookings`, `payments`) running locally in XAMPP during development and hosted on TiDB Cloud over TLS in production.
* **CRUD API Coverage**:
  * **Create (`POST`)**: `/api/bookings` (transactional seat deduction, fare/discount computation, payment & Base64 receipt proof creation), `/api/register-profile`.
  * **Read (`GET`)**: `/api/health`, `/api/terminals`, `/api/routes`, `/api/schedules`, `/api/bookings/mine`, `/api/bookings/receipt`, `/api/verify`, `/api/admin/dashboard`, `/api/admin/bookings`, `/api/admin/payments`, `/api/admin/users`, `/api/admin/schedules`.
  * **Update (`PATCH`)**: `/api/admin/bookings/:id` (`CONFIRMED` / `COMPLETED` / `CANCELLED`), `/api/admin/payments/:id` (`PAID` / `FAILED`).
  * **Delete (`DELETE`)**: `/api/admin/bookings/:id` (releases reserved seat, deletes associated payment record, deletes booking row).

---

## 2. Progressive Web App (PWA) & Service Worker

* **Web App Manifest (`public/manifest.json`, `public/manifest.webmanifest`)**: Configured with `name`, `short_name`, `start_url: "/"`, `display: "standalone"`, `#090d16` background color, `#0284c7` theme color, and separate `192x192` and `512x512` `"any"` and `"maskable"` PNG icons (`public/icons-192.png`, `public/icons-512.png`). Registered in `index.html` and `src/main.jsx` (`registerSW()` in `src/api.js`).
* **Service Worker (`public/sw.js`)**:
  * **Cache-First (App Shell)**: Serves pre-cached HTML, bundles, styles, and icons from Cache Storage for instant startup and offline rendering.
  * **Network-First (Dynamic Express API GET)**: Intercepts `/api/municipalities`, `/api/routes`, `/api/terminals`, and `/api/schedules`, caching live JSON responses when online and falling back to cached transport data (or structured offline JSON) when disconnected.
* **Offline UI Notification (`src/components/OfflineIndicator.jsx`)**: Listens to browser `online` / `offline` events and renders a persistent warning banner across passenger and admin views whenever connectivity drops.

---

## 3. Firebase Authentication & Role-Based Access Control (RBAC)

* **Google OAuth 2.0 & Email Auth (`src/firebase.js`, `src/pages/Login.jsx`, `src/AuthContext.jsx`)**: Primary login via Google Sign-In (`signInWithPopup(auth, googleProvider)`) alongside Firebase email/password login and offline Firestore persistence (`persistentLocalCache`).
* **Two-Role RBAC (`admin` / `user`)**:
  * Firestore (`users` collection) is the single source of truth via `resolveFirestoreRole()` in `src/AuthContext.jsx` (checks `users/{uid}`, `users/{email}`, and email field query).
  * **Frontend Enforcement**: `src/App.jsx` (`UserRoute`, `CustomerRoute`, `AdminRoute`) and `src/components/Navbar.jsx` restrict navigation links and views strictly by role.
  * **Backend Middleware Verification (`server/index.js`, `server/firebaseToken.js`, `server/firestoreAdmin.js`)**: Every protected request carries `Authorization: Bearer <Firebase ID Token>`. Express verifies the JWT signature and claims against Google's official Firebase X.509 signing keys (`RS256`, `aud`, `iss`, `exp`) in `firebaseToken.js`, resolves the user's Firestore role in `firestoreAdmin.js`, and enforces `adminAuth` (returning HTTP `401`/`403`) before privileged database operations.

---

## 4. Client-Side Routing (`react-router-dom`)

Defined in `src/App.jsx`:
* `/` — Public Landing & Route Explorer (`Home.jsx`)
* `/login`, `/register` — Authentication Views (`Login.jsx`, `Register.jsx`)
* `/booking` — Stepper Trip Reservation & CRUD Create (`Booking.jsx`, wrapped in `CustomerRoute`)
* `/bookings` — Passenger Trip History (`Bookings.jsx`, wrapped in `CustomerRoute`)
* `/profile` — Passenger Profile & RBAC Identity (`Profile.jsx`, wrapped in `CustomerRoute`)
* `/receipt`, `/verify` — Boarding Pass Receipt & QR Verification (`Receipt.jsx`, `Verify.jsx`)
* `/admin` — Admin Operations & CRUD Management Console (`AdminDashboard.jsx`, wrapped in `AdminRoute`)
* `/access-denied` — 403 Unauthorized Role Screen (`AccessDenied.jsx`)
* `*` — Custom 404 Not Found Page (`NotFound.jsx`)

---

## 5. Cloud Deployment & Environment Security

* **Netlify**: Connected to GitHub (`npm run build` → `dist/`). Uses `netlify.toml` and `public/_redirects` to proxy `/api/*` and `/uploads/*` directly to Render and rewrite React Router sub-paths (`/* /index.html 200`) to prevent 404 errors on refresh. Both `localhost` and `dancing-llama-b209c2.netlify.app` are registered under Firebase Authorized Domains.
* **Render**: Node/Express Web Service (`npm start` → `node server/index.js`) with secrets managed strictly via Render Environment Variables (`PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL=true`, `SESSION_SECRET`). `.gitignore` excludes `node_modules/`, `.env`, `.env.*`, and service-account keys.

### Local Setup

```bash
npm install
cp .env.example .env   # Configure local MySQL credentials
npm run dev            # Runs Express backend (:3001) + Vite dev server (:5173)
```

---

## 6. AI Usage & Academic Integrity Disclosure

* **AI Tools Used**: AI coding assistant (Google Antigravity / Gemini) was used as a development, debugging, and documentation aid inside the local IDE.
* **Purposes & Prompts**:
  * Modernizing UI responsiveness with Bootstrap 5 glassmorphism (`src/styles.css`, React pages).
  * Implementing PWA Service Worker strategies (`public/sw.js`) and manifest validation (`public/manifest.json`).
  * Troubleshooting production issues during deployment: TiDB Cloud TLS connection flags, dynamic 90-day schedule seeding (`server/ensureSchedules.js`), Netlify-to-Render `/api/*` rewrite rules (`netlify.toml`), Firestore role synchronization (`src/AuthContext.jsx`, `server/firestoreAdmin.js`), and UI event bugs (`AdminDashboard.jsx` receipt preview modal).
* **Verification, Testing & Ownership**:
  * All AI-assisted edits were inspected line by line against course rubric requirements, compiled locally with `npm run build` and `node -c`, verified against TiDB Cloud SQL data migrations, and manually tested across Google OAuth login, passenger booking submission, and Admin CRUD workflows on live Netlify and Render deployments.
