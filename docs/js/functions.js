// functions.js

/**********************************************
 *
 *
 * Auth Functions
 *
 *
 ***********************************************/

// Function to handle user login from the login page
function loginUser() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginError = document.getElementById('loginError');

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            window.location.href = 'dashboard.html';
        })
        .catch((error) => {
            const errorMessage = error.message;
            loginError.textContent = errorMessage; // Display login error message
        });
}

// Function to handle user logout
function logout() {
    auth.signOut().catch(function (error) {
        console.error("Logout failed:", error);
    });
}

// Function to read data from Firebase Realtime Database
function readData(dataDisplayId) {
    const dataRef = database.ref('exampleData');
    const dataDisplay = document.getElementById(dataDisplayId);

    dataRef.on('value', (snapshot) => {
        const data = snapshot.val();

        if (data) {
            dataDisplay.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
        } else {
            dataDisplay.innerHTML = '<p class="text-muted">No data found.</p>';
        }
    });
}

/**********************************************
 *
 *
 * Request Functions
 *
 *
 ***********************************************/

// Function to add a new request to Firestore
async function addNewRequest() {
    const user = firebase.auth().currentUser;

    if (!user) {
        alert("Please log in to add a request.");
        return false;
    }

    if (!user.emailVerified) {
        alert("Please verify your email address to add a request.");
        return false;
    }

    const requestName = document.getElementById('requestName').value;
    const requestLink = document.getElementById('requestLink').value;
    const requestNotes = document.getElementById('requestNotes').value;
    const requestDateNeeded = document.getElementById('requestDateNeeded').value;
    const requestFile = document.getElementById('requestFile').files[0];

    const success = await addNewRequestToFirestore(requestName, requestLink, requestNotes, requestDateNeeded, requestFile);

    return success;
}

async function addNewRequestToFirestore(requestName, requestLink, requestNotes, requestDateNeeded, requestFile) {
    try {
        const db = firebase.firestore();
        const user = firebase.auth().currentUser;

        if (!user) {
            console.error("No user logged in.");
            return false;
        }

        const requestData = {
            requestName: requestName,
            requestLink: requestLink,
            requestNotes: requestNotes,
            requestDateNeeded: requestDateNeeded,
            dateAdded: firebase.firestore.FieldValue.serverTimestamp(),
            status: "Submitted", // Or whatever initial status you want
            userId: user.uid,
        };

        if (requestFile) {
            // Handle file upload (you'll need to adapt this to your storage setup)
            const storageRef = firebase.storage().ref();
            const fileRef = storageRef.child(`requests/${user.uid}/${requestFile.name}`);
            await fileRef.put(requestFile);
            const fileUrl = await fileRef.getDownloadURL();
            requestData.fileUrl = fileUrl;
        }

        await db.collection("requests").add(requestData);

        return true; // Success
    } catch (error) {
        console.error("Error adding request:", error);
        return false; // Failure
    }
}

// Function to generate a random request ID
function generateRequestId() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let requestId = '';
    for (let i = 0; i < 6; i++) { // Changed loop to 5 iterations
        requestId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return requestId;
}

async function cancelRequest(requestId) {
    const db = firebase.firestore();
    await db.collection('requests').doc(requestId).update({
        status: 'Cancelled'
    });
}

function goBack() {
    window.location.href = 'dashboard.html';
}

// Dashboard-specific functions
async function loadUserRequests(userId) {
    const db = firebase.firestore();
    let allRequests = [];
    const requestsRef = db.collection('requests').where('userId', '==', userId).orderBy('dateAdded', 'desc');

    const snapshot = await requestsRef.get();
    snapshot.forEach(doc => {
        allRequests.push({ id: doc.id, ...doc.data() });
    });

    return allRequests;
}

function sortRequests(requests, sortBy, ascending = true) {
    return requests.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        if (sortBy === 'dateAdded' && valA && valB) {
            valA = valA.toDate();
            valB = valB.toDate();
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }

        if (valA < valB) {
            return ascending ? -1 : 1;
        }
        if (valA > valB) {
            return ascending ? 1 : -1;
        }
        return 0;
    });
}

