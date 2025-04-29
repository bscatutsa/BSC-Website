/* On Scroll Animation */
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        console.log(entry)
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
        }
        else {
            entry.target.classList.remove('show');
        }
    });
});

const hiddenElements = document.querySelectorAll('.hidden');
hiddenElements.forEach((el) => observer.observe(el));

/* mobile navbar menu */
function toggleMenu() {
    const navLinks = document.querySelector('.nav-links');
    const menuIcon = document.querySelector('.menu-icon');

    if (navLinks.classList.contains('active')) {
        // If already active, we are closing the menu
        navLinks.classList.remove('active');
        menuIcon.innerHTML = "☰"; // back to hamburger
    } else {
        // If not active, we are opening the menu
        navLinks.classList.add('active');
        menuIcon.innerHTML = "✖"; // change to X
    }
}
