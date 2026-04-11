/**
 * Dawn cart-drawer.js sadeleştirmesi: mini sepet aç/kapa + sepete ekleme sonrası section HTML enjekte et.
 * Section kimlikleri: prava-cart-drawer, prava-cart-bubble (Shopify Cart API sections parametresi ile uyumlu).
 */
(function () {
  'use strict';

  if (!customElements.get('cart-drawer')) {
    customElements.define(
      'cart-drawer',
      class CartDrawer extends HTMLElement {
        constructor() {
          super();
          this.addEventListener('keyup', function (evt) {
            if (evt.code === 'Escape') this.close();
          });
          this._bindCartIcon();
        }

        _bindCartIcon() {
          var cartLink = document.querySelector('#cart-icon-bubble');
          if (!cartLink || cartLink.dataset.pravaDrawerBound === '1') return;
          cartLink.dataset.pravaDrawerBound = '1';
          cartLink.setAttribute('role', 'button');
          cartLink.setAttribute('aria-haspopup', 'dialog');
          cartLink.addEventListener('click', function (event) {
            event.preventDefault();
            this.open(cartLink);
          }.bind(this));
          cartLink.addEventListener('keydown', function (event) {
            if (event.code && event.code.toUpperCase() === 'SPACE') {
              event.preventDefault();
              this.open(cartLink);
            }
          }.bind(this));
        }

        open(triggeredBy) {
          if (triggeredBy) this._activeElement = triggeredBy;
          this.classList.add('active');
          document.body.classList.add('prava-mini-cart-open');
          var panel = this.querySelector('#CartDrawer');
          if (panel) {
            setTimeout(function () {
              var closeBtn = panel.querySelector('.prava-mini-cart-drawer__close');
              if (closeBtn) closeBtn.focus();
            }, 350);
          }
        }

        close() {
          this.classList.remove('active');
          document.body.classList.remove('prava-mini-cart-open');
          if (this._activeElement && typeof this._activeElement.focus === 'function') {
            this._activeElement.focus();
          }
        }

        getSectionsToRender() {
          return [
            { id: 'prava-cart-drawer', selector: '#CartDrawer' },
            { id: 'prava-cart-bubble' },
          ];
        }

        getSectionInnerHTML(html, innerSelector) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          if (innerSelector) {
            var el = doc.querySelector(innerSelector);
            return el ? el.innerHTML : '';
          }
          var sec = doc.querySelector('.shopify-section');
          return sec ? sec.innerHTML : '';
        }

        renderContents(parsedState) {
          if (!parsedState || !parsedState.sections) return;
          var self = this;
          this.getSectionsToRender().forEach(function (section) {
            var html = parsedState.sections[section.id];
            if (!html) return;
            var inner = self.getSectionInnerHTML(html, section.selector);
            if (!inner) return;
            var target;
            if (section.selector) {
              target = document.querySelector(section.selector);
            } else {
              target = document.getElementById('cart-icon-bubble');
            }
            if (target) {
              target.innerHTML = inner;
            }
          });

          setTimeout(function () {
            self.open();
          }, 0);
        }
      }
    );
  }
})();
