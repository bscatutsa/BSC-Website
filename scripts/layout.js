/*
  Shared layout loader.

  Purpose:
  - Inject one shared nav and one shared footer into every page.
  - Eliminate duplicated nav/footer markup across HTML documents.
*/

(function () {
    /*
      Resolve repo-root prefix based on current URL path:
      - root page (index.html): "."
      - page inside /pages/: ".."
    */
    function getRootPrefix() {
        const path = (window.location.pathname || '').replace(/\\/g, '/');
        return path.includes('/pages/') ? '..' : '.';
    }

    /* Replace template placeholders like {{root}} with computed prefix. */
    function withRootTokens(html, rootPrefix) {
        return html.replace(/\{\{root\}\}/g, rootPrefix);
    }

    /* Fetch + mount a single partial into its target container. */
    async function injectPartial(selector, partialName, rootPrefix) {
        const mount = document.querySelector(selector);
        if (!mount) return;

        const partialPath = `${rootPrefix}/partials/${partialName}`;
        const response = await fetch(partialPath, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Failed to load partial: ${partialPath} (${response.status})`);
        }

        const raw = await response.text();
        mount.innerHTML = withRootTokens(raw, rootPrefix);
    }

    async function loadSharedLayout() {
        const rootPrefix = getRootPrefix();

        try {
            await Promise.all([
                injectPartial('#site-nav', 'nav.html', rootPrefix),
                injectPartial('#site-footer', 'footer.html', rootPrefix)
            ]);

            // Notify other scripts (script.js) that nav/footer now exist in DOM.
            document.dispatchEvent(new Event('layout:ready'));

            if (typeof window.syncNavOffset === 'function') {
                window.syncNavOffset();
            }
        } catch (error) {
            console.error('Shared layout injection failed:', error);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadSharedLayout);
    } else {
        loadSharedLayout();
    }
})();
