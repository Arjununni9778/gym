// FITZONE - Firebase Authentication & Member Management Logic
import {
    auth,
    db,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    sendEmailVerification,
    sendPasswordResetEmail,
    onAuthStateChanged,
    signOut,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    doc,
    setDoc,
    getDoc,
    collection,
    getDocs,
    query,
    where,
    serverTimestamp
} from "./firebase.js";

// Helper: Translate Firebase error codes to user-friendly messages
export function getFriendlyErrorMessage(error) {
    if (!error) return "An unexpected error occurred.";
    const code = error.code || "";
    switch (code) {
        case "auth/invalid-credential":
            return "Invalid email or password. Please check your credentials and try again.";
        case "auth/user-not-found":
            return "No account found with this email address. Please sign up first.";
        case "auth/wrong-password":
            return "Incorrect password. If you forgot it, use the 'Forgot Password' link.";
        case "auth/email-already-in-use":
            return "This email is already registered. Please log in instead.";
        case "auth/weak-password":
            return "Password is too weak. Please use at least 6 characters.";
        case "auth/invalid-email":
            return "Please enter a valid email address.";
        case "auth/too-many-requests":
            return "Access temporarily blocked due to multiple failed attempts. Please wait or reset your password.";
        case "auth/network-request-failed":
            return "Network connection issue. Please check your internet connection.";
        case "auth/operation-not-allowed":
            return "Email/Password sign-in is disabled in Firebase Console. Please enable it under Authentication > Sign-in method.";
        default:
            return error.message || "Authentication error. Please try again.";
    }
}

// Show/Hide Password Toggle Utility
export function setupPasswordToggle(toggleBtnId, passwordInputId) {
    const toggleBtn = document.getElementById(toggleBtnId);
    const passwordInput = document.getElementById(passwordInputId);

    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener("click", () => {
            const isPassword = passwordInput.getAttribute("type") === "password";
            passwordInput.setAttribute("type", isPassword ? "text" : "password");
            toggleBtn.textContent = isPassword ? "👁️ Hide" : "👁️ Show";
            toggleBtn.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
        });
    }
}

// ==========================================
// 1. LOGIN PAGE LOGIC
// ==========================================
export function initLoginPage() {
    const loginForm = document.getElementById("loginForm");
    const loginMsg = document.getElementById("loginMessage");
    const forgotBtn = document.getElementById("forgotPasswordBtn");
    const submitBtn = document.getElementById("loginSubmitBtn");

    setupPasswordToggle("togglePasswordBtn", "password");

    // Redirect to dashboard if already logged in
    onAuthStateChanged(auth, (user) => {
        if (user) {
            window.location.href = "dashboard.html";
        }
    });

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;
            const rememberMe = document.getElementById("rememberMe")?.checked;

            if (!email || !password) {
                showMessage(loginMsg, "Please enter both email and password.", "error");
                return;
            }

            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = "LOGGING IN...";
                }
                showMessage(loginMsg, "Verifying credentials...", "info");

                // Configure persistence based on "Remember Me"
                const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
                await setPersistence(auth, persistence);

                // Sign in with Firebase Auth
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                showMessage(loginMsg, `Welcome back, ${user.displayName || "Member"}! Redirecting...`, "success");

                setTimeout(() => {
                    window.location.href = "dashboard.html";
                }, 1000);

            } catch (error) {
                console.error("Login failed:", error);
                showMessage(loginMsg, getFriendlyErrorMessage(error), "error");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "LOGIN TO ACCOUNT ↗";
                }
            }
        });
    }

    // Forgot password handler
    if (forgotBtn) {
        forgotBtn.addEventListener("click", async () => {
            const email = document.getElementById("email").value.trim();
            if (!email) {
                showMessage(loginMsg, "Please enter your email above to receive a password reset link.", "error");
                return;
            }

            try {
                showMessage(loginMsg, "Sending password reset email...", "info");
                await sendPasswordResetEmail(auth, email);
                showMessage(loginMsg, `Password reset email sent to ${email}. Check your inbox and spam folder.`, "success");
            } catch (error) {
                console.error("Password reset error:", error);
                showMessage(loginMsg, getFriendlyErrorMessage(error), "error");
            }
        });
    }
}

