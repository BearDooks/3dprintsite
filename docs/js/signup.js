import { auth, db } from './firebase-config.js'; // Import auth and db

$(document).ready(function() {
    $('#signupForm').submit(function(e) {
        e.preventDefault();
        const email = $('#signupEmail').val();
        const password = $('#signupPassword').val();

        console.log("Signup form submitted. Email:", email, "Password:", password);
        console.log("Auth object:", auth);
        console.log("createUserWithEmailAndPassword:", createUserWithEmailAndPassword); // Log the function directly

        createUserWithEmailAndPassword(auth, email, password) // Use the imported function
            .then((userCredential) => {
                const user = userCredential.user;
                console.log('User signed up successfully:', user);
                alert('Account created! Please log in.');
                window.location.href = 'login.html';
            })
            .catch((error) => {
                const errorCode = error.code;
                const errorMessage = error.message;
                console.error('Signup error:', errorCode, errorMessage);
                $('#signup-error').text(errorMessage);
            });
    });

    $('#googleSignupButton').click(function() {
        signInWithPopup(auth, provider) // Use imported function
            .then((result) => {
                const user = result.user;
                console.log('User signed up with Google:', user);
                window.location.href = 'dashboard.html';
            })
            .catch((error) => {
                const errorCode = error.code;
                const errorMessage = error.message;
                console.error('Google signup error:', errorCode, errorMessage);
                $('#signup-error').text(errorMessage);
            });
    });
});