// Function to get status badge class
function getStatusBadgeClass(status) {
    let badgeClass = 'badge-secondary'; // Default badge class

    switch (status.toLowerCase()) {
        case 'submitted':
            badgeClass = 'badge-info';
            break;
        case 'processing':
            badgeClass = 'badge-warning';
            break;
        case 'completed':
            badgeClass = 'badge-success';
            break;
        case 'rejected':
            badgeClass = 'badge-danger';
            break;
        case 'cancelled':
            badgeClass = 'badge-danger';
            break;
    }

    return badgeClass;
}

// Function to display request details
function displayRequestDetails(request, container) {
    let adminNotesList = 'N/A';
    const badgeClass = getStatusBadgeClass(request.status); // Get badge class

    if (request.adminNotes) {
        const notes = request.adminNotes.split('\n\n');
        adminNotesList = '<ul>';
        notes.forEach(note => {
            adminNotesList += `<li>${note}</li>`;
        });
        adminNotesList += '</ul>';
    }

    const detailsHtml = `
        <p><strong>Request ID:</strong> ${request.id}</p>
        <p><strong>Request Name:</strong> ${request.requestName}</p>
        <p><strong>Date Added:</strong> ${request.dateAdded.toDate().toLocaleDateString()}</p>
        <p><strong>Status:</strong> <span class="badge ${badgeClass}">${request.status}</span></p>
        <p><strong>Request Link:</strong> <a href="${request.requestLink}">${request.requestLink}</a></p>
        <p><strong>Notes:</strong> ${request.requestNotes || 'N/A'}</p>
        <p><strong>Date Needed By:</strong> ${request.requestDateNeeded || 'N/A'}</p>
        <p><strong>Admin Notes:</strong> ${adminNotesList}</p>
    `;
    container.innerHTML = detailsHtml;
}

// Function to get details of a specific request
async function getRequestDetails(requestId) {
    try {
        const db = firebase.firestore();
        const requestDoc = await db.collection('requests').doc(requestId).get();

        if (requestDoc.exists) {
            return { id: requestDoc.id, ...requestDoc.data() };
        } else {
            console.error("No such document!");
            return null;
        }
    } catch (error) {
        console.error("Error getting request details:", error);
        return null;
    }
}

/**********************************************
 *
 *
 * Account Functions
 *
 *
 ***********************************************/

function displayUserDetails(user) {
    let verifyButton = '';
    if (!user.emailVerified) {
        verifyButton =
            `<button class="btn btn-sm btn-warning" id="verifyEmailButton">Verify Email</button>`;
    }

    const content = `
        <div class="row">
            <div class="col-md-6">
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Display Name:</strong> ${user.displayName || 'Not set'} 
                    <i id="editDisplayNameIcon" class="fas fa-edit" style="cursor: pointer;"></i>
                </p>
                <p><strong>Photo URL:</strong> ${user.photoURL ? `<img src="${user.photoURL}" alt="Profile Photo" style="max-width: 100px;">` : 'N/A'}</p>
            </div>
            <div class="col-md-6">
                <p><strong>UID:</strong> ${user.uid}</p>
                <p><strong>Email Verified:</strong> ${user.emailVerified ? 'Yes' : 'No'} ${verifyButton}</p>
                <p><strong>Creation Time:</strong> ${new Date(user.metadata.creationTime).toLocaleString()}</p>
                <p><strong>Last Sign In Time:</strong> ${new Date(user.metadata.lastSignInTime).toLocaleString()}</p>
            </div>
        </div>
    `;
    document.getElementById('accountDetailsContent').innerHTML = content;

    if (!user.emailVerified) {
        document.getElementById('verifyEmailButton').addEventListener('click', () => {
            user.sendEmailVerification()
                .then(() => {
                    alert("Verification email sent. Please check your inbox.");
                    displayUserDetails(user); // Refresh to hide the button
                })
                .catch((error) => {
                    alert("Error sending verification email: " + error.message);
                });
        });
    }
}
async function updateDisplayName() {
    const newDisplayName = document.getElementById('displayNameInput').value;
    if (newDisplayName) {
        try {
            await auth.currentUser.updateProfile({
                displayName: newDisplayName
            });
            displayUserDetails(auth.currentUser); // Refresh display
            alert("Display name updated!");
        } catch (error) {
            alert("Error updating display name: " + error.message);
        }
    } else {
        alert("Please enter a display name.");
    }
}