// ==========================================
// 2. SIGNUP PAGE LOGIC
// ==========================================
export function initSignupPage() {
    const signupForm = document.getElementById("signupForm");
    const signupMsg = document.getElementById("signupMessage");
    const submitBtn = document.getElementById("signupSubmitBtn");

    setupPasswordToggle("togglePasswordBtn", "password");
    setupPasswordToggle("toggleConfirmBtn", "confirmPassword");

    // Redirect to dashboard if already logged in
    onAuthStateChanged(auth, (user) => {
        if (user) {
            window.location.href = "dashboard.html";
        }
    });

    if (signupForm) {
        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const name = document.getElementById("name").value.trim();
            const email = document.getElementById("email").value.trim();
            const phone = document.getElementById("phone").value.trim();
            const password = document.getElementById("password").value;
            const confirmPassword = document.getElementById("confirmPassword").value;

            // Form validation
            if (!name || !email || !phone || !password || !confirmPassword) {
                showMessage(signupMsg, "Please fill out all required fields.", "error");
                return;
            }

            if (password.length < 6) {
                showMessage(signupMsg, "Password must be at least 6 characters long.", "error");
                return;
            }

            if (password !== confirmPassword) {
                showMessage(signupMsg, "Passwords do not match. Please re-enter them.", "error");
                return;
            }

            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = "CREATING ACCOUNT...";
                }
                showMessage(signupMsg, "Registering your FITZONE member account...", "info");

                // 1. Create Firebase Auth user
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // 2. Update user profile display name
                await updateProfile(user, {
                    displayName: name
                });

                // 3. Send email verification
                try {
                    await sendEmailVerification(user);
                } catch (verifyErr) {
                    console.warn("Email verification could not be sent immediately:", verifyErr);
                }

                // 4. Save member record in Firestore `users` collection
                // Strictly enforce 'member' role — security requirement
                await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid,
                    name: name,
                    email: email,
                    phone: phone,
                    role: "member",
                    createdAt: serverTimestamp()
                });

                showMessage(
                    signupMsg,
                    "Account created successfully! A verification email has been sent. Redirecting to your Member Dashboard...",
                    "success"
                );

                setTimeout(() => {
                    window.location.href = "dashboard.html";
                }, 1500);

            } catch (error) {
                console.error("Signup failed:", error);
                showMessage(signupMsg, getFriendlyErrorMessage(error), "error");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "CREATE ACCOUNT ↗";
                }
            }
        });
    }
}

