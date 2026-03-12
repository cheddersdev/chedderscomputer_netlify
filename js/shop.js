/* ============================================================
   CHEDDERS COMPUTER — SHOP JS
   Products: Laptops · Desktops · Servers · Printers
   Features: per-product RAM/Storage/Touchscreen config,
             category tabs, filters, cart, checkout modals
============================================================ */

'use strict';

/* ============================================================
   1. PRODUCT DATA
============================================================ */
var allProducts = [];

/* ============================================================
   2. CART STATE (localStorage persisted)
============================================================ */
var cart = JSON.parse(localStorage.getItem('cc_cart') || '[]');

function saveCart() {
    localStorage.setItem('cc_cart', JSON.stringify(cart));
    updateAllBadges();
}

function updateAllBadges() {
    var total = cart.reduce(function(s, i) { return s + i.quantity; }, 0);
    document.querySelectorAll('.cart-count-badge').forEach(function(el) {
        el.textContent = total;
        el.style.display = total > 0 ? 'flex' : 'none';
    });
}

/* ============================================================
   3. CONFIG HELPERS — get selected config for a card
============================================================ */
function getConfig(productId) {
    var ramEl  = document.querySelector('[data-config-ram="' + productId + '"]');
    var stgEl  = document.querySelector('[data-config-stg="' + productId + '"]');
    var tchEl  = document.querySelector('[data-config-tch="' + productId + '"]');
    return {
        ram:     ramEl  ? ramEl.value  : null,
        storage: stgEl  ? stgEl.value  : null,
        touch:   tchEl  ? tchEl.value  : null
    };
}

/* Price premium for upgrades */
function configPriceDelta(cfg, basePrice) {
    var delta = 0;
    if (cfg.storage) {
        if (cfg.storage.includes('2TB')) delta += basePrice * 0.08;
        if (cfg.storage.includes('4TB')) delta += basePrice * 0.16;
        if (cfg.storage.includes('8TB')) delta += basePrice * 0.22;
        if (cfg.storage.includes('10TB')) delta += basePrice * 0.30;
    }
    if (cfg.ram) {
        var ramNum = parseInt(cfg.ram);
        if (ramNum >= 32 && ramNum < 64)  delta += basePrice * 0.06;
        if (ramNum >= 64 && ramNum < 128) delta += basePrice * 0.12;
        if (ramNum >= 128)                delta += basePrice * 0.20;
    }
    if (cfg.touch === 'yes') delta += basePrice * 0.04;
    return Math.round(delta);
}

/* ============================================================
   4. ADD TO CART
============================================================ */
function addToCart(productId) {
    var product = allProducts.find(function(p) { return p.id === productId; });
    if (!product) return;

    var cfg   = getConfig(productId);
    var delta = configPriceDelta(cfg, product.basePrice);
    var finalPrice = product.basePrice + delta;

    /* Unique cart key includes config so different configs = different items */
    var cartKey = productId + '|' + (cfg.ram||'') + '|' + (cfg.storage||'') + '|' + (cfg.touch||'');
    var existing = cart.find(function(i) { return i.cartKey === cartKey; });

    if (existing) {
        existing.quantity++;
    } else {
        cart.push({
            cartKey: cartKey,
            id:      productId,
            name:    product.name,
            brand:   product.brand,
            image:   (product.images && product.images.length) ? product.images[0] : (product.image || ''),
            type:    product.type,
            price:   finalPrice,
            quantity: 1,
            config:  cfg
        });
    }
    saveCart();
    if (window.showToast) showToast(product.name + ' added to cart!');
}

function removeFromCart(cartKey) {
    cart = cart.filter(function(i) { return i.cartKey !== cartKey; });
    saveCart();
    renderCartItems();
}

function updateQuantity(cartKey, delta) {
    var item = cart.find(function(i) { return i.cartKey === cartKey; });
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) removeFromCart(cartKey);
    else { saveCart(); renderCartItems(); }
}

