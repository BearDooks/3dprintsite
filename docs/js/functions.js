import { auth, db } from './firebase-config.js'; // Import auth and db

$(document).ready(function () {
    const adminUID = "lk0SSxWRWKU1ST9faUiZcuDUDh62";
    authStateObserver();
    checkCookieConsent();

    // Dropdown Toggle Logic
    $(document).on("click", ".dropbtn", function (e) {
        e.stopPropagation();
        $("#user-dropdown-content").toggleClass("show");
    });

    // Close dropdown when clicking outside
    $(document).on("click", function (e) {
        if (!$(e.target).closest(".dropdown").length) {
            $("#user-dropdown-content").removeClass("show");
        }
    });

    $("body").on("click", "#dark-mode-toggle", function () {
        $("body").toggleClass("dark-mode");
        const icon = $("#dark-mode-icon");
        if ($("body").hasClass("dark-mode")) {
            icon.removeClass("fa-sun").addClass("fa-moon");
        } else {
            icon.removeClass("fa-moon").addClass("fa-sun");
        }
    });

    function updateNavbarDropdown(user) {
        const dropdownContent = $("#user-dropdown-content");
        dropdownContent.empty();

        if (user) {
            $(".navbar-logo").attr("href", "dashboard.html");
            dropdownContent.append('<a href="dashboard.html">Dashboard</a>');
            dropdownContent.append('<a href="account.html">Account</a>');
            if (user.uid === "lk0SSxWRWKU1ST9faUiZcuDUDh62") {
                dropdownContent.append('<a href="admin.html">Admin</a>');
            }
            dropdownContent.append('<hr>');
            dropdownContent.append('<a href="#" id="logout-link">Logout</a>');
        } else {
            $(".navbar-logo").attr("href", "index.html");
            dropdownContent.append('<a href="login.html">Login</a>');
        }
    }

    auth.onAuthStateChanged(user => {
        console.log("auth.onAuthStateChanged triggered. user:", user);

        updateNavbarDropdown(user);

        if (window.location.pathname.includes("request-details.html")) {
            const urlParams = new URLSearchParams(window.location.search);
            const requestId = urlParams.get('id');

            if (requestId) {
                if (user) {
                    db.collection("requests").doc(requestId).get().then((doc) => {
                        if (doc.exists) {
                            const request = doc.data();
                            request.id = doc.id;
                            if (request.userId === user.uid || user.uid === "lk0SSxWRWKU1ST9faUiZcuDUDh62") {
                                displayRequestDetails(request, false, true);
                                handleCancelRequest(requestId);
                            } else {
                                $("#request-details").html("<p>You do not have permission to view this request.</p>");
                                $("#cancel-request").hide();
                            }
                        } else {
                            $("#request-details").html("<p>Request not found.</p>");
                            $("#cancel-request").hide();
                        }
                    }).catch((error) => {
                        console.error("Error loading request details:", error);
                        $("#request-details").html("<p>Error loading request details.</p>");
                        $("#cancel-request").hide();
                    });
                } else {
                    window.location.href = "login.html";
                }
            }

            $("#back-to-dashboard").click(function () {
                window.location.href = "dashboard.html";
            });
        }

        if (window.location.pathname.includes("admin-request-details.html")) {
            const urlParams = new URLSearchParams(window.location.search);
            const requestId = urlParams.get('id');

            if (user && user.uid === adminUID && requestId) {
                db.collection("requests").doc(requestId).get().then((doc) => {
                    if (doc.exists) {
                        const request = doc.data();
                        request.id = doc.id;
                        displayRequestDetails(request, true);
                        $("#adminNotes").val("");
                        $("#status").val(request.status);

                        $("#update-request").off('click').on('click', function () {
                            let adminNotes = $("#adminNotes").val(); // Get value, don't trim yet
                            const status = $("#status").val();
                            const currentDate = new Date().toLocaleString();
                            let updateData = { // Initialize updateData object
                                status: status
                            };

                            console.log("adminNotes (before trim):", adminNotes);

                            if (adminNotes.trim() !== "") {
                                console.log("adminNotes (after trim):", adminNotes.trim());
                                if (request.adminNotes) {
                                    updateData.adminNotes = `${request.adminNotes}\n${currentDate}: ${adminNotes.trim()}`;
                                } else {
                                    updateData.adminNotes = `${currentDate}: ${adminNotes.trim()}`;
                                }
                                console.log("updateData:", updateData);
                            } else {
                                console.log("adminNotes is empty after trim.");
                            }

                            console.log("Final updateData:", updateData);

                            db.collection("requests").doc(requestId).update(updateData) // Update with updateData
                                .then(() => {
                                    showToast("Request updated successfully.", "success");
                                    window.location.reload();
                                }).catch((error) => {
                                    console.error("Error updating request:", error);
                                    showToast("Error updating request. Please try again.", "error");
                                });
                        });
                    } else {
                        $("#request-details").html("<p>Request not found.</p>");
                    }
                }).catch((error) => {
                    console.error("Error loading request details:", error);
                    $("#request-details").html("<p>Error loading request details.</p>");
                });
            } else if (user && user.uid !== adminUID) {
                window.location.href = "login.html";
            }
        }

        $("#back-to-admin").click(function () {
            window.location.href = "admin.html";
        });
    });

    $(document).on("click", "#logout-link", function () {
        auth.signOut().then(() => {
            window.location.href = "login.html";
        }).catch((error) => {
            console.error("Error signing out:", error);
            showToast("Error signing out. Please try again.", "error");
        });
    });

    $("#loginForm").submit(function (event) {
        event.preventDefault();
        const email = $("#loginEmail").val();
        const password = $("#loginPassword").val();

        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                window.location.href = "dashboard.html";
            })
            .catch((error) => {
                console.error("Login error:", error);
                showToast(error.message, "error");
            });
    });

    $("#signupForm").submit(function (event) {
        event.preventDefault();
        const email = $("#signupEmail").val();
        const password = $("#signupPassword").val();

        auth.createUserWithEmailAndPassword(email, password)
            .then(() => {
                showToast("Account created! Please log in.", "success");
                $("#signup-form").hide();
                $("#loginForm").parent().show();
            })
            .catch((error) => {
                console.error("Signup error:", error);
                showToast(error.message, "error");
            });
    });

    $("#printRequestForm").submit(function (event) {
        event.preventDefault();
        const name = $("#name").val();
        const email = $("#email").val();
        const description = $("#description").val();
        const requestDateNeeded = $("#requestDateNeeded").val();

        db.collection("requests").add({
            requestName: name,
            requestEmail: email,
            requestNotes: description,
            requestDateNeeded: requestDateNeeded,
            dateAdded: firebase.firestore.FieldValue.serverTimestamp(),
            status: "Pending",
            userId: auth.currentUser.uid,
        })
            .then(() => {
                showToast("Request submitted successfully!", "success");
                $("#printRequestForm")[0].reset();
            })
            .catch((error) => {
                console.error("Request submission error:", error);
                showToast("Error submitting request. Please try again.", "error");
            });
    });
});

