/**
 * PRAVA ürün detay (PDP) — sections/main-product-detail.liquid ile eşleşir.
 *
 * Bağlantı noktaları:
 * - [data-prava-pdp] ve data-section-id: bu bölümün kökü; aynı id ProductJson-*, PdpVariantMeta-* script’leriyle eşlenir.
 * - Varyant <select> (çoklu varyantta): değişince fiyat, taksit gizli input, ana görsel, swatch aria-pressed güncellenir.
 * - Küçük resim düğmeleri: ana görseli değiştirir (sayfa yenilenmez).
 *
 * Tek varyantlı ürünlerde select yoktur; bu dosya erken çıkış yapmaz, sadece thumb dinleyicileri çalışır.
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
})();