/* ============================================================
   5. RENDER PRODUCT CARD
============================================================ */
function renderStars(rating) {
    var full = Math.floor(rating);
    var half = (rating % 1) >= 0.5;
    var s = '';
    for (var i = 0; i < full; i++) s += '★';
    if (half) s += '½';
    return s;
}

function formatNaira(n) {
    return '₦' + Math.round(n).toLocaleString();
}

function renderConfigSection(product) {
    /* Printers: no meaningful config — show simplified notice */
    if (product.type === 'printer') {
        return '<div class="config-section"><div class="config-title"><i class="fas fa-check-circle"></i> Ready Out of Box — No Configuration Needed</div></div>';
    }
    /* Check if config exists */
    if (!product.config) {
        return '<div class="config-section"><div class="config-title"><i class="fas fa-info-circle"></i> Standard Configuration</div></div>';
    }
    
    var showTouch = product.config.touch || false;

    var ramOpts = product.config.ram ? product.config.ram.map(function(r) {
        return '<option value="' + r + '">' + r + ' RAM</option>';
    }).join('') : '<option value="">No RAM options</option>';
    
    var stgOpts = product.config.storage ? product.config.storage.map(function(s) {
        return '<option value="' + s + '">' + s + '</option>';
    }).join('') : '<option value="">No storage options</option>';
    
    var touchSection = showTouch ? (
        '<div class="config-select-wrap">' +
            '<label>Touchscreen</label>' +
            '<select class="config-select" data-config-tch="' + product.id + '" onchange="updateCardPrice(' + product.id + ')">' +
                '<option value="no">No Touchscreen</option>' +
                '<option value="yes">Yes – Add Touch</option>' +
            '</select>' +
        '</div>'
    ) : '';

    return '<div class="config-section">' +
        '<div class="config-title"><i class="fas fa-sliders-h"></i> Customise Your Spec</div>' +
        '<div class="config-row">' +
            '<div class="config-select-wrap">' +
                '<label>RAM</label>' +
                '<select class="config-select" data-config-ram="' + product.id + '" onchange="updateCardPrice(' + product.id + ')">' +
                    ramOpts +
                '</select>' +
            '</div>' +
            '<div class="config-select-wrap">' +
                '<label>Storage</label>' +
                '<select class="config-select" data-config-stg="' + product.id + '" onchange="updateCardPrice(' + product.id + ')">' +
                    stgOpts +
                '</select>' +
            '</div>' +
            touchSection +
        '</div>' +
    '</div>';
}

function updateCardPrice(productId) {
    var product = allProducts.find(function(p) { return p.id === productId; });
    if (!product) return;
    var cfg   = getConfig(productId);
    var delta = configPriceDelta(cfg, product.basePrice);
    var el = document.getElementById('price-' + productId);
    if (el) el.textContent = formatNaira(product.basePrice + delta);
}

/* ── Gallery helpers ── */
function buildGallerySlides(product) {
    /* Collect up to 5 images + 1 YouTube video */
    var images = [];
    if (product.images && product.images.length) {
        images = product.images.slice(0, 5);
    } else if (product.image) {
        images = [product.image];
    }
    var youtubeId = product.youtube || product.youtubeId || null;

    var slides = images.map(function(src, i) {
        return { type: 'image', src: src, index: i };
    });
    if (youtubeId) {
        slides.push({ type: 'video', youtubeId: youtubeId, index: slides.length });
    }
    return slides;
}

