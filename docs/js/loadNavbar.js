// loadNavbar.js
document.addEventListener('DOMContentLoaded', function() {
    fetch('navbar.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('navbar-container').innerHTML = data;

            // Run any navbar-related initialization here
            if (typeof auth !== 'undefined') {
                auth.onAuthStateChanged(function (user) {
                    if (user) {
                        document.getElementById('loginNavItem').style.display = 'none';
                        document.getElementById('userDropdownContainer').style.display = 'block';
                    } else {
                        document.getElementById('loginNavItem').style.display = 'block';
                        document.getElementById('userDropdownContainer').style.display = 'none';
                    }
                });
            } else {
                console.error("Firebase Auth not loaded. Please check firebaseConfig.js");
            }
        });
});