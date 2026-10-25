(() => {
  'use strict';
  const money = value => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',maximumFractionDigits:Number.isInteger(value)?0:2}).format(value);
  const cards = [...document.querySelectorAll('[data-tbv-product]')];
  for (const card of cards) {
    let data;
    try { data = JSON.parse(card.dataset.tbvProduct); } catch { continue; }
    let selected = data.variants.find(v => v.id === data.defaultId) || data.variants[0];
    const dose = card.querySelector('[data-dose]');
    const formulation = card.querySelector('[data-formulation]');
    const form = card.querySelector('form');
    const buttons = [...card.querySelectorAll('[data-vials]')];
    const update = () => {
      if(formulation) {
        const doseVariants = data.variants.filter(v => v.dose === dose.value);
        for(const option of formulation.options) option.disabled = !doseVariants.some(v => v.formulation === option.value);
        if(!doseVariants.some(v => v.formulation === formulation.value)) formulation.value = doseVariants[0]?.formulation || '';
      }
      const available = data.variants.filter(v => v.dose === dose.value && (!formulation || v.formulation === formulation.value));
      selected = available.find(v => v.pack === selected.pack) || available.find(v => v.pack === 10) || available[0];
      if (!selected) {
        form.querySelector('[name=variation_id]').value = '';
        form.querySelector('[type=submit]').disabled = true;
        return;
      }
      for (const button of buttons) {
        const variant = available.find(v => v.pack === Number(button.dataset.vials));
        button.disabled = !variant;
        button.setAttribute('aria-pressed', String(!!variant && variant.id === selected.id));
        button.classList.toggle('is-selected', !!variant && variant.id === selected.id);
        button.querySelector('[data-pack-price]').textContent = variant ? money(variant.price) : 'Unavailable';
      }
      const image = card.querySelector('[data-product-image]');
      if (image && selected.image) image.src = selected.image;
      const ten = available.find(v => v.pack === 10) || selected;
      card.querySelector('[data-per-vial]').textContent = String(Number((ten.price/ten.pack).toFixed(1)));
      const variationInput = form.querySelector('[name=variation_id]');
      variationInput.value = selected.id;
      const holder = form.querySelector('[data-variation-inputs]');
      holder.replaceChildren();
      for (const [name,value] of Object.entries(selected.attributes)) {
        const field = document.createElement('input');
        field.type = 'hidden'; field.name = 'attribute_' + name; field.value = value;
        holder.append(field);
      }
      const link = card.querySelector('.bpc-catalog-card__product-link');
      if(link) {
        const target = new URL(selected.url, window.location.href);
        for(const [name,value] of Object.entries(selected.attributes)) target.searchParams.set('attribute_' + name, value);
        link.href = target.toString();
      }
      const submit = form.querySelector('[type=submit]');
      submit.disabled = !selected.available;
      submit.textContent = selected.available ? 'Add to Cart' : 'Out of stock';
    };
    dose.addEventListener('change', update);
    formulation?.addEventListener('change', update);
    for (const button of buttons) button.addEventListener('click', () => {
      const variant = data.variants.find(v => v.dose === dose.value && (!formulation || v.formulation === formulation.value) && v.pack === Number(button.dataset.vials));
      if (variant) { selected = variant; update(); }
    });
    update();
  }
  const searchInputs = [...document.querySelectorAll('[data-catalog-search]')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  const filter = value => {
    value = value.trim().toLowerCase();
    let shown = 0;
    for (const card of document.querySelectorAll('.tbv-catalog__grid [data-tbv-product]')) {
      card.hidden = !card.dataset.search.includes(value);
      if (!card.hidden) shown++;
    }
    for (const input of searchInputs) input.value = value;
    for (const button of filters) button.classList.toggle('is-active', button.dataset.filter === value);
    const empty = document.querySelector('.tbv-empty');
    if(empty) empty.hidden = shown > 0;
  };
  for(const input of searchInputs) input.addEventListener('input', () => filter(input.value));
  for(const button of filters) button.addEventListener('click', () => filter(button.dataset.filter));
  const menu = document.getElementById('tbv-mobile-menu');
  const trigger = document.querySelector('.tbv-menu-trigger');
  if(menu && trigger) {
    trigger.addEventListener('click', () => { menu.showModal(); trigger.setAttribute('aria-expanded','true'); });
    menu.querySelector('[data-close-menu]').addEventListener('click', () => menu.close());
    menu.addEventListener('close', () => trigger.setAttribute('aria-expanded','false'));
    menu.addEventListener('click', event => { if(event.target === menu && event.clientX < menu.getBoundingClientRect().left) menu.close(); });
  }
  const switcher = document.querySelector('[data-featured-switch]');
  if(switcher) switcher.addEventListener('click', () => {
    const worldwide = document.querySelector('[data-featured-warehouse=worldwide]');
    const us = document.querySelector('[data-featured-warehouse=us]');
    const showUS = !worldwide.hidden;
    worldwide.hidden = showUS; us.hidden = !showUS;
    document.getElementById('featured-heading').textContent = showUS ? 'US Warehouse products' : 'Popular research peptides';
    // Source HomePage labels use CSS-responsive spans, so resizing preserves
    // the active warehouse without replacing or reinitializing card state.
    switcher.querySelector('[data-featured-label-full]').textContent = showUS ? 'Switch to worldwide ↻' : 'Switch to US products ↻';
    switcher.querySelector('[data-featured-label-short]').textContent = showUS ? 'Switch to global ↻' : 'Switch to US ↻';
    switcher.setAttribute('aria-label', showUS ? 'Switch to worldwide' : 'Switch to US products');
    switcher.setAttribute('aria-pressed',String(showUS));
  });
  for(const arrow of document.querySelectorAll('[data-scroll]')) arrow.addEventListener('click', () => {
    const track = arrow.closest('.tbv-home__products-shell').querySelector('.tbv-home__products');
    track.scrollBy({left:Number(arrow.dataset.scroll) * track.clientWidth * .75,behavior:'smooth'});
  });
  // WooCommerce remains responsible for attribute validation, cart state and price.
  if(window.jQuery) {
    const clearCOA = () => {
      const gallery = document.querySelector('[data-coa-gallery]');
      if(!gallery) return;
      gallery.hidden = true;
      gallery.querySelector('[data-coa-pages]').replaceChildren();
      const pdf = gallery.querySelector('[data-coa-pdf]');
      pdf.hidden = true; pdf.removeAttribute('href');
    };
    window.jQuery(document).on('reset_data hide_variation', '.variations_form', clearCOA);
    window.jQuery(document).on('found_variation', '.variations_form', (_event, variation) => {
      const image = document.querySelector('[data-single-vial]');
      if(image && variation.image?.full_src) image.src = variation.image.full_src;
      clearCOA();
      const gallery = document.querySelector('[data-coa-gallery]');
      if(!gallery) return;
      const pages = Array.isArray(variation.tbv_coa_images) ? variation.tbv_coa_images : [];
      for(const [index, url] of pages.entries()) {
        const img = document.createElement('img');
        img.src = url; img.alt = `Source COA page ${index + 1}`; img.loading = 'lazy';
        const link = document.createElement('a');
        link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.append(img);
        gallery.querySelector('[data-coa-pages]').append(link);
      }
      const pdf = gallery.querySelector('[data-coa-pdf]');
      if(variation.tbv_coa_pdf) { pdf.href = variation.tbv_coa_pdf; pdf.hidden = false; }
      gallery.hidden = !pages.length && !variation.tbv_coa_pdf;
    });
  }
})();
