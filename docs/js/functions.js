import { auth, db } from './firebase-config.js'; // Import auth and db

export function authStateObserver() {
    auth.onAuthStateChanged(function(user) {
        if (user) {
            if(window.location.pathname.endsWith('login.html')){
                window.location.href = "dashboard.html";
            }
        } else {
            // User is signed out.
            console.log('User is signed out.');
        }
    });
}

$(document).ready(function() {
    const adminUID = "lk0SSxWRWKU1ST9faUiZcuDUDh62"; // Admin UID

    let currentPage = 1;
    let itemsPerPage = 10;
    let allRequests = [];
    let lastVisible = null;
    let totalDocuments = 0;

    let authStateChecked = false; // Flag to track auth state check
    let requestsAlreadyFetched = false; // Add this flag

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

    // Function to update navbar dropdown based on login status
    function updateNavbarDropdown(user) {
        const dropdownContent = $("#user-dropdown-content");
        dropdownContent.empty(); // Clear existing content

        if (user) {
            dropdownContent.append('<a href="dashboard.html">Dashboard</a>');
            dropdownContent.append('<a href="account.html">Account</a>');
            if (user.uid === adminUID) {
                dropdownContent.append('<a href="admin.html">Admin</a>');
            }
            dropdownContent.append('<hr>');
            dropdownContent.append('<a href="#" id="logout-link">Logout</a>');
        } else {
            dropdownContent.append('<a href="login.html">Login</a>');
        }
    }

    // Check login status on page load and on auth state changes
    auth.onAuthStateChanged(user => {
        console.log("auth.onAuthStateChanged triggered. user:", user); // Log auth state change

        updateNavbarDropdown(user);

        if (window.location.pathname.includes("admin.html")) {
            console.log("admin.html detected."); // Log admin page

            if (user && user.uid === adminUID) {
                console.log("User is admin."); // Log admin user

                $("#admin-user-display").text("Logged in as admin: " + user.email);

                if (!authStateChecked && !requestsAlreadyFetched) {
                    console.log("Fetching requests (authStateChecked:", authStateChecked, ", requestsAlreadyFetched:", requestsAlreadyFetched, ")"); // Log fetch condition

                    authStateChecked = true;

                    fetchAllRequests().then(() => {
                        console.log("fetchAllRequests resolved."); // Log fetch resolution

                        requestsAlreadyFetched = true;
                        displayRequests();
                    });
                } else {
                    console.log("Requests already fetched or auth state checked."); // Log skipped fetch
                }
            } else {
                console.log("User is not admin. Redirecting to login.html."); // Log non-admin redirect

                window.location.href = "login.html";
            }
        }

        function displayRequestDetails(request, isAdmin = false, isUserDashboard = false) {
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

            // Add Admin Notes if available
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

            detailsHTML += `<div><strong>Request ID:</strong> ${request.id || "N/A"}</div>`; // Always show request ID

            detailsDiv.append(detailsHTML);
            // Apply left-alignment after the HTML has been added
            $("#request-details div:contains('Admin Notes:')").css('text-align', 'left');
            $("#request-details div:contains('Admin Notes:') ul").css('padding-left', '20px');
        }

        if (window.location.pathname.includes("request-details.html")) {
            const urlParams = new URLSearchParams(window.location.search);
            const requestId = urlParams.get('id');

            if (requestId) {
                auth.onAuthStateChanged(user => {
                    if (user) {
                        db.collection("requests").doc(requestId).get().then((doc) => {
                            if (doc.exists) {
                                const request = doc.data();
                                request.id = doc.id; // Correctly get the id
                                if (request.userId === user.uid || user.uid === adminUID) {
                                    displayRequestDetails(request, false, true); // Use the function with isUserDashboard flag
                                    $("#cancel-request").off('click').on('click', function() {
                                        if (confirm("Are you sure you want to cancel this request?")) {
                                            db.collection("requests").doc(requestId).update({
                                                status: "Cancelled"
                                            }).then(() => {
                                                alert("Request cancelled successfully.");
                                                window.location.reload();
                                            }).catch((error) => {
                                                alert("Error cancelling request. Please try again.");
                                            });
                                        }
                                    });
                                } else {
                                    $("#request-details").html("<p>You do not have permission to view this request.</p>");
                                    $("#cancel-request").hide();
                                }
                            } else {
                                $("#request-details").html("<p>Request not found.</p>");
                                $("#cancel-request").hide();
                            }
                        }).catch((error) => {
                            $("#request-details").html("<p>Error loading request details.</p>");
                            $("#cancel-request").hide();
                        });
                    } else {
                        window.location.href = "login.html"
                    }
                });
            }
            $("#back-to-dashboard").click(function() {
                window.location.href = "dashboard.html"
            })
        }

        if (window.location.pathname.includes("admin-request-details.html")) {
            auth.onAuthStateChanged(user => {
                const urlParams = new URLSearchParams(window.location.search);
                const requestId = urlParams.get('id');

                if (user && user.uid === adminUID && requestId) {
                    db.collection("requests").doc(requestId).get().then((doc) => {
                        if (doc.exists) {
                            const request = doc.data();
                            request.id = doc.id; // Correctly get the id
                            displayRequestDetails(request, true); // Use the function with isAdmin flag
                            $("#adminNotes").val("");
                            $("#status").val(request.status);

                            $("#update-request").off('click').on('click', function() {
                                const adminNotes = $("#adminNotes").val();
                                const status = $("#status").val();
                                const currentDate = new Date().toLocaleString();
                                const newAdminNotes = request.adminNotes ? `${request.adminNotes}\n${currentDate}: ${adminNotes}` : `${currentDate}: ${adminNotes}`;

                                db.collection("requests").doc(requestId).update({
                                    adminNotes: newAdminNotes,
                                    status: status
                                }).then(() => {
                                    alert("Request updated successfully.");
                                    window.location.reload();
                                }).catch((error) => {
                                    alert("Error updating request. Please try again.");
                                });
                            });
                        } else {
                            $("#request-details").html("<p>Request not found.</p>");
                        }
                    }).catch((error) => {
                        $("#request-details").html("<p>Error loading request details.</p>");
                    });
                } else if (user && user.uid !== adminUID) {
                    window.location.href = "login.html";
                }
            });
            $("#back-to-admin").click(function() {
                window.location.href = "admin.html"
            })
        }
    });

    // Logout
    $(document).on("click", "#logout-link", function() {
        auth.signOut().then(() => {
            window.location.href = "login.html";
        });
    });

    // Show/Hide Signup Form
    $("#signup-link").click(function(event) {
        event.preventDefault();
        $("#loginForm").parent().hide();
        $("#signup-form").show();
    });

    // Show/Hide Login Form
    $("#login-link").click(function(event) {
        event.preventDefault();
        $("#signup-form").hide();
        $("#loginForm").parent().show();
    });

    // Login Form Submit
    $("#loginForm").submit(function(event) {
        event.preventDefault();
        const email = $("#loginEmail").val();
        const password = $("#loginPassword").val();

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                window.location.href = "dashboard.html";
            })
            .catch((error) => {
                alert(error.message);
            });
    });

    // Signup Form Submit
    $("#signupForm").submit(function(event) {
        event.preventDefault();
        const email = $("#signupEmail").val();
        const password = $("#signupPassword").val();

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                alert("Account created! Please log in.");
                $("#signup-form").hide();
                $("#loginForm").parent().show();
            })
            .catch((error) => {
                alert(error.message);
            });
    });

    // Request Form Submit
    $("#printRequestForm").submit(function(event) {
        event.preventDefault();
        const name = $("#name").val();
        const email = $("#email").val();
        const description = $("#description").val();

        db.collection("requests").add({
            name: name,
            email: email,
            description: description,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        })
            .then(() => {
                alert("Request submitted successfully!");
                $("#printRequestForm")[0].reset();
            })
            .catch((error) => {
                alert("Error submitting request. Please try again.");
            });
    });

    function fetchAllRequests(paginate = false, newItemsPerPage = itemsPerPage) {
        console.log("fetchAllRequests called. paginate:", paginate, "newItemsPerPage:", newItemsPerPage); // Log function call

        return new Promise((resolve, reject) => {
            let query = db.collection("requests").orderBy("dateAdded");

            if (paginate && lastVisible) {
                query = query.startAfter(lastVisible);
                console.log("Pagination active, lastVisible:", lastVisible);
            }

            query = query.limit(newItemsPerPage);
            console.log("Query limit set to:", newItemsPerPage);

            db.collection("requests").get().then((totalSnapshot) => {
                totalDocuments = totalSnapshot.size;
                console.log("Total documents:", totalDocuments);

                query.get().then((querySnapshot) => {
                    allRequests = [];
                    lastVisible = null;

                    if (!querySnapshot.empty) {
                        querySnapshot.forEach((doc) => {
                            const data = doc.data();
                            data.id = doc.id;
                            allRequests.push(data);
                            lastVisible = doc;
                        });
                        console.log("Requests fetched:", allRequests.length);
                    } else {
                        console.log("No requests found.");
                    }
                    resolve();
                }).catch((error) => {
                    console.error("Error fetching requests:", error);
                    reject(error);
                });
            }).catch((error) => {
                console.error("Error getting total requests count:", error);
                reject(error);
            });
        });
    }

    function displayRequests() {
        console.log("displayRequests called. allRequests length:", allRequests.length, "currentPage:", currentPage, "itemsPerPage:", itemsPerPage); // Log display function call

        const tableBody = $("#admin-requests-table tbody");
        tableBody.empty();

        if (allRequests.length > 0) {
            allRequests.forEach((request) => {
                const row = `
                    <tr>
                        <td>${request.requestName || ""}</td>
                        <td>${request.requestLink || ""}</td>
                        <td>${request.requestNotes || ""}</td>
                        <td>${request.status || ""}</td>
                        <td>${request.dateAdded ? request.dateAdded.toDate().toLocaleString() : ""}</td>
                        <td>${request.adminNotes || ""}</td>
                        <td>${request.requestDateNeeded || ""}</td>
                        <td>${request.userId || ""}</td>
                        <td><a href="admin-request-details.html?id=${request.id}">View Details</a></td>
                    </tr>
                `;
                tableBody.append(row);
            });
        } else {
            tableBody.append("<tr><td colspan='9'>No requests found.</td></tr>");
        }

        // Update pagination controls
        const prevButton = $("#adminPrevPage");
        const nextButton = $("#adminNextPage");
        const pageInfo = $("#adminPageInfo");

        prevButton.prop("disabled", currentPage === 1);
        nextButton.prop("disabled", allRequests.length < itemsPerPage);

        // Calculate and display total pages (using totalDocuments)
        const totalPages = Math.ceil(totalDocuments / itemsPerPage);
        pageInfo.text(`Page ${currentPage} of ${totalPages}`);
    }

    // Pagination controls
    $("#adminPrevPage").click(function() {
        console.log("adminPrevPage clicked. currentPage:", currentPage); // Log click event

        if (currentPage > 1) {
            currentPage--;
            lastVisible = null;
            fetchAllRequests(false).then(()=>{displayRequests()}).catch((error)=>{alert(error)});
        }
    });

    $("#adminNextPage").click(function() {
        console.log("adminNextPage clicked. currentPage:", currentPage, "allRequests.length:", allRequests.length, "itemsPerPage:", itemsPerPage); // Log click event

        if (allRequests.length === itemsPerPage) {
            currentPage++;
            fetchAllRequests(true).then(()=>{displayRequests()}).catch((error)=>{alert(error)});
        }
    });

    $("#adminItemsPerPage").change(function() {
        const newItemsPerPage = parseInt($(this).val());
        console.log("adminItemsPerPage changed. newItemsPerPage:", newItemsPerPage); // Log change event

        currentPage = 1;
        lastVisible = null;
        fetchAllRequests(false, newItemsPerPage)
            .then(() => {
                itemsPerPage = newItemsPerPage; // update global value
                displayRequests(); // display after fetch
            })
            .catch((error) => {
                alert("Error fetching requests: " + error.message);
            });
    });

    function showToast(message) {
        const toast = $("#toast-message");
        toast.text(message);
        toast.fadeIn(400);
        setTimeout(function() {
            toast.fadeOut(400);
        }, 3000); // Hide after 3 seconds
    }
});