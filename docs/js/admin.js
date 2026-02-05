import { auth, db } from './firebase-config.js';
import { displayRequestDetails, showToast, formatStatus } from './functions.js';

$(document).ready(function () {
    const adminUID = "lk0SSxWRWKU1ST9faUiZcuDUDh62";

    let adminCurrentPage = 1;
    let adminItemsPerPage = 10;
    let adminAllRequests = [];
    let currentFilteredRequests = [];
    let totalDocuments = 0;

    let authStateChecked = false;
    let requestsAlreadyFetched = false;

    auth.onAuthStateChanged(user => {
        if (window.location.pathname.includes("admin.html")) {
            if (user && user.uid === adminUID) {
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
                            let newAdminNotes = request.adminNotes; // Initialize with existing notes

                            // Explicitly check for empty string BEFORE modifying newAdminNotes
                            if (adminNotes.trim() === "") {
                                // Do not add a blank note
                            } else {
                                newAdminNotes = request.adminNotes ? `${request.adminNotes}\n${currentDate}: ${adminNotes.trim()}` : `${currentDate}: ${adminNotes.trim()}`;
                            }

                            db.collection("requests").doc(requestId).update({
                                adminNotes: newAdminNotes,
                                status: status
                            }).then(() => {
                                showToast("Request updated successfully.", "success");
                                setTimeout(() => window.location.reload(), 1500);
                            }).catch((error) => {
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
    });

    $("#back-to-admin").click(function () {
        window.location.href = "admin.html";
    });

    function fetchAllRequests() {
        // Show Skeletons
        const tableBody = $("#admin-requests-table tbody");
        tableBody.empty();
        for (let i = 0; i < 5; i++) {
            tableBody.append(`
                <tr class="skeleton-row">
                    <td><div class="skeleton"></div></td>
                    <td><div class="skeleton"></div></td>
                    <td><div class="skeleton"></div></td>
                    <td><div class="skeleton"></div></td>
                    <td><div class="skeleton"></div></td>
                    <td><div class="skeleton"></div></td>
                    <td><div class="skeleton"></div></td>
                    <td><div class="skeleton"></div></td>
                </tr>
            `);
        }

        return new Promise((resolve, reject) => {
            db.collection("requests").get().then((querySnapshot) => {
                adminAllRequests = [];
                totalDocuments = querySnapshot.size;

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    data.id = doc.id;
                    adminAllRequests.push(data);
                });
                currentFilteredRequests = adminAllRequests;
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
        const pageRequests = currentFilteredRequests.slice(startIndex, endIndex);

        populateRequestsTable(pageRequests);
        updatePaginationInfo();
        updatePaginationButtons();
        calculateAndDisplayStats(); // Update stats
    }

    function populateRequestsTable(requests) {
        const tableBody = $("#admin-requests-table tbody");
        tableBody.empty();

        if (requests.length === 0) {
            tableBody.append(`
               <tr>
                   <td colspan="8">
                       <div class="empty-state">
                           <i class="fas fa-inbox"></i>
                           <p>No requests found.</p>
                       </div>
                   </td>
               </tr>
           `);
            return;
        }

        requests.forEach((request) => {
            const row = `
                <tr onclick="window.location.href='admin-request-details.html?id=${request.id}'">
                    <td data-label="Request Name">${request.requestName || ""}</td>
                    <td data-label="Request Link">${request.requestLink || ""}</td>
                    <td data-label="Request Notes">${request.requestNotes || ""}</td>
                    <td data-label="Status">${formatStatus(request.status)}</td>
                    <td data-label="Date Added">${request.dateAdded ? request.dateAdded.toDate().toLocaleString() : ""}</td>
                    <td data-label="Date Needed">${request.requestDateNeeded || ""}</td>
                    <td data-label="User ID"><span class="mono-text">${request.userId || ""}</span></td>
                    <td data-label="Action"><button class="cta-button secondary small">View</button></td>
                </tr>
            `;
            tableBody.append(row);
        });
    }

    function updatePaginationInfo() {
        const totalPages = Math.ceil(currentFilteredRequests.length / adminItemsPerPage) || 1;
        $("#adminPageInfo").text(`Page ${adminCurrentPage} of ${totalPages}`);
    }

    function updatePaginationButtons() {
        const totalPages = Math.ceil(currentFilteredRequests.length / adminItemsPerPage) || 1;
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
        const totalPages = Math.ceil(currentFilteredRequests.length / adminItemsPerPage) || 1;
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

    $(document).on('click', '.items-per-page-btn', function () {
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

    // --- Search Functionality ---
    $("#searchInput").on("keyup", function () {
        const value = $(this).val().toLowerCase();

        currentFilteredRequests = adminAllRequests.filter(request => {
            const name = (request.requestName || "").toLowerCase();
            const status = (request.status || "").toLowerCase();
            const notes = (request.requestNotes || "").toLowerCase();
            const user = (request.userId || "").toLowerCase();
            return name.includes(value) || status.includes(value) || notes.includes(value) || user.includes(value);
        });

        adminCurrentPage = 1;
        displayRequests();
    });

    let statusChartInstance = null;

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

        // Render Chart
        const ctx = document.getElementById('statusChart').getContext('2d');

        if (statusChartInstance) {
            statusChartInstance.destroy();
        }

        statusChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Submitted', 'In Progress', 'Completed', 'Cancelled'],
                datasets: [{
                    data: [submittedCount, inProgressCount, completedCount, cancelledCount],
                    backgroundColor: [
                        '#3b82f6', // Blue
                        '#eab308', // Yellow
                        '#22c55e', // Green
                        '#ef4444'  // Red
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#e2e8f0', // Text primary
                            font: {
                                size: 14
                            }
                        }
                    }
                }
            }
        });
    }
});