import { auth, db } from './firebase-config.js'; // Import auth and db

$(document).ready(function() {
    const adminUID = "lk0SSxWRWKU1ST9faUiZcuDUDh62";
    authStateObserver();

    $("body").on("click", "#dark-mode-toggle", function() {
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
            dropdownContent.append('<a href="dashboard.html">Dashboard</a>');
            dropdownContent.append('<a href="account.html">Account</a>');
            if (user.uid === "lk0SSxWRWKU1ST9faUiZcuDUDh62") {
                dropdownContent.append('<a href="admin.html">Admin</a>');
            }
            dropdownContent.append('<hr>');
            dropdownContent.append('<a href="#" id="logout-link">Logout</a>');
        } else {
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

            $("#back-to-dashboard").click(function() {
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

                        $("#update-request").off('click').on('click', function() {
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
                                    alert("Request updated successfully.");
                                    window.location.reload();
                                }).catch((error) => {
                                    console.error("Error updating request:", error);
                                    alert("Error updating request. Please try again.");
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

        $("#back-to-admin").click(function() {
            window.location.href = "admin.html";
        });
    });

    $(document).on("click", "#logout-link", function() {
        auth.signOut().then(() => {
            window.location.href = "login.html";
        }).catch((error) => {
            console.error("Error signing out:", error);
            alert("Error signing out. Please try again.");
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
                alert(error.message);
            });
    });

    $("#signupForm").submit(function(event) {
        event.preventDefault();
        const email = $("#signupEmail").val();
        const password = $("#signupPassword").val();

        auth.createUserWithEmailAndPassword(email, password)
            .then(() => {
                alert("Account created! Please log in.");
                $("#signup-form").hide();
                $("#loginForm").parent().show();
            })
            .catch((error) => {
                console.error("Signup error:", error);
                alert(error.message);
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
                alert("Request submitted successfully!");
                $("#printRequestForm")[0].reset();
            })
            .catch((error) => {
                console.error("Request submission error:", error);
                alert("Error submitting request. Please try again.");
            });
    });
});

function showToast(message) {
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

export function authStateObserver() {
    auth.onAuthStateChanged(function(user) {
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