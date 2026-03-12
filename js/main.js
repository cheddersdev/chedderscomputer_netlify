/* ============================================================
   CHEDDERS COMPUTER — GLOBAL JS
   chedderscomputer.store
   Used by: index.html, shop.html, about.html,
            services.html, blog.html, contact.html
============================================================ */

(function () {
    'use strict';

    /* ========================================================
       1. LOADING OVERLAY
       Shows a branded splash on every page load.
    ======================================================== */
    const loader = document.getElementById('cc-loader');
    let domReady = false;
    let minTimePassed = false;

    function tryHideLoader() {
        if (!loader) return;
        if (domReady && minTimePassed) {
            loader.classList.add('hidden');
            setTimeout(function () {
                if (loader) loader.style.display = 'none';
            }, 520);
        }
    }

    // Minimum 1.4s display so the animation is visible
    setTimeout(function () {
        minTimePassed = true;
        tryHideLoader();
    }, 1400);

    document.addEventListener('DOMContentLoaded', function () {
        domReady = true;
        tryHideLoader();
    });

    // Hard fallback — never block the page more than 4s
    window.addEventListener('load', function () {
        domReady = true;
        tryHideLoader();
        setTimeout(function () {
            if (loader) {
                loader.classList.add('hidden');
                loader.style.display = 'none';
            }
        }, 4000);
    });


    /* ========================================================
       2. BACK TO TOP BUTTON
    ======================================================== */
    document.addEventListener('DOMContentLoaded', function () {

        var btt = document.getElementById('backToTop');
        if (btt) {
            window.addEventListener('scroll', function () {
                if (window.scrollY > 380) {
                    btt.classList.add('visible');
                } else {
                    btt.classList.remove('visible');
                }
            }, { passive: true });

            btt.addEventListener('click', function () {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }


        /* ====================================================
           3. SCROLL REVEAL  (IntersectionObserver)
        ==================================================== */
        var revealEls = document.querySelectorAll('.reveal');
        if (revealEls.length) {
            var revealObs = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    if (e.isIntersecting) {
                        e.target.classList.add('revealed');
                        revealObs.unobserve(e.target);
                    }
                });
            }, { threshold: 0.12 });
            revealEls.forEach(function (el) { revealObs.observe(el); });
        }


        /* ====================================================
           4. COUNTER ANIMATION
           Looks for .counter-value[data-target]
        ==================================================== */
        var counterEls = document.querySelectorAll('.counter-value');
        if (counterEls.length) {
            var countObs = new IntersectionObserver(function (entries, obs) {
                entries.forEach(function (e) {
                    if (!e.isIntersecting) return;
                    var el = e.target;
                    var target = parseInt(el.dataset.target, 10);
                    var isDecimalDisplay = (el.dataset.decimal === 'true');
                    var count = 0;
                    var steps = 60;
                    var increment = target / steps;

                    (function tick() {
                        count += increment;
                        if (count < target) {
                            el.textContent = isDecimalDisplay
                                ? (count / 10).toFixed(1)
                                : Math.ceil(count).toLocaleString();
                            requestAnimationFrame(tick);
                        } else {
                            el.textContent = isDecimalDisplay
                                ? (target / 10).toFixed(1)
                                : target.toLocaleString();
                        }
                    })();
                    obs.unobserve(el);
                });
            }, { threshold: 0.5 });

            counterEls.forEach(function (el) { countObs.observe(el); });
        }


        /* ====================================================
           5. ACTIVE NAV LINK (highlight current page)
        ==================================================== */
        var currentPath = window.location.pathname;
        var currentFile = currentPath.split('/').pop() || 'index.html';

        document.querySelectorAll('.cc-navbar .nav-link').forEach(function (link) {
            var href = (link.getAttribute('href') || '').split('/').pop();
            if (href === currentFile || (currentFile === '' && href === 'index.html')) {
                link.classList.add('active');
            }
        });


        /* ====================================================
           6. SMOOTH SCROLL for anchor links (excluding # only)
        ==================================================== */
        document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
            anchor.addEventListener('click', function (e) {
                var href = this.getAttribute('href');
                if (href === '#') return;
                var target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });

    }); // end DOMContentLoaded


    /* ========================================================
       7. GLOBAL TOAST NOTIFICATION HELPER
       Usage: window.showToast('Message!', 'success' | 'error')
    ======================================================== */
    window.showToast = function (msg, type) {
        type = type || 'success';
        var t = document.createElement('div');
        t.style.cssText = [
            'position:fixed;top:24px;right:24px;',
            'background:' + (type === 'success'
                ? 'linear-gradient(135deg,#1d6ef5,#06b6d4)'
                : '#ef4444') + ';',
            'color:#fff;padding:13px 20px;border-radius:12px;',
            'box-shadow:0 10px 30px rgba(0,0,0,.3);z-index:99999;',
            "font-family:'DM Sans',sans-serif;font-weight:600;font-size:.9rem;",
            'opacity:0;transform:translateY(-12px) translateX(12px);',
            'transition:all .3s ease;max-width:300px;line-height:1.4;'
        ].join('');
        t.textContent = msg;
        document.body.appendChild(t);
        requestAnimationFrame(function () {
            t.style.opacity = '1';
            t.style.transform = 'none';
        });
        setTimeout(function () {
            t.style.opacity = '0';
            t.style.transform = 'translateY(-10px)';
            setTimeout(function () { t.remove(); }, 350);
        }, 3200);
    };

})();
