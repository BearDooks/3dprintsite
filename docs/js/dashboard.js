import { auth, db } from './firebase-config.js';
import { showToast, formatStatus } from './functions.js';

$(document).ready(function () {
    // --- 1. State Variables ---
    let userCurrentPage = 1;
    let userItemsPerPage = 10;
    let userAllRequests = [];
    let currentFilteredRequests = [];

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

    window.onclick = function (event) {
        if (event.target === modal[0]) {
            hideModal();
        }
    };

    // --- 3. Form Submission ---

    // Validation Logic
    const formInputs = $("#new-request-form input[required], #new-request-form textarea[required]");

    formInputs.on('blur input', function () {
        if ($(this).val().trim() !== "") {
            $(this).addClass("valid").removeClass("invalid");
        } else {
            $(this).addClass("invalid").removeClass("valid");
        }
    });

    $("#new-request-form").submit(function (event) {
        event.preventDefault();

        // Final check
        let isValid = true;
        formInputs.each(function () {
            if ($(this).val().trim() === "") {
                $(this).addClass("invalid");
                isValid = false;
            }
        });

        if (!isValid) {
            showToast("Please fill in all required fields.", "error");
            return;
        }

        submitNewRequest();
    });

    function submitNewRequest() {
        console.log("Form submission triggered.");

        const requestName = $("#requestName").val();
        const requestLink = $("#requestLink").val();
        const requestNotes = $("#requestNotes").val();
        const requestDateNeeded = $("#requestDateNeeded").val();

        console.log("Submitting request to Firestore:", {
            requestName, requestLink, requestNotes, requestDateNeeded
        });

        const submitButton = $(this).find('button[type="submit"]');
        submitButton.prop('disabled', true);

        if (auth.currentUser) {
            db.collection("requests").add({
                userId: auth.currentUser.uid,
                requestName, requestLink, requestNotes, requestDateNeeded,
                status: "Submitted",
                dateAdded: firebase.firestore.FieldValue.serverTimestamp(),
            }).then(() => {
                console.log("Request submitted successfully.");
                showToast("Request submitted successfully!", "success");
                $("#new-request-form")[0].reset();
                hideModal();
                fetchUserRequests(auth.currentUser.uid);
                submitButton.prop('disabled', false);
            }).catch((error) => {
                console.error("Error submitting request:", error);
                showToast("Error submitting request. Please try again.", "error");
                submitButton.prop('disabled', false);
            });
        } else {
            console.error("User not logged in.");
            showToast("User not logged in. Please log in and try again.", "error");
            submitButton.prop('disabled', false);
        }
    }

    // --- 4. Data Fetching and Display ---
    function fetchUserRequests(userId) {
        // Show Skeletons
        const tableBody = $("#requests-table tbody");
        tableBody.empty();
        for (let i = 0; i < 5; i++) {
            tableBody.append(`
                <tr class="skeleton-row">
                    <td><div class="skeleton"></div></td>
                    <td><div class="skeleton"></div></td>
                    <td><div class="skeleton"></div></td>
                    <td><div class="skeleton"></div></td>
                    <td><div class="skeleton"></div></td>
                </tr>
            `);
        }

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
                currentFilteredRequests = userAllRequests; // Initialize filtered list
                displayUserRequests();
            })
            .catch((error) => {
                showToast("Error getting requests.", "error");
            });
    }

    function displayUserRequests() {
        const startIndex = (userCurrentPage - 1) * userItemsPerPage;
        const endIndex = startIndex + parseInt(userItemsPerPage);
        const pageRequests = currentFilteredRequests.slice(startIndex, endIndex);

        populateRequestsTable(pageRequests);
        updatePaginationInfo();
        updatePaginationButtons();
    }

    function populateRequestsTable(requests) {
        const tableBody = $("#requests-table tbody");
        tableBody.empty();

        if (requests.length === 0) {
            // Check if empty state already exists to avoid duplication if called multiple times, or just clear and append.
            // Since we empty tbody, we can't put div inside tbody easily that spans.
            // Better to hide table and show div.
            // But existing structure is `table -> tbody`.
            // I will put a single row with colspan.
            tableBody.append(`
               <tr>
                   <td colspan="5">
                       <div class="empty-state">
                           <i class="fas fa-inbox"></i>
                           <p>No requests found. Start by creating one!</p>
                       </div>
                   </td>
               </tr>
           `);
            return;
        }

        requests.forEach((request) => {
            const row = `
                <tr onclick="window.location.href='request-details.html?id=${request.id}'">
                    <td data-label="Request Name">${request.requestName || ""}</td>
                    <td data-label="Status">${formatStatus(request.status)}</td>
                    <td data-label="Date Added">${request.dateAdded ? request.dateAdded.toDate().toLocaleString() : ""}</td>
                    <td data-label="Date Needed">${request.requestDateNeeded || ""}</td>
                    <td data-label="Action"><button class="cta-button secondary small">View</button></td>
                </tr>
            `;
            tableBody.append(row);
        });
    }

    // --- 5. Pagination ---
    function updatePaginationInfo() {
        const totalPages = Math.ceil(currentFilteredRequests.length / userItemsPerPage) || 1;
        $("#userPageInfo").text(`Page ${userCurrentPage} of ${totalPages}`);
    }

    function updatePaginationButtons() {
        const totalPages = Math.ceil(currentFilteredRequests.length / userItemsPerPage) || 1;
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
        const totalPages = Math.ceil(currentFilteredRequests.length / userItemsPerPage) || 1;
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

    $(document).on('click', '.items-per-page-btn', function () {
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

    // --- 7. Search Functionality ---
    $("#searchInput").on("keyup", function () {
        const value = $(this).val().toLowerCase();

        currentFilteredRequests = userAllRequests.filter(request => {
            const name = (request.requestName || "").toLowerCase();
            const status = (request.status || "").toLowerCase();
            return name.includes(value) || status.includes(value);
        });

        userCurrentPage = 1;
        displayUserRequests();
    });

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