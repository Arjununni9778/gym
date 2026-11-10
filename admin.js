
import { auth, db } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    collection,
    getDocs,
    doc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ADMIN_EMAIL = "arjununnikrishnan9778@gmail.com";

const loginBox = document.getElementById("loginBox");
const dashboard = document.getElementById("dashboard");
const loginMessage = document.getElementById("loginMessage");
const bookingTable = document.getElementById("bookingTable");
const registerBtn = document.getElementById("registerBtn");
const forgotBtn = document.getElementById("forgotBtn");

function formatAuthError(error) {
    if (error.code === "auth/invalid-credential") {
        return "Incorrect password, or this admin account hasn't been created yet. Click 'First Time? Create Admin Account' below.";
    }
    if (error.code === "auth/email-already-in-use") {
        return "This admin account already exists. Please enter your password and click LOGIN, or use 'Forgot Password'.";
    }
    if (error.code === "auth/weak-password") {
        return "Password is too weak. Please use at least 6 characters.";
    }
    if (error.code === "auth/operation-not-allowed") {
        return "Email/Password sign-in is disabled in Firebase. Enable it in Firebase Console > Authentication > Sign-in method.";
    }
    if (error.code === "auth/too-many-requests") {
        return "Access temporarily blocked due to many failed attempts. Try again in a few minutes or reset your password.";
    }
    return error.message;
}

// ADMIN LOGIN
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    loginMessage.style.color = "#aaa";
    loginMessage.textContent = "Checking login...";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
        if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
            throw new Error("Unauthorized admin email.");
        }

        await signInWithEmailAndPassword(auth, email, password);

    } catch (error) {
        console.error("Login error:", error);
        loginMessage.style.color = "#ff5555";
        loginMessage.textContent = formatAuthError(error);
    }
});

// FIRST-TIME ADMIN CREATION
if (registerBtn) {
    registerBtn.addEventListener("click", async () => {
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        if (!password || password.length < 6) {
            loginMessage.style.color = "#ff5555";
            loginMessage.textContent = "Please enter a password with at least 6 characters.";
            return;
        }

        if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
            loginMessage.style.color = "#ff5555";
            loginMessage.textContent = "Only the designated admin email (" + ADMIN_EMAIL + ") can be registered.";
            return;
        }

        loginMessage.style.color = "#aaa";
        loginMessage.textContent = "Creating admin account...";

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            loginMessage.style.color = "#4caf50";
            loginMessage.textContent = "Admin account created successfully! Logging you in...";
        } catch (error) {
            console.error("Registration error:", error);
            loginMessage.style.color = "#ff5555";
            loginMessage.textContent = formatAuthError(error);
        }
    });
}

// FORGOT PASSWORD
if (forgotBtn) {
    forgotBtn.addEventListener("click", async () => {
        const email = document.getElementById("email").value.trim();
        if (!email) {
            loginMessage.style.color = "#ff5555";
            loginMessage.textContent = "Please enter your admin email first.";
            return;
        }

        loginMessage.style.color = "#aaa";
        loginMessage.textContent = "Sending password reset email...";

        try {
            await sendPasswordResetEmail(auth, email);
            loginMessage.style.color = "#4caf50";
            loginMessage.textContent = "Password reset email sent! Check your inbox (and spam folder).";
        } catch (error) {
            console.error("Reset error:", error);
            loginMessage.style.color = "#ff5555";
            loginMessage.textContent = formatAuthError(error);
        }
    });
}

// CHECK LOGIN
onAuthStateChanged(auth, async (user) => {
    if (user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        loginBox.classList.add("hidden");
        dashboard.classList.remove("hidden");
        await loadBookings();
    } else {
        loginBox.classList.remove("hidden");
        dashboard.classList.add("hidden");

        if (user && user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
            loginMessage.style.color = "#ffcc00";
            loginMessage.innerHTML = `You are signed in as a Member (<strong>${escapeAdminHtml(user.email)}</strong>). This dashboard is strictly for Gym Staff & Administrators.<br><a href="dashboard.html" style="color:var(--yellow);text-decoration:underline;display:inline-block;margin-top:8px;">← Go to Member Dashboard</a>`;
        }
    }
});