function renderGallery(product) {
    var slides = buildGallerySlides(product);
    if (slides.length === 0) {
        return '<div class="prod-gallery" data-pid="' + product.id + '">' +
            '<div class="gallery-track-wrap">' +
                '<div class="gallery-track">' +
                    '<div class="gallery-slide">' +
                        '<img src="https://via.placeholder.com/600x400?text=No+Image" alt="' + product.name + '" loading="lazy">' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    }

    var slidesHtml = slides.map(function(slide, i) {
        if (slide.type === 'video') {
            return '<div class="gallery-slide gallery-slide--video" data-slide="' + i + '" data-youtube="' + slide.youtubeId + '" onclick="openLightbox(' + product.id + ',' + i + ')">' +
                '<img src="https://img.youtube.com/vi/' + slide.youtubeId + '/hqdefault.jpg" alt="Product video" loading="lazy">' +
                '<div class="gallery-play-btn"><i class="fas fa-play"></i></div>' +
            '</div>';
        }
        return '<div class="gallery-slide" data-slide="' + i + '" onclick="openLightbox(' + product.id + ',' + i + ')">' +
            '<img src="' + slide.src + '" alt="' + product.name + ' image ' + (i+1) + '" loading="lazy">' +
        '</div>';
    }).join('');

    var dotsHtml = slides.length > 1 ? (
        '<div class="gallery-dots">' +
        slides.map(function(s, i) {
            /* Don't render a dot for the YouTube slide — it's only reachable by clicking the thumbnail */
            if (s.type === 'video') return '';
            return '<button class="gallery-dot' + (i === 0 ? ' active' : '') + '" onclick="goToSlide(' + product.id + ',' + i + ')" aria-label="Slide ' + (i+1) + '"></button>';
        }).join('') +
        '</div>'
    ) : '';

    var arrowsHtml = slides.length > 1 ? (
        '<button class="gallery-arrow gallery-arrow--prev" onclick="shiftSlide(' + product.id + ',-1)" aria-label="Previous"><i class="fas fa-chevron-left"></i></button>' +
        '<button class="gallery-arrow gallery-arrow--next" onclick="shiftSlide(' + product.id + ',1)" aria-label="Next"><i class="fas fa-chevron-right"></i></button>'
    ) : '';

    var countHtml = slides.length > 1 ? '<div class="gallery-count"><span class="gallery-count-cur">1</span>/' + slides.length + '</div>' : '';

    return '<div class="prod-gallery" data-pid="' + product.id + '" data-current="0" data-total="' + slides.length + '">' +
        '<div class="gallery-track-wrap">' +
            arrowsHtml +
            '<div class="gallery-track" id="gt-' + product.id + '" ' +
                'onmousedown="galleryDragStart(event,' + product.id + ')" ' +
                'ontouchstart="galleryTouchStart(event,' + product.id + ')" ' +
                'ontouchmove="galleryTouchMove(event,' + product.id + ')" ' +
                'ontouchend="galleryTouchEnd(event,' + product.id + ')">' +
                slidesHtml +
            '</div>' +
            countHtml +
        '</div>' +
        dotsHtml +
    '</div>';
}

/* Gallery state per product */
var _galleryDrag = {};
var _galleryTouch = {};

function goToSlide(pid, idx) {
    var gallery = document.querySelector('.prod-gallery[data-pid="' + pid + '"]');
    if (!gallery) return;
    var total = parseInt(gallery.dataset.total) || 1;
    idx = Math.max(0, Math.min(idx, total - 1));
    gallery.dataset.current = idx;
    var track = document.getElementById('gt-' + pid);
    if (track) track.style.transform = 'translateX(-' + (idx * 100) + '%)';
    /* dots */
    gallery.querySelectorAll('.gallery-dot').forEach(function(d, i) {
        d.classList.toggle('active', i === idx);
    });
    /* count */
    var cur = gallery.querySelector('.gallery-count-cur');
    if (cur) cur.textContent = idx + 1;
    /* hide next arrow when on the last image slide (don't let it slide to video) */
    var imageSlideCount = track ? track.querySelectorAll('.gallery-slide:not(.gallery-slide--video)').length : total;
    var nextArrow = gallery.querySelector('.gallery-arrow--next');
    var prevArrow = gallery.querySelector('.gallery-arrow--prev');
    if (nextArrow) nextArrow.style.visibility = idx >= imageSlideCount - 1 ? 'hidden' : '';
    if (prevArrow) prevArrow.style.visibility = idx <= 0 ? 'hidden' : '';
}