/**********************************************
 *
 *
 * Admin Functions
 *
 *
 ***********************************************/

async function checkAdmin(uid) {
    const adminUid = 'lk0SSxWRWKU1ST9faUiZcuDUDh62';
    const result = uid === adminUid;
    console.log(`checkAdmin: uid=${uid}, adminUid=${adminUid}, result=${result}`);
    return result;
}

async function loadAdminContent() {
    const requestsTableBody = document.getElementById('allRequestsTableBody');
    const pagination = document.getElementById('pagination');
    let allRequests = await loadAllRequests();

    const requestsPerPage = 10;
    let currentPage = 1;

    function displayRequests(requests, page) {
        const startIndex = (page - 1) * requestsPerPage;
        const endIndex = startIndex + requestsPerPage;
        const requestsToDisplay = requests.slice(startIndex, endIndex);

        requestsTableBody.innerHTML = '';

        requestsToDisplay.forEach(request => {
            const badgeClass = getStatusBadgeClass(request.status); // Get badge class
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${request.id}</td>
                <td>${request.requestName}</td>
                <td>${request.dateAdded ? request.dateAdded.toDate().toLocaleDateString() : 'N/A'}</td>
                <td><span class="badge ${badgeClass}">${request.status}</span></td>
                <td>${request.requestDateNeeded || 'N/A'}</td>
                <td>${request.userId}</td>
                <td><a href="admin-request-details.html?id=${request.id}">View Details</a></td>
            `;
            requestsTableBody.appendChild(row);
        });
    }

    function displayPagination(requests) {
        const totalPages = Math.ceil(requests.length / requestsPerPage);
        pagination.innerHTML = '';

        for (let i = 1; i <= totalPages; i++) {
            const listItem = document.createElement('li');
            listItem.classList.add('page-item');
            if (i === currentPage) {
                listItem.classList.add('active');
            }
            const link = document.createElement('a');
            link.classList.add('page-link');
            link.href = '#';
            link.textContent = i;
            link.addEventListener('click', () => {
                currentPage = i;
                displayRequests(requests, currentPage);
                displayPagination(requests);
            });
            listItem.appendChild(link);
            pagination.appendChild(listItem);
        }
    }

    displayRequests(allRequests, currentPage);
    displayPagination(allRequests);

    document.querySelectorAll('#allRequestsTable th[data-sort]').forEach(header => {
        header.addEventListener('click', () => {
            const sortBy = header.getAttribute('data-sort');
            const ascending = header.classList.contains('asc') ? false : true;
            allRequests = sortRequests(allRequests, sortBy, ascending);
            displayRequests(allRequests, currentPage);
            displayPagination(allRequests);

            document.querySelectorAll('#allRequestsTable th[data-sort]').forEach(th => {
                th.classList.remove('asc', 'desc');
            });
            header.classList.add(ascending ? 'asc' : 'desc');
        });
    });
}

async function loadAllRequests() {
    try {
        const db = firebase.firestore();
        const querySnapshot = await db.collection('requests').get();
        const requests = [];
        querySnapshot.forEach(doc => {
            requests.push({ id: doc.id, ...doc.data() });
        });
        return requests;
    } catch (error) {
        console.error("Error loading requests:", error);
        return [];
    }
}

function displayAllRequests(requests, tableBody) {
    tableBody.innerHTML = ''; // Clear existing table rows

    requests.forEach(request => {
        const badgeClass = getStatusBadgeClass(request.status); // Get badge class
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${request.id}</td>
            <td>${request.requestName}</td>
            <td>${request.dateAdded ? request.dateAdded.toDate().toLocaleDateString() : 'N/A'}</td>
            <td><span class="badge ${badgeClass}">${request.status}</span></td>
            <td>${request.requestDateNeeded || 'N/A'}</td>
            <td>${request.userId}</td>
            <td><a href="admin-request-details.html?id=${request.id}">View Details</a></td>
        `;
        tableBody.appendChild(row);
    });
}

async function updateRequestStatus(requestId, newStatus) {
    const db = firebase.firestore();
    await db.collection('requests').doc(requestId).update({
        status: newStatus
    });
}

async function updateAdminNotes(requestId, newNotes) {
    const db = firebase.firestore();
    const requestDoc = await db.collection('requests').doc(requestId).get();

    if (requestDoc.exists) {
        const existingNotes = requestDoc.data().adminNotes || '';
        const timestamp = new Date().toLocaleString();
        const updatedNotes = existingNotes + (existingNotes ? '\n\n' : '') + `${timestamp} - ${newNotes}`;

        await db.collection('requests').doc(requestId).update({
            adminNotes: updatedNotes
        });
    }
}

function displayAdminRequestDetails(request, container) {
    const badgeClass = getStatusBadgeClass(request.status);
    let adminNotesList = 'N/A';

    if (request.adminNotes) {
        const notes = request.adminNotes.split('\n\n');
        adminNotesList = '<ul>';
        notes.forEach(note => {
            adminNotesList += `<li>${note}</li>`;
        });
        adminNotesList += '</ul>';
    }

    const detailsHtml = `
        <p><strong>Request ID:</strong> ${request.id}</p>
        <p><strong>Status:</strong> <span class="badge ${badgeClass}">${request.status}</span> <i class="fas fa-pencil-alt" id="editStatusIcon" style="cursor: pointer;"></i></p>
        <p><strong>Request Name:</strong> ${request.requestName}</p>
        <p><strong>Date Added:</strong> ${request.dateAdded.toDate().toLocaleDateString()}</p>
        <p><strong>Request Link:</strong> <a href="${request.requestLink}">${request.requestLink}</a></p>
        <p><strong>Notes:</strong> ${request.requestNotes || 'N/A'}</p>
        <p><strong>Date Needed By:</strong> ${request.requestDateNeeded || 'N/A'}</p>
        <p><strong>User ID:</strong> ${request.userId}</p>
        <p><strong>Admin Notes:</strong> ${adminNotesList}</p>
    `;
    container.innerHTML = detailsHtml;
}

function admingoBack() {
    window.location.href = 'admin.html';
}

function sortTable(table, column, ascending) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));

    rows.sort((a, b) => {
        let aVal = a.querySelectorAll('td')[column].textContent.trim();
        let bVal = b.querySelectorAll('td')[column].textContent.trim();

        const sortType = table.querySelector(`th[data-sort]:nth-child(${column + 1})`).getAttribute('data-sort');

        if (sortType === 'dateAdded' || sortType === 'requestDateNeeded') {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
        } else if (sortType === 'id' || sortType === 'userId'){
            aVal = parseInt(aVal, 10);
            bVal = parseInt(bVal, 10);
        }

        if (ascending) {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });

    // Remove existing rows and append sorted rows
    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }
    rows.forEach(row => tbody.appendChild(row));
}

function setupTableSorting() {
    const table = document.getElementById('allRequestsTable');
    const headers = table.querySelectorAll('th[data-sort]');

    headers.forEach((header, index) => {
        let ascending = true;
        header.addEventListener('click', () => {
            // Remove previous sorting indicators
            headers.forEach(h => {
                h.classList.remove('sorted-asc', 'sorted-desc');
            });

            sortTable(table, index, ascending);

            // Add sorting indicator to the clicked header
            if (ascending) {
                header.classList.add('sorted-asc');
            } else {
                header.classList.add('sorted-desc');
            }

            ascending = !ascending; // Toggle sorting order
        });
    });
}