// LOAD BOOKINGS
async function loadBookings() {
    bookingTable.innerHTML = "<tr><td colspan='8' class='table-msg'>Loading bookings...</td></tr>";

    try {
        const snapshot = await getDocs(collection(db, "booking"));

        bookingTable.innerHTML = "";

        let total = 0;
        let pending = 0;
        let approved = 0;
        let rejected = 0;

        if (snapshot.empty) {
            bookingTable.innerHTML =
                "<tr><td colspan='8' class='table-msg'>No bookings found.</td></tr>";
            document.getElementById("totalCount").textContent = "0";
            document.getElementById("pendingCount").textContent = "0";
            document.getElementById("approvedCount").textContent = "0";
            document.getElementById("rejectedCount").textContent = "0";
            return;
        }

        const bookings = [];
        snapshot.forEach((bookingDoc) => {
            bookings.push({
                id: bookingDoc.id,
                ...bookingDoc.data()
            });
        });

        // Sort newest first
        bookings.sort((a, b) => {
            const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return tB - tA;
        });

        bookings.forEach((b) => {
            const status = (b.status || "pending").toLowerCase();
            total++;
            if (status === "pending") pending++;
            else if (status === "approved") approved++;
            else if (status === "rejected") rejected++;

            let dateStr = "Recent";
            if (b.createdAt && b.createdAt.toDate) {
                dateStr = b.createdAt.toDate().toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                });
            }

            const row = document.createElement("tr");
            row.innerHTML = `
                <td><strong>${escapeAdminHtml(b.name || "-")}</strong></td>
                <td><span style="color:#aaa;">${escapeAdminHtml(b.email || "Guest")}</span></td>
                <td>${escapeAdminHtml(b.phone || "-")}</td>
                <td><span class="badge badge-role">${escapeAdminHtml(b.membership || "-")}</span></td>
                <td>${escapeAdminHtml(dateStr)}</td>
                <td><small style="color:#999;">${escapeAdminHtml(b.message || "None")}</small></td>
                <td><span class="badge badge-${status}">${status.toUpperCase()}</span></td>
                <td style="white-space: nowrap;">
                    <button class="action approve" title="Approve Booking">✓ Approve</button>
                    <button class="action reject" title="Reject Booking">✕ Reject</button>
                    <button class="action delete" title="Delete Booking">🗑</button>
                </td>
            `;

            const [approveBtn, rejectBtn, deleteBtn] = row.querySelectorAll("button");
            approveBtn.onclick = () => changeStatus(b.id, "approved");
            rejectBtn.onclick = () => changeStatus(b.id, "rejected");
            deleteBtn.onclick = () => removeBooking(b.id);

            bookingTable.appendChild(row);
        });

        document.getElementById("totalCount").textContent = total;
        document.getElementById("pendingCount").textContent = pending;
        document.getElementById("approvedCount").textContent = approved;
        document.getElementById("rejectedCount").textContent = rejected;

    } catch (error) {
        console.error("Booking loading error:", error);
        bookingTable.innerHTML =
            "<tr><td colspan='8' class='table-msg error-msg'>Unable to load bookings. Check Firestore Security Rules.</td></tr>";
    }
}

function escapeAdminHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// APPROVE / REJECT
async function changeStatus(id, status) {
    try {
        await updateDoc(doc(db, "booking", id), { status });
        alert("Booking " + status + " successfully!");
        await loadBookings();
    } catch (error) {
        console.error(error);
        alert("Update failed: " + error.message);
    }
}

// DELETE
async function removeBooking(id) {
    if (!confirm("Delete this booking?")) return;

    try {
        await deleteDoc(doc(db, "booking", id));
        alert("Booking deleted!");
        await loadBookings();
    } catch (error) {
        console.error(error);
        alert("Delete failed: " + error.message);
    }
}

// LOGOUT
document.getElementById("logoutBtn").addEventListener("click", async () => {
    await signOut(auth);
});
