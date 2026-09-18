(function(){
  try {
    const saved = localStorage.getItem('ff_brand_color_v1');
    if (saved) document.documentElement.style.setProperty('--brand-color', saved);
  } catch (_) {}
})();
