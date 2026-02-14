/*
  Global site behavior:
  1) Reveal elements with `.hidden` as they scroll into view.
  2) Keep `--nav-offset` synced to the fixed nav height for spacing/anchors.
  3) Handle mobile menu open/close state.
  4) Mark the active nav link based on current path.
*/

/* Reveal-on-scroll observer for any element tagged with `.hidden`. */
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
            /* Unobserve once shown to avoid repeated class churn. */
            observer.unobserve(entry.target);
        }
    });
}, {
    root: null,
    /* Start revealing a bit before fully entering viewport. */
    rootMargin: '120px 0px -10% 0px',
    threshold: 0.01
});

/* Wire all hidden elements into the observer at startup. */
const hiddenElements = document.querySelectorAll('.hidden');
hiddenElements.forEach((el) => observer.observe(el));

/*
  Sync CSS `--nav-offset` to the real rendered nav height.
  This prevents fixed nav overlap across pages, breakpoints, and orientation changes.
*/
function syncNavOffset() {
    const navBar = document.querySelector('.nav-bar');
    if (!navBar) return;

    const navHeight = Math.ceil(navBar.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--nav-offset', `${navHeight}px`);
}

/* Expose for layout loader and other scripts that need a post-insert sync. */
window.syncNavOffset = syncNavOffset;

/* Mobile navbar menu toggle (opened by clicking the org name on small screens). */
function toggleMenu() {
    const navLinks = document.querySelector('.nav-links');
    const menuIcon = document.querySelector('.menu-icon');
    const name = document.querySelector('.name');
    if (!navLinks) return;

    if (navLinks.classList.contains('active')) {
        /* Close mobile menu. */
        navLinks.classList.remove('active');
        if (name) name.classList.remove('menu-open');
        if (menuIcon) menuIcon.innerHTML = "&#9776;"; /* hamburger */
    } else {
        /* Open mobile menu. */
        navLinks.classList.add('active');
        if (name) name.classList.add('menu-open');
        if (menuIcon) menuIcon.innerHTML = "&#10006;"; /* X close icon */
    }

    syncNavOffset();
}

/* Mark current page link in nav after nav markup exists in DOM. */
function markActiveNavLink() {
    const currentPath = window.location.pathname;
    const currentFile = currentPath.substring(currentPath.lastIndexOf('/') + 1) || 'index.html';
    const navLinks = document.querySelectorAll('.nav-links a');
    if (!navLinks.length) return;

    navLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        const linkFile = href.substring(href.lastIndexOf('/') + 1) || 'index.html';

        link.classList.add('nav-link');
        if (linkFile.toLowerCase() === currentFile.toLowerCase()) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

/* Bind global resize listeners once; avoid duplicate handlers. */
let navOffsetListenersBound = false;
function bindNavOffsetListenersOnce() {
    if (navOffsetListenersBound) return;
    window.addEventListener('resize', syncNavOffset);
    window.addEventListener('orientationchange', syncNavOffset);
    navOffsetListenersBound = true;
}

/* Re-runnable nav initializer for both static and dynamically injected nav markup. */
function initializeNavigation() {
    markActiveNavLink();
    syncNavOffset();
    bindNavOffsetListenersOnce();
}

/* Initial pass when DOM is ready. */
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
});

/* Re-run after shared layout partials are injected. */
document.addEventListener('layout:ready', initializeNavigation);

/* Final layout sync after all assets load. */
window.addEventListener('load', syncNavOffset);