function shiftSlide(pid, dir) {
    var gallery = document.querySelector('.prod-gallery[data-pid="' + pid + '"]');
    if (!gallery) return;
    var current = parseInt(gallery.dataset.current) || 0;
    var total   = parseInt(gallery.dataset.total)   || 1;
    /* Count only non-video slides so arrows never land on the YouTube slide */
    var track = document.getElementById('gt-' + pid);
    var imageSlideCount = track ? track.querySelectorAll('.gallery-slide:not(.gallery-slide--video)').length : total;
    var next = current + dir;
    /* Clamp within image slides only — no wrap-around onto video */
    next = Math.max(0, Math.min(next, imageSlideCount - 1));
    goToSlide(pid, next);
}

/* Drag to slide (mouse) */
function galleryDragStart(e, pid) {
    _galleryDrag[pid] = { startX: e.clientX, dragging: true };
    var track = document.getElementById('gt-' + pid);
    if (track) {
        track.style.transition = 'none';
        var onMove = function(ev) {
            if (!_galleryDrag[pid] || !_galleryDrag[pid].dragging) return;
            _galleryDrag[pid].dx = ev.clientX - _galleryDrag[pid].startX;
        };
        var onUp = function(ev) {
            if (!_galleryDrag[pid]) return;
            var dx = _galleryDrag[pid].dx || 0;
            track.style.transition = '';
            if (Math.abs(dx) > 40) shiftSlide(pid, dx < 0 ? 1 : -1);
            else goToSlide(pid, parseInt(document.querySelector('.prod-gallery[data-pid="' + pid + '"]').dataset.current) || 0);
            _galleryDrag[pid] = null;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }
}

function galleryTouchStart(e, pid) {
    _galleryTouch[pid] = { startX: e.touches[0].clientX };
    var track = document.getElementById('gt-' + pid);
    if (track) track.style.transition = 'none';
}
function galleryTouchMove(e, pid) {
    if (!_galleryTouch[pid]) return;
    _galleryTouch[pid].dx = e.touches[0].clientX - _galleryTouch[pid].startX;
}
function galleryTouchEnd(e, pid) {
    if (!_galleryTouch[pid]) return;
    var track = document.getElementById('gt-' + pid);
    if (track) track.style.transition = '';
    var dx = _galleryTouch[pid].dx || 0;
    if (Math.abs(dx) > 40) shiftSlide(pid, dx < 0 ? 1 : -1);
    else goToSlide(pid, parseInt(document.querySelector('.prod-gallery[data-pid="' + pid + '"]').dataset.current) || 0);
    _galleryTouch[pid] = null;
}

/* ── Lightbox ── */
var _lightboxData = { pid: null, slides: [], current: 0 };

function openLightbox(pid, idx) {
    var product = allProducts.find(function(p) { return p.id === pid; });
    if (!product) return;
    var slides = buildGallerySlides(product);
    _lightboxData = { pid: pid, slides: slides, current: idx };

    var lb = document.getElementById('cc-lightbox');
    if (!lb) {
        lb = document.createElement('div');
        lb.id = 'cc-lightbox';
        lb.innerHTML =
            '<div class="lb-backdrop" onclick="closeLightbox()"></div>' +
            '<div class="lb-container">' +
                '<button class="lb-close" onclick="closeLightbox()"><i class="fas fa-times"></i></button>' +
                '<button class="lb-arrow lb-arrow--prev" onclick="lbShift(-1)"><i class="fas fa-chevron-left"></i></button>' +
                '<div class="lb-stage" id="lb-stage"></div>' +
                '<button class="lb-arrow lb-arrow--next" onclick="lbShift(1)"><i class="fas fa-chevron-right"></i></button>' +
                '<div class="lb-dots-row" id="lb-dots"></div>' +
                '<div class="lb-counter" id="lb-counter"></div>' +
            '</div>';
        document.body.appendChild(lb);
    }
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
    renderLightboxSlide();
}

function renderLightboxSlide() {
    var slide = _lightboxData.slides[_lightboxData.current];
    var stage = document.getElementById('lb-stage');
    var dotsEl = document.getElementById('lb-dots');
    var counter = document.getElementById('lb-counter');
    if (!stage || !slide) return;

    if (slide.type === 'video') {
        stage.innerHTML = '<div class="lb-video-wrap"><iframe src="https://www.youtube.com/embed/' + slide.youtubeId + '?autoplay=1&rel=0" allow="autoplay; fullscreen" allowfullscreen></iframe></div>';
    } else {
        stage.innerHTML = '<div class="lb-img-wrap"><img src="' + slide.src + '" alt="Product image"></div>';
    }

    var total = _lightboxData.slides.length;
    if (dotsEl) {
        dotsEl.innerHTML = _lightboxData.slides.map(function(s, i) {
            return '<button class="lb-dot' + (i === _lightboxData.current ? ' active' : '') + '" onclick="lbGo(' + i + ')"></button>';
        }).join('');
    }
    if (counter) counter.textContent = (_lightboxData.current + 1) + ' / ' + total;

    /* show/hide arrows */
    var lb = document.getElementById('cc-lightbox');
    if (lb) {
        var prev = lb.querySelector('.lb-arrow--prev');
        var next = lb.querySelector('.lb-arrow--next');
        if (prev) prev.style.display = total > 1 ? '' : 'none';
        if (next) next.style.display = total > 1 ? '' : 'none';
    }
}

function lbShift(dir) {
    var total = _lightboxData.slides.length;
    _lightboxData.current = (_lightboxData.current + dir + total) % total;
    renderLightboxSlide();
}
function lbGo(idx) {
    _lightboxData.current = idx;
    renderLightboxSlide();
}
function closeLightbox() {
    var lb = document.getElementById('cc-lightbox');
    if (lb) lb.classList.remove('active');
    document.body.style.overflow = '';
    /* stop YT autoplay */
    var stage = document.getElementById('lb-stage');
    if (stage) stage.innerHTML = '';
}
/* ESC to close lightbox */
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft')  { var lb = document.getElementById('cc-lightbox'); if (lb && lb.classList.contains('active')) lbShift(-1); }
    if (e.key === 'ArrowRight') { var lb = document.getElementById('cc-lightbox'); if (lb && lb.classList.contains('active')) lbShift(1); }
});

