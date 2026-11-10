// FITZONE - Main Website Script
import {
  auth,
  db,
  collection,
  addDoc,
  serverTimestamp,
  onAuthStateChanged,
  signOut,
  doc,
  getDoc
} from "./firebase.js";

// Mobile menu toggle
const menuBtn = document.getElementById("menuBtn");
const navbar = document.getElementById("navbar");

if (menuBtn && navbar) {
  menuBtn.addEventListener("click", () => {
    navbar.classList.toggle("open");
  });

  // Close mobile menu when an anchor link is clicked
  navbar.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      navbar.classList.remove("open");
    });
  });
}

// Plan button auto-select: smoothly scroll to contact & select plan
document.querySelectorAll(".plan-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    const selectedPlan = btn.getAttribute("data-plan");
    const membershipSelect = document.getElementById("membership");
    if (membershipSelect && selectedPlan) {
      membershipSelect.value = selectedPlan;
    }
  });
});

// Current copyright year
const yearElement = document.getElementById("year");
if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

// Navbar Authentication State Management
const navLoginBtn = document.getElementById("navLoginBtn");
const navSignupBtn = document.getElementById("navSignupBtn");
const navDashboardBtn = document.getElementById("navDashboardBtn");
const navLogoutBtn = document.getElementById("navLogoutBtn");

const bookingNameInput = document.getElementById("name");
const bookingEmailInput = document.getElementById("email");
const bookingPhoneInput = document.getElementById("phone");

onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Member is signed in: show Dashboard button, hide Login/Signup
    if (navLoginBtn) navLoginBtn.classList.add("hidden");
    if (navSignupBtn) navSignupBtn.classList.add("hidden");
    if (navDashboardBtn) {
      navDashboardBtn.classList.remove("hidden");
      const shortName = (user.displayName || user.email.split("@")[0]).toUpperCase();
      navDashboardBtn.textContent = `DASHBOARD (${shortName})`;
    }
    if (navLogoutBtn) {
      navLogoutBtn.classList.remove("hidden");
      navLogoutBtn.onclick = async (e) => {
        e.preventDefault();
        try {
          await signOut(auth);
          window.location.reload();
        } catch (err) {
          alert("Logout error: " + err.message);
        }
      };
    }

    // Auto-fill booking form with member's saved credentials
    if (bookingNameInput && !bookingNameInput.value) {
      bookingNameInput.value = user.displayName || "";
    }
    if (bookingEmailInput && !bookingEmailInput.value) {
      bookingEmailInput.value = user.email || "";
    }

    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (bookingPhoneInput && !bookingPhoneInput.value && userData.phone) {
          bookingPhoneInput.value = userData.phone;
        }
      }
    } catch (e) {
      console.warn("Could not prefill user profile into booking form:", e);
    }

  } else {
    // Guest: show Login and Signup buttons
    if (navLoginBtn) navLoginBtn.classList.remove("hidden");
    if (navSignupBtn) navSignupBtn.classList.remove("hidden");
    if (navDashboardBtn) navDashboardBtn.classList.add("hidden");
    if (navLogoutBtn) navLogoutBtn.classList.add("hidden");
  }
});

// Booking form submission
const contactForm = document.getElementById("contactForm");

if (contactForm) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("name")?.value.trim() || "";
    const email = document.getElementById("email")?.value.trim() || "";
    const phone = document.getElementById("phone")?.value.trim() || "";
    const membership = document.getElementById("membership")?.value || "";
    const message = document.getElementById("message")?.value.trim() || "";

    const formMessage = document.getElementById("formMessage");
    const submitButton = contactForm.querySelector('button[type="submit"]');

    if (!name || !email || !phone || !membership) {
      if (formMessage) {
        formMessage.style.color = "#ff4545";
        formMessage.textContent = "Please fill all required fields (Name, Email, Phone, Membership).";
      }
      return;
    }

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "SENDING ENQUIRY...";
      }

      const currentUser = auth.currentUser;

      // Add booking to Firestore
      await addDoc(collection(db, "booking"), {
        name: name,
        email: email,
        phone: phone,
        membership: membership,
        message: message,
        status: "pending",
        userId: currentUser ? currentUser.uid : null,
        createdAt: serverTimestamp()
      });

      if (formMessage) {
        formMessage.style.color = "#4caf50";
        if (currentUser) {
          formMessage.innerHTML = 'Booking submitted successfully! You can track its status in your <a href="dashboard.html" style="color:#ff3038;text-decoration:underline;">Member Dashboard</a>.';
        } else {
          formMessage.innerHTML = 'Booking submitted successfully! <a href="signup.html" style="color:#ff3038;text-decoration:underline;">Create an account</a> to track your booking status online.';
        }
      }

      contactForm.reset();

      // If user is logged in, re-populate their email and name
      if (currentUser) {
        if (bookingNameInput) bookingNameInput.value = currentUser.displayName || "";
        if (bookingEmailInput) bookingEmailInput.value = currentUser.email || "";
      }

    } catch (error) {
      console.error("Firebase Booking Error:", error);
      if (formMessage) {
        formMessage.style.color = "#ff4545";
        formMessage.textContent = "Booking failed: " + (error.message || "Please check your network and try again.");
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "SEND ENQUIRY ↗";
      }
    }
  });
}
