import { auth, db } from './firebase-config.js';
import { displayRequestDetails, isAdmin, showToast } from './functions.js'; // Import isAdmin and showToast

$(document).ready(function() {
    let adminCurrentPage = 1;
    let adminItemsPerPage = 10;
    let adminAllRequests = [];
    let totalDocuments = 0;

    let authStateChecked = false;
    let requestsAlreadyFetched = false;

    auth.onAuthStateChanged(async user => { // Make callback async
        if (window.location.pathname.includes("admin.html")) {
            if (user && await isAdmin(user.uid)) { // Use isAdmin
                $("#admin-user-display").text("Logged in as admin: " + user.email);
                if (!authStateChecked && !requestsAlreadyFetched) {
                    authStateChecked = true;
                    fetchAllRequests().then(() => {
                        requestsAlreadyFetched = true;
                        displayRequests();
                    });
                }
            } else {
                window.location.href = "login.html";
            }
        }
        // The admin-request-details.html logic has been moved to functions.js
    });

    // The #back-to-admin click handler has been moved to functions.js

    function fetchAllRequests() {
        return new Promise((resolve, reject) => {
            db.collection("requests").get().then((querySnapshot) => {
                adminAllRequests = [];
                totalDocuments = querySnapshot.size;

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    data.id = doc.id;
                    adminAllRequests.push(data);
                });
                resolve();
            }).catch((error) => {
                console.error("Error fetching requests:", error);
                reject(error);
            });
        });
    }

    function displayRequests() {
        const startIndex = (adminCurrentPage - 1) * adminItemsPerPage;
        const endIndex = startIndex + parseInt(adminItemsPerPage);
        const pageRequests = adminAllRequests.slice(startIndex, endIndex);

        populateRequestsTable(pageRequests);
        updatePaginationInfo();
        updatePaginationButtons();
        calculateAndDisplayStats(); // Update stats
    }

    function populateRequestsTable(requests) {
        const tableBody = $("#admin-requests-table tbody");
        tableBody.empty();

        requests.forEach((request) => {
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
    }

    function updatePaginationInfo() {
        const totalPages = Math.ceil(totalDocuments / adminItemsPerPage);
        $("#adminPageInfo").text(`Page ${adminCurrentPage} of ${totalPages}`);
    }

    function updatePaginationButtons() {
        const totalPages = Math.ceil(totalDocuments / adminItemsPerPage);
        $("#adminPrevPage").prop("disabled", adminCurrentPage === 1);
        $("#adminNextPage").prop("disabled", adminCurrentPage === totalPages);
    }

    $("#adminPrevPage").click(() => {
        if (adminCurrentPage > 1) {
            adminCurrentPage--;
            displayRequests();
        }
    });

    $("#adminNextPage").click(() => {
        const totalPages = Math.ceil(totalDocuments / adminItemsPerPage);
        if (adminCurrentPage < totalPages) {
            adminCurrentPage++;
            displayRequests();
        }
    });

    $("#adminItemsPerPage").change(() => {
        adminItemsPerPage = parseInt($(this).val());
        adminCurrentPage = 1;
        displayRequests();
    });

    $(document).on('click', '.items-per-page-btn', function() {
        adminItemsPerPage = parseInt($(this).data('items'));
        adminCurrentPage = 1;
        displayRequests();
        updateActivePerPageButton(this);
    });

    function updateActivePerPageButton(clickedButton) {
        $('.items-per-page-btn').removeClass('active');
        $(clickedButton).addClass('active');
    }

    function initializePerPageButtons() {
        adminItemsPerPage = 10;
        $('.items-per-page-btn[data-items="10"]').addClass('active');
    }

    initializePerPageButtons();

    function calculateAndDisplayStats() {
        let submittedCount = 0;
        let inProgressCount = 0;
        let completedCount = 0;
        let cancelledCount = 0;

        adminAllRequests.forEach(request => {
            switch (request.status) {
                case "Submitted":
                    submittedCount++;
                    break;
                case "In Progress":
                    inProgressCount++;
                    break;
                case "Completed":
                    completedCount++;
                    break;
                case "Cancelled":
                    cancelledCount++;
                    break;
            }
        });

        $("#submitted-count").text(submittedCount);
        $("#in-progress-count").text(inProgressCount);
        $("#completed-count").text(completedCount);
        $("#cancelled-count").text(cancelledCount);
    }
});