function renderProductCard(product, index) {
    var configHtml = renderConfigSection(product);
    var typeLabel  = { laptop: 'Laptop', desktop: 'Desktop', server: 'Server', printer: 'Printer' }[product.type] || '';
    var delay = ((index || 0) % 9) * 60;

    var galleryHtml = renderGallery(product);

    return (
        '<div class="col-md-6 col-xl-4 card-enter" style="animation-delay:' + delay + 'ms">' +
        '<div class="shop-product-card">' +
            galleryHtml +
            '<span class="prod-badge">' + (product.badge || 'New') + '</span>' +
            '<span class="prod-new-pill">Brand New</span>' +
            '<div class="prod-body">' +
                '<div class="prod-brand">' + product.brand + ' · ' + typeLabel + '</div>' +
                '<div class="prod-name">' + product.name + '</div>' +
                '<div class="prod-specs">' +
                    '<div class="prod-spec-row"><i class="fas fa-microchip"></i>' + (product.processor || 'Standard Processor') + '</div>' +
                    '<div class="prod-spec-row"><i class="fas fa-tv"></i>' + (product.display || 'Standard Display') + '</div>' +
                '</div>' +
                configHtml +
                '<div class="prod-price-row">' +
                    '<div>' +
                        '<div class="prod-price" id="price-' + product.id + '">' + formatNaira(product.basePrice) + '</div>' +
                        '<span class="price-note">Base price · config may vary</span>' +
                    '</div>' +
                    '<div class="prod-rating">' + renderStars(product.rating || 4.5) + ' <span>(' + (product.reviews || 0) + ')</span></div>' +
                '</div>' +
                '<div class="prod-actions">' +
                    '<button class="btn-add-cart" onclick="addToCart(' + product.id + ')">' +
                        '<i class="fas fa-cart-plus"></i> Add to Cart' +
                    '</button>' +
                    /*btn-wishlist*/
                     '<button class="btn-wish" onclick="toggleWishlist(event,this)" data-pid="' + product.id + '" aria-label="Wishlist">' +
                        '<i class="fas fa-heart"></i>' +
                     '</button>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '</div>'
    );
}