// ==========================================
// 3. MEMBER DASHBOARD LOGIC
// ==========================================
export function initDashboardPage() {
    const logoutBtn = document.getElementById("logoutBtn");
    const welcomeName = document.getElementById("welcomeName");
    const memberName = document.getElementById("memberName");
    const memberEmail = document.getElementById("memberEmail");
    const memberPhone = document.getElementById("memberPhone");
    const memberRole = document.getElementById("memberRole");
    const emailVerifiedBadge = document.getElementById("emailVerifiedBadge");
    const memberSince = document.getElementById("memberSince");
    const memberBookingTable = document.getElementById("memberBookingTable");

    const totalBookingsCount = document.getElementById("totalBookingsCount");
    const pendingBookingsCount = document.getElementById("pendingBookingsCount");
    const approvedBookingsCount = document.getElementById("approvedBookingsCount");
    const rejectedBookingsCount = document.getElementById("rejectedBookingsCount");

    // Guard page: check authentication state
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // Not logged in -> redirect to login page
            window.location.href = "login.html";
            return;
        }

        // Display user details from Auth
        const displayName = user.displayName || user.email.split("@")[0];
        if (welcomeName) welcomeName.textContent = displayName;
        if (memberName) memberName.textContent = displayName;
        if (memberEmail) memberEmail.textContent = user.email;

        if (emailVerifiedBadge) {
            if (user.emailVerified) {
                emailVerifiedBadge.textContent = "Verified";
                emailVerifiedBadge.className = "badge badge-approved";
            } else {
                emailVerifiedBadge.textContent = "Unverified (Check inbox)";
                emailVerifiedBadge.className = "badge badge-pending";
            }
        }

        // Fetch extra profile data from Firestore `users` collection
        try {
            const userDocSnap = await getDoc(doc(db, "users", user.uid));
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                if (memberPhone) memberPhone.textContent = userData.phone || "Not provided";
                if (memberRole) memberRole.textContent = (userData.role || "member").toUpperCase();
                if (userData.createdAt && memberSince) {
                    const date = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date();
                    memberSince.textContent = date.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                    });
                }
            } else {
                if (memberPhone) memberPhone.textContent = "Not provided";
                if (memberRole) memberRole.textContent = "MEMBER";
            }
        } catch (err) {
            console.warn("Could not fetch user profile details:", err);
        }

        // Fetch member's booking history
        await loadMemberBookings(user.email, user.uid);
    });

    // Logout handler
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            try {
                await signOut(auth);
                window.location.href = "login.html";
            } catch (err) {
                alert("Failed to logout: " + err.message);
            }
        });
    }

    // Load bookings for current member
    async function loadMemberBookings(email, uid) {
        if (!memberBookingTable) return;
        memberBookingTable.innerHTML = "<tr><td colspan='5' class='table-msg'>Loading your booking history...</td></tr>";

        try {
            // Fetch bookings from Firestore
            const bookingsRef = collection(db, "booking");
            const snapshot = await getDocs(bookingsRef);

            let total = 0;
            let pending = 0;
            let approved = 0;
            let rejected = 0;

            const memberBookings = [];

            snapshot.forEach((docItem) => {
                const data = docItem.data();
                // Match by email or userId
                const docEmail = (data.email || "").toLowerCase();
                const userEmail = (email || "").toLowerCase();

                if (docEmail === userEmail || (data.userId && data.userId === uid)) {
                    memberBookings.push({
                        id: docItem.id,
                        ...data
                    });
                }
            });

            // Update Active Membership Card dynamically
            const activePlanTag = document.getElementById("activePlanTag");
            const activePlanTitle = document.getElementById("activePlanTitle");
            const activePlanDesc = document.getElementById("activePlanDesc");

            const approvedBooking = memberBookings.find(b => (b.status || "").toLowerCase() === "approved");
            const pendingBooking = memberBookings.find(b => (b.status || "").toLowerCase() === "pending");

            if (approvedBooking) {
                if (activePlanTag) {
                    activePlanTag.textContent = "MEMBERSHIP ACTIVE";
                    activePlanTag.style.background = "rgba(16, 185, 129, 0.14)";
                    activePlanTag.style.color = "#10b981";
                    activePlanTag.style.borderColor = "rgba(16, 185, 129, 0.4)";
                }
                if (activePlanTitle) activePlanTitle.textContent = (approvedBooking.membership || "Standard") + " Pass";
                if (activePlanDesc) activePlanDesc.textContent = `Your ${approvedBooking.membership || "membership"} is active and verified by gym management. Enjoy full access to weights, facilities, and guidance during club hours.`;
            } else if (pendingBooking) {
                if (activePlanTag) {
                    activePlanTag.textContent = "APPLICATION PENDING";
                    activePlanTag.style.background = "rgba(255, 204, 0, 0.14)";
                    activePlanTag.style.color = "#ffcc00";
                    activePlanTag.style.borderColor = "rgba(255, 204, 0, 0.4)";
                }
                if (activePlanTitle) activePlanTitle.textContent = (pendingBooking.membership || "Plan") + " (Under Review)";
                if (activePlanDesc) activePlanDesc.textContent = "Your membership enrollment request has been submitted to gym staff. We will confirm and activate your slot shortly.";
            } else {
                if (activePlanTag) {
                    activePlanTag.textContent = "NO ACTIVE PLAN";
                    activePlanTag.style.background = "rgba(255, 255, 255, 0.08)";
                    activePlanTag.style.color = "#888";
                    activePlanTag.style.borderColor = "#333";
                }
                if (activePlanTitle) activePlanTitle.textContent = "Start Your Journey";
                if (activePlanDesc) activePlanDesc.textContent = "You do not have an active membership booking yet. Choose a Monthly, Quarterly, or Yearly plan to start training!";
            }

            if (memberBookings.length === 0) {
                memberBookingTable.innerHTML = "<tr><td colspan='5' class='table-msg'>No bookings found yet. <a href='index.html#contact' style='color:var(--yellow);text-decoration:underline;'>Book your first session!</a></td></tr>";
                if (totalBookingsCount) totalBookingsCount.textContent = "0";
                if (pendingBookingsCount) pendingBookingsCount.textContent = "0";
                if (approvedBookingsCount) approvedBookingsCount.textContent = "0";
                if (rejectedBookingsCount) rejectedBookingsCount.textContent = "0";
                return;
            }

            memberBookingTable.innerHTML = "";

            // Sort newest first if createdAt exists
            memberBookings.sort((a, b) => {
                const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                return tB - tA;
            });

            memberBookings.forEach((b) => {
                total++;
                const status = (b.status || "pending").toLowerCase();
                if (status === "pending") pending++;
                else if (status === "approved") approved++;
                else if (status === "rejected") rejected++;

                let dateFormatted = "Recent";
                if (b.createdAt && b.createdAt.toDate) {
                    dateFormatted = b.createdAt.toDate().toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                    });
                }

                const row = document.createElement("tr");
                row.innerHTML = `
                    <td><strong>${escapeHtml(b.membership || "Standard Plan")}</strong></td>
                    <td>${escapeHtml(dateFormatted)}</td>
                    <td>${escapeHtml(b.phone || "-")}</td>
                    <td>${escapeHtml(b.message || "No special requests")}</td>
                    <td><span class="badge badge-${status}">${status.toUpperCase()}</span></td>
                `;
                memberBookingTable.appendChild(row);
            });

            if (totalBookingsCount) totalBookingsCount.textContent = total;
            if (pendingBookingsCount) pendingBookingsCount.textContent = pending;
            if (approvedBookingsCount) approvedBookingsCount.textContent = approved;
            if (rejectedBookingsCount) rejectedBookingsCount.textContent = rejected;

        } catch (error) {
            console.error("Error loading member bookings:", error);
            memberBookingTable.innerHTML = "<tr><td colspan='5' class='table-msg error-msg'>Could not load booking history. Please try refreshing.</td></tr>";
        }
    }
}

