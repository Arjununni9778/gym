# FITZONE – Premium Gym Website

A modern, high-performance web platform for **FITZONE Premium Gym**, built with HTML5, CSS3, JavaScript (ES Modules), Firebase Authentication, and Cloud Firestore.

## 🚀 Features

- **High-Performance UI/UX:** Sleek dark athletic theme with cyber electric yellow accents (#ffcc00).
- **Firebase Authentication:**
  - Secure Member Registration & Sign In.
  - Session persistence & Password visibility toggles.
  - Forgot password / reset email dispatch.
- **Member Dashboard:**
  - Live profile stats (Total, Pending, Approved, Rejected sessions).
  - Membership pass & real-time booking history with status badges.
- **Admin Operations Portal:**
  - Protected admin access for gym staff (`arjununnikrishnan9778@gmail.com`).
  - Real-time review, approval, rejection, and deletion of incoming membership bookings.
- **Gym Booking & Enquiry:**
  - Integrated with Cloud Firestore.
  - Auto-prefill for authenticated members.
- **Production Ready:**
  - Configured for Firebase Hosting (`firebase.json`, `.firebaserc`, `firestore.rules`).
  - Fully responsive on mobile, tablet, and desktop.

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML5, CSS3, Modern JavaScript (ES Modules)
- **Backend / Services:** Firebase Authentication, Cloud Firestore, Firebase Hosting
- **Dev Server:** Node.js static server (`serve.js`)

## 💻 Local Development

Run the lightweight local dev server:

```bash
npm start
# or
node serve.js
```

Then visit:
- **Homepage:** `http://localhost:3000/`
- **Member Login:** `http://localhost:3000/login.html`
- **Member Signup:** `http://localhost:3000/signup.html`
- **Member Dashboard:** `http://localhost:3000/dashboard.html`
- **Admin Portal:** `http://localhost:3000/admin.html`

