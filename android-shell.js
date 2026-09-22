/* Familia Food Android shell */
(function(){
  function esc(v){
    return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function setup(){
    if(document.body.dataset.androidShell==='1') return;
    document.body.dataset.androidShell='1';
    document.body.classList.add('ff-android');

    const sidebar=document.querySelector('.sidebar');
    const navLinks=sidebar ? [...sidebar.querySelectorAll('a[href]')] : [];
    const current=(location.pathname.split('/').pop() || 'index.html').toLowerCase();

    const top=document.createElement('div');
    top.className='ff-mobile-topbar';
    top.innerHTML='<button class="ff-mobile-menu" id="ffMenuOpen" type="button" aria-label="Buka menu">☰</button><div class="ff-mobile-brand"><span>🍀</span><span>Familia Food</span></div><div style="width:42px"></div>';

    const overlay=document.createElement('div');
    overlay.className='ff-mobile-overlay';
    overlay.id='ffMenuOverlay';

    const drawer=document.createElement('aside');
    drawer.className='ff-mobile-drawer';
    drawer.innerHTML='<div class="ff-mobile-drawer-head"><div class="ff-mobile-drawer-title">🍀 Familia Food</div><button class="ff-mobile-close" id="ffMenuClose" type="button">×</button></div>';

    const nav=document.createElement('nav');
    nav.className='nav';
    navLinks.forEach(a=>{
      const x=a.cloneNode(true);
      const href=(x.getAttribute('href')||'').split('?')[0].toLowerCase();
      const file=href.split('/').pop()||'index.html';
      if(file===current) x.classList.add('active');
      x.addEventListener('click',()=>document.body.classList.remove('ff-menu-open'));
      nav.appendChild(x);
    });
    drawer.appendChild(nav);

    const bottom=document.createElement('nav');
    bottom.className='ff-mobile-bottom';
    const quick=[
      ['index.html','🏠','Home'],
      ['penjualan.html','💰','Kasir'],
      ['produk.html','📦','Produk'],
      ['rekap.html','📊','Rekap'],
      ['data-lama.html','📁','Data Lama']
    ];
    bottom.innerHTML=quick.map(([href,ico,label])=>{
      const active=(href===current)?' active':'';
      return '<a class="'+active+'" href="'+esc(href)+'"><span class="ico">'+ico+'</span><span>'+label+'</span></a>';
    }).join('');

    document.body.prepend(top,overlay,drawer);
    document.body.appendChild(bottom);

    const open=()=>document.body.classList.add('ff-menu-open');
    const close=()=>document.body.classList.remove('ff-menu-open');
    document.getElementById('ffMenuOpen')?.addEventListener('click',open);
    document.getElementById('ffMenuClose')?.addEventListener('click',close);
    overlay.addEventListener('click',close);

    window.addEventListener('resize',()=>{
      if(window.innerWidth>900) close();
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})();