export function showToast(message, type = 'success') {
    let toastContainer = $("#toast-container");
    if (toastContainer.length === 0) {
        $("body").append('<div id="toast-container"></div>');
        toastContainer = $("#toast-container");
    }

    let iconClass = 'fa-check-circle';
    let toastClass = 'toast-success';
    let title = 'Success';

    if (type === 'error') {
        iconClass = 'fa-times-circle';
        toastClass = 'toast-error';
        title = 'Error';
    } else if (type === 'warning') {
        iconClass = 'fa-exclamation-triangle';
        toastClass = 'toast-warning';
        title = 'Warning';
    } else if (type === 'info') {
        iconClass = 'fa-info-circle';
        toastClass = 'toast-info';
        title = 'Info';
    }

    const toastHtml = `
        <div class="toast ${toastClass}">
            <i class="fas ${iconClass}"></i>
            <span><strong>${title}:</strong> ${message}</span>
            <div class="close-btn" onclick="$(this).parent().fadeOut(function(){ $(this).remove(); })">&times;</div>
        </div>
    `;

    const toastElement = $(toastHtml).hide();
    toastContainer.append(toastElement);
    toastElement.fadeIn();

    setTimeout(function () {
        toastElement.fadeOut(function () {
            $(this).remove();
        });
    }, 4000);
}

export function formatStatus(status) {
    let lowerStatus = (status || "").toLowerCase();
    let statusClass = "status-pill";

    if (lowerStatus === "submitted") {
        statusClass += " status-submitted";
    } else if (lowerStatus === "in progress") {
        statusClass += " status-progress";
    } else if (lowerStatus === "completed") {
        statusClass += " status-completed";
    } else if (lowerStatus === "cancelled") {
        statusClass += " status-cancelled";
    }

    return `<span class="${statusClass}">${status || "Unknown"}</span>`;
}

