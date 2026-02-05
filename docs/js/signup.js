import { auth, db } from './firebase-config.js'; // Import auth and db
import { showToast } from './functions.js';

$(document).ready(function () {
    $('#signupForm').submit(function (e) {
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
                showToast('Account created! Please log in.');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            })
            .catch((error) => {
                const errorCode = error.code;
                const errorMessage = error.message;
                console.error('Signup error:', errorCode, errorMessage);
                showToast(errorMessage, 'error');
            });
    });
});