// ==========================================
// 4. NAVBAR AUTH STATE (HOMEPAGE)
// ==========================================
export function initNavbarAuthState() {
    const navLoginBtn = document.getElementById("navLoginBtn");
    const navSignupBtn = document.getElementById("navSignupBtn");
    const navDashboardBtn = document.getElementById("navDashboardBtn");
    const navLogoutBtn = document.getElementById("navLogoutBtn");

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            if (navLoginBtn) navLoginBtn.classList.add("hidden");
            if (navSignupBtn) navSignupBtn.classList.add("hidden");
            if (navDashboardBtn) {
                navDashboardBtn.classList.remove("hidden");
                navDashboardBtn.textContent = `DASHBOARD (${(user.displayName || user.email.split("@")[0]).toUpperCase()})`;
            }
            if (navLogoutBtn) {
                navLogoutBtn.classList.remove("hidden");
                navLogoutBtn.addEventListener("click", async (e) => {
                    e.preventDefault();
                    await signOut(auth);
                    window.location.reload();
                });
            }
        } else {
            // User is logged out
            if (navLoginBtn) navLoginBtn.classList.remove("hidden");
            if (navSignupBtn) navSignupBtn.classList.remove("hidden");
            if (navDashboardBtn) navDashboardBtn.classList.add("hidden");
            if (navLogoutBtn) navLogoutBtn.classList.add("hidden");
        }
    });
}

// Helpers
function showMessage(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = `form-message form-message-${type}`;
    el.style.display = "block";
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