export function displayRequestDetails(request, isAdmin = false, isUserDashboard = false) {
    const detailsDiv = $("#request-details");
    detailsDiv.empty();

    let detailsHTML = `
        <div class="account-item">
            <strong><i class="fas fa-tag"></i> Request Name:</strong>
            <span>${request.requestName || "N/A"}</span>
        </div>
        <div class="account-item">
            <strong><i class="fas fa-link"></i> Request Link:</strong>
            <span>${request.requestLink ? `<a href="${request.requestLink}" target="_blank" class="accent-link">View Link <i class="fas fa-external-link-alt"></i></a>` : "N/A"}</span>
        </div>
        <div class="account-item">
            <strong><i class="fas fa-align-left"></i> Request Notes:</strong>
            <span>${request.requestNotes || "N/A"}</span>
        </div>
        <div class="account-item">
            <strong><i class="fas fa-info-circle"></i> Status:</strong>
            ${formatStatus(request.status)}
        </div>
        <div class="account-item">
            <strong><i class="far fa-calendar-alt"></i> Date Added:</strong>
            <span>${request.dateAdded ? request.dateAdded.toDate().toLocaleString() : "N/A"}</span>
        </div>
        <div class="account-item">
            <strong><i class="far fa-calendar-check"></i> Date Needed:</strong>
            <span>${request.requestDateNeeded || "N/A"}</span>
        </div>
        <div class="account-item">
            <strong><i class="fas fa-user-tag"></i> User ID:</strong>
            <span class="mono-text">${request.userId || "N/A"}</span>
        </div>
        <div class="account-item">
            <strong><i class="fas fa-fingerprint"></i> Request ID:</strong>
            <span class="mono-text">${request.id || "N/A"}</span>
        </div>
    `;

    if (request.adminNotes) {
        let adminNotesList = "<ul class='admin-notes-list'>";
        const notesArray = request.adminNotes.split('\n');
        notesArray.forEach(note => {
            adminNotesList += `<li>${note}</li>`;
        });
        adminNotesList += "</ul>";
        detailsHTML += `
            <div class="account-item full-width">
                <strong><i class="fas fa-clipboard-list"></i> Admin Notes:</strong>
                <div>${adminNotesList}</div>
            </div>
        `;
    }
    detailsDiv.append(detailsHTML);
}

export function authStateObserver() {
    auth.onAuthStateChanged(function (user) {
        if (user) {
            if (window.location.pathname.endsWith('login.html')) {
                window.location.href = "dashboard.html";
            }
        } else {
            console.log('User is signed out.');
        }
    });
}

function handleCancelRequest(requestId) {
    db.collection("requests").doc(requestId).get().then((doc) => {
        if (doc.exists) {
            const request = doc.data();
            if (request.status === "Cancelled") {
                $("#cancel-request").hide();
            } else if (request.status === "Completed") {
                $("#cancel-request").hide();
            } else {
                $("#cancel-request").show();
                $("#cancel-request").off('click').on('click', function () {
                    $("#confirmation-modal").fadeIn(); // Show confirmation modal

                    $("#confirm-cancel").off('click').on('click', function () {
                        db.collection("requests").doc(requestId).update({
                            status: "Cancelled"
                        }).then(() => {
                            showToast("Request cancelled successfully.", "success"); // Display toast
                            $("#request-details div:contains('Status:')").html(`<div><strong>Status:</strong> Cancelled</div>`);
                            $("#cancel-request").hide();
                        }).catch((error) => {
                            console.error("Error cancelling request:", error);
                            showToast("Error cancelling request. Please try again.", "error"); // Display error toast
                        });
                        $("#confirmation-modal").fadeOut(); // Hide modal
                    });

                    $("#cancel-modal").off('click').on('click', function () {
                        $("#confirmation-modal").fadeOut(); // Hide modal
                    });
                });
            }
        }
    }).catch((error) => {
        console.error("Error getting request:", error);
    });
}

function checkCookieConsent() {
    if (!localStorage.getItem('cookieConsent')) {
        // Create banner HTML
        const bannerHTML = `
            <div id="cookie-banner" class="cookie-banner">
                <p>We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.</p>
                <div class="cookie-buttons">
                    <button id="accept-cookies" class="cta-button small">Accept</button>
                    <button id="reject-cookies" class="cta-button secondary small">Reject</button>
                </div>
            </div>
        `;

        $("body").append(bannerHTML);

        // Trigger animation
        setTimeout(() => {
            $("#cookie-banner").addClass("show");
        }, 100);

        // Handle clicks
        $("#accept-cookies").click(function () {
            localStorage.setItem('cookieConsent', 'accepted');
            dismissBanner();
        });

        $("#reject-cookies").click(function () {
            localStorage.setItem('cookieConsent', 'rejected');
            dismissBanner();
        });

        function dismissBanner() {
            $("#cookie-banner").removeClass("show");
            setTimeout(() => {
                $("#cookie-banner").remove();
            }, 500);
        }
    }
}

// Call on ready (since this calls from module, we can export it or just call it if we move it up,
// but since functions.js is imported as module, we can just run it or export it and call in main.
// Actually, functions.js has a $(document).ready block at the top. I should add the call there.)