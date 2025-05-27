import { auth, db } from './firebase-config.js';
import { showToast } from './functions.js'; // Import showToast

$(document).ready(function() {
    // --- 1. State Variables ---
    let userCurrentPage = 1;
    let userItemsPerPage = 10;
    let userAllRequests = [];

    // --- 2. Modal Handling ---
    const modal = $("#new-request-modal");
    const modalCloseButton = $("#new-request-modal .close")[0];

    function showModal() {
        modal.css("display", "block");
    }

    function hideModal() {
        modal.css("display", "none");
    }

    $("#new-request-button").click(showModal);
    modalCloseButton.onclick = hideModal;

    window.onclick = function(event) {
        if (event.target === modal[0]) {
            hideModal();
        }
    };

    // --- 3. Form Submission ---
    $("#new-request-form").submit(function(event) {
        event.preventDefault();
        submitNewRequest();
    });

    function submitNewRequest() {
        // console.log("Form submission triggered."); // Removed

        const requestName = $("#requestName").val();
        const requestLink = $("#requestLink").val();
        const requestNotes = $("#requestNotes").val();
        const requestDateNeeded = $("#requestDateNeeded").val();

        // console.log("Submitting request to Firestore:", { // Removed
        //     requestName, requestLink, requestNotes, requestDateNeeded
        // });

        const submitButton = $(this).find('button[type="submit"]');
        submitButton.prop('disabled', true);

        if (auth.currentUser) {
            db.collection("requests").add({
                userId: auth.currentUser.uid,
                requestName, requestLink, requestNotes, requestDateNeeded,
                status: "Submitted",
                dateAdded: firebase.firestore.FieldValue.serverTimestamp(),
            }).then(() => {
                // console.log("Request submitted successfully."); // Removed
                showToast("Request submitted successfully!");
                $("#new-request-form")[0].reset();
                hideModal();
                fetchUserRequests(auth.currentUser.uid);
                submitButton.prop('disabled', false);
            }).catch((error) => {
                console.error("Error submitting request:", error);
                showToast("Error submitting request. Please try again.");
                submitButton.prop('disabled', false);
            });
        } else {
            console.error("User not logged in.");
            showToast("User not logged in. Please log in and try again.");
            submitButton.prop('disabled', false);
        }
    }

    // --- 4. Data Fetching and Display ---
    function fetchUserRequests(userId) {
        db.collection("requests")
            .where("userId", "==", userId)
            .get()
            .then((querySnapshot) => {
                userAllRequests = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    data.id = doc.id;
                    userAllRequests.push(data);
                });
                displayUserRequests();
            })
            .catch((error) => {
                console.error("Error getting user requests:", error); // Keep console.error for debugging
                showToast("Error getting user requests.");
            });
    }

    function displayUserRequests() {
        const startIndex = (userCurrentPage - 1) * userItemsPerPage;
        const endIndex = startIndex + parseInt(userItemsPerPage);
        const pageRequests = userAllRequests.slice(startIndex, endIndex);

        populateRequestsTable(pageRequests);
        updatePaginationInfo();
        updatePaginationButtons();
    }

    function populateRequestsTable(requests) {
        const tableBody = $("#requests-table tbody");
        tableBody.empty();

        requests.forEach((request) => {
            const row = `
                <tr>
                    <td>${request.requestName || ""}</td>
                    <td>${request.status || ""}</td>
                    <td>${request.dateAdded ? request.dateAdded.toDate().toLocaleString() : ""}</td>
                    <td>${request.requestDateNeeded || ""}</td>
                    <td><a href="request-details.html?id=${request.id}">View Details</a></td>
                </tr>
            `;
            tableBody.append(row);
        });
    }

    // --- 5. Pagination ---
    function updatePaginationInfo() {
        const totalPages = Math.ceil(userAllRequests.length / userItemsPerPage);
        $("#userPageInfo").text(`Page ${userCurrentPage} of ${totalPages}`);
    }

    function updatePaginationButtons() {
        const totalPages = Math.ceil(userAllRequests.length / userItemsPerPage);
        $("#userPrevPage").prop("disabled", userCurrentPage === 1);
        $("#userNextPage").prop("disabled", userCurrentPage === totalPages);
    }

    $("#userPrevPage").click(() => {
        if (userCurrentPage > 1) {
            userCurrentPage--;
            displayUserRequests();
        }
    });

    $("#userNextPage").click(() => {
        const totalPages = Math.ceil(userAllRequests.length / userItemsPerPage);
        if (userCurrentPage < totalPages) {
            userCurrentPage++;
            displayUserRequests();
        }
    });

    $("#userItemsPerPage").change(() => {
        userItemsPerPage = parseInt($(this).val());
        userCurrentPage = 1;
        displayUserRequests();
    });

    $(document).on('click', '.items-per-page-btn', function() {
        userItemsPerPage = parseInt($(this).data('items'));
        userCurrentPage = 1;
        displayUserRequests();
        updateActivePerPageButton(this);
    });

    function updateActivePerPageButton(clickedButton) {
        $('.items-per-page-btn').removeClass('active');
        $(clickedButton).addClass('active');
    }

    // --- 6. Initialization ---
    function initializePerPageButtons() {
        userItemsPerPage = 10;
        $('.items-per-page-btn[data-items="10"]').addClass('active');
    }

    initializePerPageButtons();

    // --- 7. Toast Message (removed, now imported) ---

    // --- 8. Authentication State Change Listener ---
    auth.onAuthStateChanged(user => {
        if (user && window.location.pathname.includes("dashboard.html")) {
            $("#user-display").text("Logged in as: " + user.email);
            fetchUserRequests(user.uid);
        } else if (!user && window.location.pathname.includes("dashboard.html")) {
            window.location.href = "login.html";
        }
    });
});