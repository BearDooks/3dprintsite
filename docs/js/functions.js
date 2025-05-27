import { auth, db } from './firebase-config.js'; // Import auth and db

// Function to check admin status from Firestore
export async function isAdmin(userId) {
    if (!userId) return false;
    try {
        const userRoleDoc = await db.collection("user_roles").doc(userId).get();
        if (userRoleDoc.exists && userRoleDoc.data().isAdmin === true) {
            return true;
        }
        return false;
    } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
    }
}

$(document).ready(function() {
    // authStateObserver(); // Removed call

    $("body").on("click", "#dark-mode-toggle", function() {
        $("body").toggleClass("dark-mode");
        const icon = $("#dark-mode-icon");
        if ($("body").hasClass("dark-mode")) {
            icon.removeClass("fa-sun").addClass("fa-moon");
        } else {
            icon.removeClass("fa-moon").addClass("fa-sun");
        }
    });

    async function updateNavbarDropdown(user) {
        const dropdownContent = $("#user-dropdown-content");
        dropdownContent.empty();

        if (user) {
            dropdownContent.append('<a href="dashboard.html">Dashboard</a>');
            dropdownContent.append('<a href="account.html">Account</a>');
            if (await isAdmin(user.uid)) {
                dropdownContent.append('<a href="admin.html">Admin</a>');
            }
            dropdownContent.append('<hr>');
            dropdownContent.append('<a href="#" id="logout-link">Logout</a>');
        } else {
            dropdownContent.append('<a href="login.html">Login</a>');
        }
    }

    auth.onAuthStateChanged(async user => {
        // console.log("auth.onAuthStateChanged triggered. user:", user); // Removed

        await updateNavbarDropdown(user);

        // ---- Integrated logic from authStateObserver ----
        if (user) {
            if (window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('signup.html')) {
                window.location.href = "dashboard.html";
                return; // Important: if redirecting, no need to process further page-specific logic
            }
        }
        // No 'else' block needed here for signed-out users regarding redirection from login.html,
        // as the original authStateObserver only handled the case where a user *is* logged in
        // and on login.html. Other parts of this auth.onAuthStateChanged handle redirection
        // for protected pages when a user is not logged in.

        if (window.location.pathname.includes("request-details.html")) {
            const urlParams = new URLSearchParams(window.location.search);
            const requestId = urlParams.get('id');

            if (requestId) {
                if (user) {
                    db.collection("requests").doc(requestId).get().then((doc) => {
                        if (doc.exists) {
                            const request = doc.data();
                            request.id = doc.id;
                            if (request.userId === user.uid || await isAdmin(user.uid)) {
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

            $("#back-to-dashboard").click(function() {
                window.location.href = "dashboard.html";
            });
        }

        if (window.location.pathname.includes("admin-request-details.html")) {
            const urlParams = new URLSearchParams(window.location.search);
            const requestId = urlParams.get('id');

            if (user && await isAdmin(user.uid) && requestId) {
                db.collection("requests").doc(requestId).get().then(async (doc) => {
                    if (doc.exists) {
                        const request = doc.data();
                        request.id = doc.id;
                        displayRequestDetails(request, true);
                        $("#adminNotes").val("");
                        $("#status").val(request.status);

                        $("#update-request").off('click').on('click', function() {
                            let adminNotes = $("#adminNotes").val(); // Get value, don't trim yet
                            const status = $("#status").val();
                            const currentDate = new Date().toLocaleString();
                            let updateData = { // Initialize updateData object
                                status: status
                            };
            
                            // console.log("adminNotes (before trim):", adminNotes); // Removed
            
                            if (adminNotes.trim() !== "") {
                                // console.log("adminNotes (after trim):", adminNotes.trim()); // Removed
                                if (request.adminNotes) {
                                    updateData.adminNotes = `${request.adminNotes}\n${currentDate}: ${adminNotes.trim()}`;
                                } else {
                                    updateData.adminNotes = `${currentDate}: ${adminNotes.trim()}`;
                                }
                                // console.log("updateData:", updateData); // Removed
                            } else {
                                // console.log("adminNotes is empty after trim."); // Removed
                            }
            
                            // console.log("Final updateData:", updateData); // Removed
            
                            db.collection("requests").doc(requestId).update(updateData) // Update with updateData
                                .then(() => {
                                    showToast("Request updated successfully.");
                                    window.location.reload();
                                }).catch((error) => {
                                    console.error("Error updating request:", error);
                                    showToast("Error updating request. Please try again.");
                                });
                        });
                    } else {
                        $("#request-details").html("<p>Request not found.</p>");
                    }
                }).catch((error) => {
                    console.error("Error loading request details:", error);
                    $("#request-details").html("<p>Error loading request details.</p>");
                });
            } else if (user && !(await isAdmin(user.uid))) {
                // Redirect if user is not admin and tries to access admin-request-details
                if (window.location.pathname.includes("admin-request-details.html")) {
                    window.location.href = "login.html";
                }
            } else if (!user && window.location.pathname.includes("admin-request-details.html")) {
                 // Redirect if no user is logged in and tries to access admin-request-details
                window.location.href = "login.html";
            }
        }

        $("#back-to-admin").click(function() {
            window.location.href = "admin.html";
        });
    });

    $(document).on("click", "#logout-link", function() {
        auth.signOut().then(() => {
            window.location.href = "login.html";
        }).catch((error) => {
            console.error("Error signing out:", error);
            showToast("Error signing out. Please try again.");
        });
    });

    $("#loginForm").submit(function(event) {
        event.preventDefault();
        const email = $("#loginEmail").val();
        const password = $("#loginPassword").val();

        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                window.location.href = "dashboard.html";
            })
            .catch((error) => {
                console.error("Login error:", error);
                showToast(error.message);
            });
    });

    $("#signupForm").submit(function(event) {
        event.preventDefault();
        const email = $("#signupEmail").val();
        const password = $("#signupPassword").val();

        auth.createUserWithEmailAndPassword(email, password)
            .then(() => {
                showToast("Account created! Please log in.");
                $("#signup-form").hide();
                $("#loginForm").parent().show();
            })
            .catch((error) => {
                console.error("Signup error:", error);
                showToast(error.message);
            });
    });

    $("#printRequestForm").submit(function(event) {
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
                showToast("Request submitted successfully!");
                $("#printRequestForm")[0].reset();
            })
            .catch((error) => {
                console.error("Request submission error:", error);
                showToast("Error submitting request. Please try again.");
            });
    });
});

export function showToast(message) {
    const toast = $("#toast-message");
    toast.text(message);
    toast.fadeIn(400);
    setTimeout(function() {
        toast.fadeOut(400);
    }, 3000);
}

export function displayRequestDetails(request, isAdmin = false, isUserDashboard = false) {
    const detailsDiv = $("#request-details");
    detailsDiv.empty();

    let detailsHTML = `
        <div><strong>Request Name:</strong> ${request.requestName || "N/A"}</div>
        <div><strong>Request Link:</strong> ${request.requestLink || "N/A"}</div>
        <div><strong>Request Notes:</strong> ${request.requestNotes || "N/A"}</div>
        <div><strong>Status:</strong> ${request.status || "N/A"}</div>
        <div><strong>Date Added:</strong> ${request.dateAdded ? request.dateAdded.toDate().toLocaleString() : "N/A"}</div>
        <div><strong>Request Date Needed:</strong> ${request.requestDateNeeded || "N/A"}</div>
    `;

    if (request.adminNotes) {
        let adminNotesList = "<ul>";
        const notesArray = request.adminNotes.split('\n');
        notesArray.forEach(note => {
            adminNotesList += `<li>${note}</li>`;
        });
        adminNotesList += "</ul>";
        detailsHTML += `<div><strong>Admin Notes:</strong> ${adminNotesList}</div>`;
    }

    if (!isUserDashboard) {
        detailsHTML += `<div><strong>User ID:</strong> ${request.userId || "N/A"}</div>`;
    }

    detailsHTML += `<div><strong>Request ID:</strong> ${request.id || "N/A"}</div>`;

    detailsDiv.append(detailsHTML);
    $("#request-details div:contains('Admin Notes:')").css('text-align', 'left');
    $("#request-details div:contains('Admin Notes:') ul").css('padding-left', '20px');
}

// export function authStateObserver() { // Removed function
//     auth.onAuthStateChanged(function(user) {
//         if (user) {
//             if (window.location.pathname.endsWith('login.html')) {
//                 window.location.href = "dashboard.html";
//             }
//         } else {
//             // console.log('User is signed out.'); // Removed
//         }
//     });
// }

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
                $("#cancel-request").off('click').on('click', function() {
                    $("#confirmation-modal").fadeIn(); // Show confirmation modal

                    $("#confirm-cancel").off('click').on('click', function() {
                        db.collection("requests").doc(requestId).update({
                            status: "Cancelled"
                        }).then(() => {
                            showToast("Request cancelled successfully."); // Display toast
                            $("#request-details div:contains('Status:')").html(`<div><strong>Status:</strong> Cancelled</div>`);
                            $("#cancel-request").hide();
                        }).catch((error) => {
                            console.error("Error cancelling request:", error);
                            showToast("Error cancelling request. Please try again."); // Display error toast
                        });
                        $("#confirmation-modal").fadeOut(); // Hide modal
                    });

                    $("#cancel-modal").off('click').on('click', function() {
                        $("#confirmation-modal").fadeOut(); // Hide modal
                    });
                });
            }
        }
    }).catch((error) => {
        console.error("Error getting request:", error);
    });
}