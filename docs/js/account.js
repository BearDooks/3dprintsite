import { auth } from './firebase-config.js'; // Import auth

$(document).ready(function() {
    // Display user account details on account.html
    if (window.location.pathname.includes("account.html")) {
        auth.onAuthStateChanged(user => {
            if (user) {
                $("#user-email").text(user.email);
                $("#user-uid").text(user.uid);
                $("#user-email-verified").text(user.emailVerified ? "Yes" : "No");
                $("#user-creation-time").text(new Date(user.metadata.creationTime).toLocaleString());
                $("#user-last-sign-in-time").text(new Date(user.metadata.lastSignInTime).toLocaleString());
                $("#user-display-name").text(user.displayName || "Not set");

                if (!user.emailVerified) {
                    $("#verify-email-button").show();
                }

                $("#verify-email-button").off('click').on('click', function() { // Remove prior event handlers, and add a single one.
                    user.sendEmailVerification()
                        .then(function() {
                            alert("Verification email sent. Please check your inbox.");
                        })
                        .catch(function(error) {
                            alert("Failed to send verification email: " + error.message);
                        });
                });

                // Modal functionality
                const modal = $("#edit-modal");
                const span = $("#edit-modal .close")[0];
                $("#edit-display-name").click(function() {
                    modal.css("display", "block");
                });
                span.onclick = function() {
                    modal.css("display", "none");
                };
                window.onclick = function(event) {
                    if (event.target == modal[0]) {
                        modal.css("display", "none");
                    }
                };
                $("#save-display-name").click(function() {
                    const newDisplayName = $("#new-display-name").val();
                    user.updateProfile({
                        displayName: newDisplayName
                    }).then(() => {
                        $("#user-display-name").text(newDisplayName);
                        modal.css("display", "none");
                    }).catch((error) => {
                        alert(error.message);
                    });
                });
            } else {
                window.location.href = "login.html";
            }
        });
    }
});