/* Wishlist state — persisted in memory so grid re-renders restore the correct state */
var _wishlist = {}; // Global wishlist state

function toggleWishlist(e, btn) {
    // 1. Completely isolate the click from the product card
    if (e) {
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        if (typeof e.preventDefault === 'function') e.preventDefault();
    }
    
    var pid = btn.dataset.pid;
    if (!pid) return false;

    // 2. Toggle the logical state (true -> false or false -> true)
    _wishlist[pid] = !_wishlist[pid];
    
    // 3. Update the UI based on the new state
    if (_wishlist[pid]) {
        btn.classList.add('wishlisted');
        // Optional: show a toast notification
        if (window.showToast) window.showToast('Added to wishlist', 'success');
    } else {
        btn.classList.remove('wishlisted');
    }

    return false; 
}

function restoreWishlistState() {
    Object.keys(_wishlist).forEach(function(pid) {
        if (!_wishlist[pid]) return;
        var btn = document.querySelector('.btn-wish[data-pid="' + pid + '"]');
        if (btn) {
            btn.classList.add('wishlisted');
            var heartIcon = btn.querySelector('i');
            if (heartIcon) {
                heartIcon.style.color = '#ef4444';
            }
        }
    });
}
/* ============================================================
   6. FILTERING & RENDERING
============================================================ */
var currentCat  = 'all';
var currentBrand = 'all';
var currentPrice = 'all';
var currentSort  = 'default';

function priceInRange(price, range) {
    if (range === 'all') return true;
    if (range === 'under500k')  return price < 500000;
    if (range === '500k-1m')    return price >= 500000 && price < 1000000;
    if (range === '1m-2m')      return price >= 1000000 && price < 2000000;
    if (range === 'over2m')     return price >= 2000000;
    return true;
}

function applyFilters() {
    var filtered = allProducts.slice();

    if (currentCat !== 'all')   filtered = filtered.filter(function(p) { return p.type === currentCat; });
    if (currentBrand !== 'all') filtered = filtered.filter(function(p) { return p.brand_key === currentBrand; });
    filtered = filtered.filter(function(p) { return priceInRange(p.basePrice, currentPrice); });

    if (currentSort === 'price-asc')  filtered.sort(function(a,b) { return a.basePrice - b.basePrice; });
    if (currentSort === 'price-desc') filtered.sort(function(a,b) { return b.basePrice - a.basePrice; });
    if (currentSort === 'rating')     filtered.sort(function(a,b) { return b.rating - a.rating; });
    if (currentSort === 'newest')     filtered.sort(function(a,b) { return b.id - a.id; });

    renderGrid(filtered);
}

function renderGrid(products) {
    var grid  = document.getElementById('shopGrid');
    var empty = document.getElementById('shopEmpty');
    var count = document.getElementById('resultsCount');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = '';
        if (empty) empty.style.display = 'block';
    } else {
        /* Pass index so each card gets its stagger delay */
        grid.innerHTML = products.map(function(p, i) {
            return renderProductCard(p, i);
        }).join('');
        if (empty) empty.style.display = 'none';
    }
    if (count) count.textContent = products.length;
    restoreWishlistState();
}

