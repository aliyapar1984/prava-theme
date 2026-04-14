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
})();
