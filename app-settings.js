(function(){
  const COLOR_KEY = 'ff_brand_color_v1';
  const NAME_KEY = 'ff_business_name_v1';
  const LOGO_KEY = 'ff_logo_v1';

  function apply(settings){
    const s = settings || {};
    const color = s.warna || '#087443';
    const name = String(s.nama_usaha || 'Familia Food').trim() || 'Familia Food';
    const logo = String(s.logo || '').trim();

    document.documentElement.style.setProperty('--brand-color', color);
    window.FF_SETTINGS = { name, color, logo, admin: s.admin || '' };

    try {
      localStorage.setItem(COLOR_KEY, color);
      localStorage.setItem(NAME_KEY, name);
      if (logo) localStorage.setItem(LOGO_KEY, logo);
    } catch (_) {}

    const brands = document.querySelectorAll('.brand,[data-ff-brand]');
    brands.forEach(function(el){
      el.textContent = '🍀 ' + name;
    });

    document.querySelectorAll('[data-ff-logo]').forEach(function(el){
      if (logo) {
        el.src = logo;
        el.style.display = '';
      } else {
        el.removeAttribute('src');
        el.style.display = 'none';
      }
    });
  }

  function applyFallback(){
    let color = '#087443', name = 'Familia Food', logo = '';
    try {
      color = localStorage.getItem(COLOR_KEY) || color;
      name = localStorage.getItem(NAME_KEY) || name;
      logo = localStorage.getItem(LOGO_KEY) || '';
    } catch (_) {}
    apply({ warna: color, nama_usaha: name, logo });
  }

  function applyFromDb(){
    if (typeof window.supabaseClient === 'undefined') {
      applyFallback();
      return;
    }
    supabaseClient
      .from('pengaturan')
      .select('nama_usaha,logo,warna,admin')
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(function(r){
        if (r.error || !r.data) applyFallback();
        else apply(r.data);
      })
      .catch(applyFallback);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFromDb, { once: true });
  } else {
    applyFromDb();
  }
})();