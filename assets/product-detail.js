/**
 * PRAVA ürün detay (PDP) — sections/main-product-detail.liquid ile eşleşir.
 *
 * Sepete ekle: form gönderimini yakalayıp fetch + FormData ile routes.cart_add_url’e POST
 * (Ajax Cart API; vitrin drawer ile uyumlu). Renk vb. ayrı ürün URL’leri — sayfada tek varyant, seçici yok.
 *
 * window.routes: layout/theme.liquid içinde tanımlanır (cart_add_url, cart_url).
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-prava-pdp]');
  if (!root) return;

  var sectionId = root.getAttribute('data-section-id');
  if (!sectionId) return;

  /** Alt merkez toast (favori mesajları); role=status ile ekran okuyucu duyuru */
  var _pravaToastTimer;
  function pravaToast(message) {
    var text = message && String(message).trim();
    if (!text) return;
    var el = document.getElementById('prava-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'prava-toast';
      el.className = 'prava-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('aria-atomic', 'true');
      document.body.appendChild(el);
    }
    el.textContent = text;
    window.clearTimeout(_pravaToastTimer);
    el.classList.remove('prava-toast--visible');
    void el.offsetWidth;
    el.classList.add('prava-toast--visible');
    _pravaToastTimer = window.setTimeout(function () {
      el.classList.remove('prava-toast--visible');
    }, 3600);
  }

  /**
   * Dawn product-form.js ile aynı fikir: formu Ajax ile /cart/add’a gönder, JSON yanıtı işle.
   * FormData kullanıldığında Content-Type header’ını set etme (boundary için tarayıcıya bırak).
   */
  function bindAjaxAddToCart(form) {
    if (!form || form.getAttribute('data-prava-ajax-cart') === 'bound') return;
    form.setAttribute('data-prava-ajax-cart', 'bound');

    var btn = form.querySelector('button[type="submit"][name="add"]');

    form.addEventListener('submit', function (evt) {
      var routes = window.routes;
      if (!routes || !routes.cart_add_url) {
        return;
      }

      evt.preventDefault();

      if (btn && btn.disabled) return;

      var fd = new FormData(form);
      if (typeof window.PravaCartSections === 'string' && window.PravaCartSections.length) {
        fd.append('sections', window.PravaCartSections);
        try {
          fd.append('sections_url', window.location.pathname);
        } catch (e2) {}
      }
      if (btn) {
        btn.disabled = true;
        btn.classList.add('opacity-70');
      }

      fetch(routes.cart_add_url, {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'application/json, application/javascript, text/javascript, */*',
        },
        body: fd,
      })
        .then(function (res) {
          return res.json().catch(function () {
            return {};
          });
        })
        .then(function (data) {
          if (data && data.status) {
            var msg =
              (data.description && String(data.description)) ||
              (data.message && String(data.message)) ||
              (window.PRAVA_I18N && window.PRAVA_I18N.cart_add_error) ||
              'Error';
            window.alert(msg);
            return;
          }
          var drawer = document.querySelector('cart-drawer');
          if (data && data.sections && drawer && typeof drawer.renderContents === 'function') {
            drawer.renderContents(data);
            return;
          }
          if (routes.cart_url) {
            window.location.href = routes.cart_url;
          } else {
            window.location.reload();
          }
        })
        .catch(function () {
          var net =
            (window.PRAVA_I18N && window.PRAVA_I18N.cart_add_network) || 'Network error';
          window.alert(net);
        })
        .finally(function () {
          if (btn) {
            btn.disabled = false;
            btn.classList.remove('opacity-70');
          }
        });
    });
  }

  var mainForm = document.getElementById('ProductForm-' + sectionId);
  bindAjaxAddToCart(mainForm);

  root.querySelectorAll('.prava-pdp-related-card form').forEach(function (f) {
    bindAjaxAddToCart(f);
  });

  /* PDP paylaş menüsü: “Bağlantıyı kopyala” — snippets/pdp-share-dropdown.liquid */
  root.addEventListener('click', function (e) {
    var copyBtn = e.target && e.target.closest('[data-prava-share-copy]');
    if (!copyBtn || !root.contains(copyBtn)) return;
    e.preventDefault();
    var url =
      copyBtn.getAttribute('data-share-url') || copyBtn.getAttribute('data-url') || window.location.href;
    var i18n = window.PRAVA_I18N || {};
    var copiedMsg = i18n.pdp_share_copied || 'Copied';
    var failedMsg = i18n.pdp_share_failed || 'Could not copy';
    var details = root.querySelector('.prava-pdp-share-dropdown details');
    function closeShareMenu() {
      if (details && details instanceof HTMLDetailsElement) details.open = false;
    }
    function flashCopyHint() {
      var prevTitle = copyBtn.getAttribute('title') || '';
      copyBtn.setAttribute('title', copiedMsg);
      window.setTimeout(function () {
        if (prevTitle) copyBtn.setAttribute('title', prevTitle);
        else copyBtn.removeAttribute('title');
      }, 2500);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(
        function () {
          flashCopyHint();
          closeShareMenu();
        },
        function () {
          window.prompt(failedMsg, url);
        }
      );
    } else {
      window.prompt(failedMsg, url);
    }
  });

  /* Favori: Shopify’ın yerel wishlist’i yok; seçenek açıksa tarayıcı (localStorage). Uygulama entegrasyonu: prava:wishlist-changed olayı veya tema düğmesini kapatarak app snippet kullanın. */
  var wishBtn = root.querySelector('[data-prava-pdp-wishlist]');
  var WISHLIST_KEY = 'prava-wishlist-handles';
  function pravaWishlistRead() {
    try {
      var raw = localStorage.getItem(WISHLIST_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }
  function pravaWishlistWrite(arr) {
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(arr));
    } catch (e) {}
  }
  if (wishBtn) {
    var handle = wishBtn.getAttribute('data-product-handle');
    var labelAdd = wishBtn.getAttribute('data-label-add') || 'Add';
    var labelRemove = wishBtn.getAttribute('data-label-remove') || 'Remove';
    function syncWishlistUi() {
      var list = pravaWishlistRead();
      var on = Boolean(handle && list.indexOf(handle) !== -1);
      wishBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      wishBtn.setAttribute('aria-label', on ? labelRemove : labelAdd);
      var sr = wishBtn.querySelector('.sr-only');
      if (sr) sr.textContent = on ? labelRemove : labelAdd;
      var ic = wishBtn.querySelector('[data-prava-wishlist-icon]');
      if (
        ic &&
        ic.tagName === 'IMG' &&
        typeof ic.getAttribute === 'function' &&
        ic.getAttribute('data-src-off') &&
        ic.getAttribute('data-src-on')
      ) {
        ic.setAttribute('src', on ? ic.getAttribute('data-src-on') : ic.getAttribute('data-src-off'));
      }
    }
    syncWishlistUi();
    wishBtn.addEventListener('click', function () {
      if (!handle) return;
      var list = pravaWishlistRead();
      var idx = list.indexOf(handle);
      var added = false;
      if (idx === -1) {
        list.push(handle);
        added = true;
      } else {
        list.splice(idx, 1);
      }
      pravaWishlistWrite(list);
      syncWishlistUi();
      var i18nW = window.PRAVA_I18N || {};
      var toastMsg = added ? i18nW.pdp_wishlist_added : i18nW.pdp_wishlist_removed;
      if (toastMsg) pravaToast(toastMsg);
      try {
        document.dispatchEvent(
          new CustomEvent('prava:wishlist-changed', { detail: { handle: handle, added: added } })
        );
      } catch (e1) {}
    });
  }
})();