function resetFilters() {
    currentCat   = 'all'; currentBrand = 'all';
    currentPrice = 'all'; currentSort  = 'default';
    var bSel = document.getElementById('filterBrand');
    var pSel = document.getElementById('filterPrice');
    var sSel = document.getElementById('filterSort');
    if (bSel) bSel.value = 'all';
    if (pSel) pSel.value = 'all';
    if (sSel) sSel.value = 'default';
    document.querySelectorAll('.cat-tab').forEach(function(t) { t.classList.remove('active'); });
    var allTab = document.querySelector('.cat-tab[data-cat="all"]');
    if (allTab) allTab.classList.add('active');
    applyFilters();
}

/* ============================================================
   7. CART MODAL RENDERING
============================================================ */
function renderCartItems() {
    var body    = document.getElementById('cartBody');
    var summary = document.getElementById('cartSummary');
    if (!body) return;

    if (cart.length === 0) {
        body.innerHTML = '<div class="cart-empty-state"><i class="fas fa-shopping-cart"></i><p>Your cart is empty.</p></div>';
        if (summary) summary.innerHTML = '';
        var btn = document.getElementById('checkoutBtn');
        if (btn) { btn.disabled = true; }
        return;
    }

    body.innerHTML = cart.map(function(item) {
        var cfgParts = [];
        if (item.config) {
            if (item.config.ram    && item.config.ram !== 'null')    cfgParts.push(item.config.ram);
            if (item.config.storage && item.config.storage !== 'null') cfgParts.push(item.config.storage);
            if (item.config.touch  === 'yes') cfgParts.push('Touchscreen');
        }
        var cfgStr = cfgParts.length ? cfgParts.join(' · ') : '';

        return '<div class="cart-item">' +
            '<img src="' + item.image + '" alt="' + item.name + '">' +
            '<div class="cart-item-info">' +
                '<div class="cart-item-name">' + item.name + '</div>' +
                '<div class="cart-item-sub">' + item.brand + (cfgStr ? ' · ' + cfgStr : '') + '</div>' +
                '<div class="qty-ctrl">' +
                    '<button onclick="updateQuantity(\'' + item.cartKey + '\',-1)"><i class="fas fa-minus"></i></button>' +
                    '<span>' + item.quantity + '</span>' +
                    '<button onclick="updateQuantity(\'' + item.cartKey + '\',1)"><i class="fas fa-plus"></i></button>' +
                '</div>' +
            '</div>' +
            '<div class="cart-item-right">' +
                '<div class="cart-item-price">' + formatNaira(item.price * item.quantity) + '</div>' +
                '<button class="btn-remove" onclick="removeFromCart(\'' + item.cartKey + '\')" title="Remove"><i class="fas fa-trash"></i></button>' +
            '</div>' +
        '</div>';
    }).join('');

    var sub   = cart.reduce(function(s, i) { return s + i.price * i.quantity; }, 0);
    var vat   = sub * 0.075;
    var ship  = sub > 0 ? 15000 : 0;
    var total = sub + vat + ship;

    if (summary) {
        summary.innerHTML =
            '<div class="summary-line"><span>Subtotal</span><span>' + formatNaira(sub) + '</span></div>' +
            '<div class="summary-line"><span>VAT (7.5%)</span><span>' + formatNaira(vat) + '</span></div>' +
            '<div class="summary-line"><span>Shipping</span><span>' + (ship > 0 ? formatNaira(ship) : 'FREE') + '</span></div>' +
            '<div class="summary-line total"><span>Total</span><span>' + formatNaira(total) + '</span></div>';
    }

    var btn = document.getElementById('checkoutBtn');
    if (btn) btn.disabled = false;
}

