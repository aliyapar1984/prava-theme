/**
 * PRAVA ürün detay (PDP) — sections/main-product-detail.liquid ile eşleşir.
 *
 * 1) Varyant UI: fiyat, taksit gizli input, ana görsel, swatch (Dawn’daki product-info.js’e benzer ama hafif).
 * 2) Sepete ekle: Dawn’daki product-form.js gibi form gönderimini yakalayıp fetch + FormData ile
 *    routes.cart_add_url’e POST (klasik tam sayfa POST yerine; vitrin / Ajax Cart API ile uyumlu).
 *
 * window.routes: layout/theme.liquid içinde tanımlanır (cart_add_url, cart_url).
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-prava-pdp]');
  if (!root) return;

  var sectionId = root.getAttribute('data-section-id');
  if (!sectionId) return;

  var productJsonEl = document.getElementById('ProductJson-' + sectionId);
  var variantMetaEl = document.getElementById('PdpVariantMeta-' + sectionId);
  if (!productJsonEl || !variantMetaEl) return;

  /** Shopify’ın liquid {{ product | json }} çıktısı — varyant featured_image vb. */
  var product;
  try {
    product = JSON.parse(productJsonEl.textContent);
  } catch (e) {
    return;
  }

  /** Sunucuda formatlanmış fiyat string’leri + stok — sayfa yenilemeden güncelleme için */
  var variantMeta;
  try {
    variantMeta = JSON.parse(variantMetaEl.textContent);
  } catch (e2) {
    variantMeta = {};
  }

  var select = document.getElementById('PdpVariantSelect-' + sectionId);
  var priceWrap = document.getElementById('PdpPrice-' + sectionId);
  var submitBtn = document.getElementById('PdpSubmit-' + sectionId);
  /** Taksit formundaki gizli varyant id input’u (installment-variant-*) */
  var installmentInput = document.getElementById('installment-variant-' + sectionId);
  /** Yalnızca ana medya görsel ise id verilir; video/3D’de bu öğe olmayabilir */
  var mainImg = document.getElementById('PdpMainImg-' + sectionId);

  function findVariant(id) {
    var vid = parseInt(id, 10);
    if (!product || !product.variants) return null;
    for (var i = 0; i < product.variants.length; i++) {
      if (product.variants[i].id === vid) return product.variants[i];
    }
    return null;
  }

  /** Küçük resimlerde aria-pressed: hangi küçük resmin “aktif” olduğunu erişilebilirlik için işaretler */
  function setThumbActive(mediaId) {
    if (!mediaId) return;
    root.querySelectorAll('[data-prava-pdp-thumb]').forEach(function (btn) {
      var mid = btn.getAttribute('data-media-id');
      var on = mid === String(mediaId);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  /** Seçilen varyantın featured_image’ına göre ana img src güncellenir */
  function updateMainImageFromVariant(variant) {
    if (!mainImg || !variant) return;
    var img = variant.featured_image;
    if (!img || !img.src) return;
    try {
      var u = new URL(img.src, window.location.href);
      u.searchParams.set('width', '1400');
      mainImg.src = u.toString();
    } catch (err) {
      mainImg.src = img.src;
    }
    mainImg.alt = img.alt || (product && product.title) || '';
    if (variant.featured_media && variant.featured_media.id) {
      setThumbActive(variant.featured_media.id);
    }
  }

  /** Fiyat HTML’i, taksit input’u, ATC düğmesi, ana görsel, swatch durumları */
  function updatePriceAndUi(variantId) {
    var meta = variantMeta[String(variantId)];
    var variant = findVariant(variantId);

    if (!meta && variant && submitBtn) {
      submitBtn.disabled = !variant.available;
      var addL = submitBtn.getAttribute('data-label-add') || 'Sepete ekle';
      var soldL = submitBtn.getAttribute('data-label-sold') || 'Tükendi';
      submitBtn.textContent = variant.available ? addL : soldL;
      if (variant) updateMainImageFromVariant(variant);
      return;
    }

    if (!meta) return;

    var p = priceWrap ? priceWrap.querySelector('p') : null;
    if (p) {
      if (meta.compare_at_price) {
        p.innerHTML =
          '<span class="mr-2 text-xl font-light text-neutral-500 line-through">' +
          meta.compare_at_price +
          '</span><span data-prava-pdp-price>' +
          meta.price +
          '</span>';
      } else {
        p.innerHTML = '<span data-prava-pdp-price>' + meta.price + '</span>';
      }
    }

    if (installmentInput && variant) {
      installmentInput.value = String(variant.id);
    }

    if (submitBtn) {
      var addL = submitBtn.getAttribute('data-label-add') || 'Sepete ekle';
      var soldL = submitBtn.getAttribute('data-label-sold') || 'Tükendi';
      submitBtn.disabled = !meta.available;
      submitBtn.textContent = meta.available ? addL : soldL;
    }

    if (variant) {
      updateMainImageFromVariant(variant);
    }

    root.querySelectorAll('[data-prava-pdp-swatch]').forEach(function (sw) {
      var vid = sw.getAttribute('data-variant-id');
      sw.setAttribute('aria-pressed', vid === String(variantId) ? 'true' : 'false');
    });
  }

  /** Varyant seçimi: URL’e ?variant= eklenir (paylaşılabilir bağlantı; sayfa yenilenmez) */
  if (select) {
    select.addEventListener('change', function () {
      updatePriceAndUi(select.value);
      try {
        var url = new URL(window.location.href);
        url.searchParams.set('variant', select.value);
        window.history.replaceState({}, '', url.toString());
      } catch (err) {}
    });
  }

  /** Renk swatch: aynı select’i programatik değiştirip change tetikler */
  root.querySelectorAll('[data-prava-pdp-swatch]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var vid = btn.getAttribute('data-variant-id');
      if (!vid || !select) return;
      select.value = vid;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  /** Galeri küçük resim: ana görseli değiştirir; varyantı otomatik değiştirmez */
  root.querySelectorAll('[data-prava-pdp-thumb]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var src = btn.getAttribute('data-src');
      var alt = btn.getAttribute('data-alt') || '';
      if (mainImg && src) {
        mainImg.src = src;
        mainImg.alt = alt;
      }
      var mid = btn.getAttribute('data-media-id');
      if (mid) setThumbActive(mid);
    });
  });

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