function renderCheckoutSummary() {
    var el = document.getElementById('checkoutSummary');
    if (!el) return;
    var sub   = cart.reduce(function(s, i) { return s + i.price * i.quantity; }, 0);
    var vat   = sub * 0.075;
    var ship  = 15000;
    var total = sub + vat + ship;

    var lines = cart.map(function(i) {
        return '<div class="summary-line"><span>' + i.name + ' ×' + i.quantity + '</span><span>' + formatNaira(i.price * i.quantity) + '</span></div>';
    }).join('');

    el.innerHTML = '<h5>Order Summary</h5>' + lines +
        '<hr style="border-color:var(--cc-border);margin:14px 0">' +
        '<div class="summary-line"><span>Subtotal</span><span>' + formatNaira(sub) + '</span></div>' +
        '<div class="summary-line"><span>VAT (7.5%)</span><span>' + formatNaira(vat) + '</span></div>' +
        '<div class="summary-line"><span>Shipping</span><span>' + formatNaira(ship) + '</span></div>' +
        '<div class="summary-line total"><span>Total</span><span>' + formatNaira(total) + '</span></div>';
}

/* ============================================================
   8. MODAL CONTROLS
============================================================ */
function openCart()      { var m = document.getElementById('cartModal');     if(m){ m.classList.add('active'); renderCartItems(); } }
function closeCart()     { var m = document.getElementById('cartModal');     if(m) m.classList.remove('active'); }
function openCheckout()  {
    var cm = document.getElementById('cartModal');
    var co = document.getElementById('checkoutModal');
    if(cm) cm.classList.remove('active');
    if(co){ co.classList.add('active'); renderCheckoutSummary(); }
}
function closeCheckout() { var m = document.getElementById('checkoutModal'); if(m) m.classList.remove('active'); }
function closeSuccess()  { var m = document.getElementById('successModal');  if(m) m.classList.remove('active'); }

/* ============================================================
   9. PLACE ORDER
============================================================ */
function placeOrder(e) {
    e.preventDefault();
    var btn = document.getElementById('placeOrderBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'; }
    setTimeout(function() {
        var co = document.getElementById('checkoutModal');
        var sm = document.getElementById('successModal');
        if (co) co.classList.remove('active');
        if (sm) sm.classList.add('active');
        cart = []; saveCart();
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-circle"></i> Place Order'; }
    }, 2000);
}

/* ============================================================
   10. INIT — SINGLE DOMContentLoaded LISTENER
============================================================ */
document.addEventListener('DOMContentLoaded', function() {

    /* Load products from Netlify Blobs via function */
    fetch('/.netlify/functions/products')
        .then(function(res) {
            if (!res.ok) throw new Error('HTTP error ' + res.status);
            return res.json();
        })
        .then(function(data) {
            allProducts = Array.isArray(data) ? data : (data.products || []);
            allProducts.sort(function(a,b) { return (a.position||99) - (b.position||99); });
            applyFilters();
            updateAllBadges();
        })
        .catch(function(err) {
            console.error('Failed to load products:', err.message);
            renderGrid([]);
        });

    /* Category tab clicks */
    document.querySelectorAll('.cat-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.cat-tab').forEach(function(t) { t.classList.remove('active'); });
            this.classList.add('active');
            currentCat = this.dataset.cat;
            applyFilters();
        });
    });

    /* Filter dropdowns */
    var brandSel = document.getElementById('filterBrand');
    var priceSel = document.getElementById('filterPrice');
    var sortSel  = document.getElementById('filterSort');
    if (brandSel) brandSel.addEventListener('change', function() { currentBrand = this.value; applyFilters(); });
    if (priceSel) priceSel.addEventListener('change', function() { currentPrice = this.value; applyFilters(); });
    if (sortSel)  sortSel.addEventListener('change',  function() { currentSort  = this.value; applyFilters(); });

    /* Close modals on backdrop click */
    ['cartModal', 'checkoutModal', 'successModal'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', function(e) {
                if (e.target === el) el.classList.remove('active');
            });
        }
    });
});