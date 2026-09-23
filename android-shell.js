/* Familia Food — Android shell */
(function(){
  'use strict';

  function esc(v){
    return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function isMobile(){
    return window.innerWidth<=900;
  }

  function prepareMobileTables(){
    if(!isMobile()) return;
    document.querySelectorAll('table').forEach(table=>{
      if(table.classList.contains('ff-no-mobile-stack')) return;
      const headers=[...table.querySelectorAll('thead th')].map(th=>String(th.textContent||'').trim());
      if(!headers.length) return;
      table.classList.add('ff-mobile-table');
      [...table.querySelectorAll('tbody tr, tfoot tr')].forEach(row=>{
        [...row.children].forEach((cell,i)=>{
          if(cell.tagName!=='TD') return;
          if(cell.hasAttribute('colspan')) return;
          const label=headers[i]||headers[headers.length-1]||'';
          cell.setAttribute('data-label',label);
        });
      });
    });
  }

  function watchMobileTables(){
    prepareMobileTables();
    let timer=null;
    const observer=new MutationObserver(()=>{
      clearTimeout(timer);
      timer=setTimeout(prepareMobileTables,80);
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }

  function setup(){
    if(!document.body) return;
    const baseSidebar=document.querySelector('.sidebar .nav, .sidebar .menu');
    if(baseSidebar && !baseSidebar.querySelector('a[href="ai-agent.html"]')){
      const link=document.createElement('a');
      link.href='ai-agent.html';
      link.textContent='🤖 Agen AI';
      if((location.pathname.split('/').pop()||'index.html').toLowerCase()==='ai-agent.html') link.classList.add('active');
      baseSidebar.appendChild(link);
    }
    if(!isMobile()) return;
    if(document.body.dataset.androidShell==='1') return;

    document.body.dataset.androidShell='1';
    document.body.classList.add('ff-android');

    const sidebar=document.querySelector('.sidebar');
    const navLinks=sidebar ? [...sidebar.querySelectorAll('a[href]')] : [];
    const fallbackLinks=[
      ['index.html','🏠 Beranda'],
      ['penjualan.html','💰 Kasir'],
      ['produk.html','📦 Produk'],
      ['bahan-baku.html','🧱 Bahan Baku'],
      ['resep.html','🧾 Resep'],
      ['hpp.html','🧮 HPP'],
      ['rekap.html','📊 Rekap'],
      ['operasional.html','⚙️ Operasional'],
      ['data-lama.html','🗂 Data Lama'],
      ['pengaturan.html','⚙️ Pengaturan'],
      ['ai-agent.html','🤖 Agen AI']
    ];

    const current=(location.pathname.split('/').pop() || 'index.html').toLowerCase();

    const top=document.createElement('div');
    top.className='ff-mobile-topbar';
    top.setAttribute('role','banner');
    top.innerHTML=
      '<button class="ff-mobile-menu" id="ffMenuOpen" type="button" aria-label="Buka menu">☰</button>'+
      '<a class="ff-mobile-brand" href="index.html" aria-label="Kembali ke Beranda"><span>🍀</span><span>Familia Food</span></a>'+
      '<a class="ff-mobile-home" href="index.html" aria-label="Kembali ke Beranda">🏠</a>';

    const overlay=document.createElement('div');
    overlay.className='ff-mobile-overlay';
    overlay.id='ffMenuOverlay';

    const drawer=document.createElement('aside');
    drawer.className='ff-mobile-drawer';
    drawer.setAttribute('aria-label','Menu Familia Food');
    drawer.innerHTML=
      '<div class="ff-mobile-drawer-head">'+
        '<div class="ff-mobile-drawer-title">🍀 Familia Food</div>'+
        '<button class="ff-mobile-close" id="ffMenuClose" type="button" aria-label="Tutup menu">×</button>'+
      '</div>';

    const nav=document.createElement('nav');
    nav.className='nav';
    nav.setAttribute('aria-label','Navigasi utama');

    if(navLinks.length){
      navLinks.forEach(a=>{
        const x=a.cloneNode(true);
        const href=(x.getAttribute('href')||'').split('?')[0].toLowerCase();
        const file=href.split('/').pop()||'index.html';
        x.classList.toggle('active',file===current);
        x.addEventListener('click',()=>document.body.classList.remove('ff-menu-open'));
        nav.appendChild(x);
      });
    }else{
      fallbackLinks.forEach(([href,label])=>{
        const x=document.createElement('a');
        x.href=href;
        x.textContent=label;
        x.className=href.toLowerCase()===current?'active':'';
        x.addEventListener('click',()=>document.body.classList.remove('ff-menu-open'));
        nav.appendChild(x);
      });
    }

    drawer.appendChild(nav);

    const bottom=document.createElement('nav');
    bottom.className='ff-mobile-bottom';
    bottom.setAttribute('aria-label','Akses cepat');

    const quick=[
      ['index.html','🏠','Home'],
      ['penjualan.html','💰','Kasir'],
      ['produk.html','📦','Produk'],
      ['rekap.html','📊','Rekap'],
      ['operasional.html','🧾','Operasional']
    ];

    bottom.innerHTML=quick.map(([href,ico,label])=>{
      const active=href===current?' active':'';
      return '<a class="'+active+'" href="'+esc(href)+'">'+
             '<span class="ico">'+ico+'</span><span>'+label+'</span></a>';
    }).join('');

    document.body.prepend(top,overlay,drawer);
    document.body.appendChild(bottom);

    const open=()=>{
      document.body.classList.add('ff-menu-open');
      document.getElementById('ffMenuOpen')?.setAttribute('aria-expanded','true');
    };

    const close=()=>{
      document.body.classList.remove('ff-menu-open');
      document.getElementById('ffMenuOpen')?.setAttribute('aria-expanded','false');
    };

    document.getElementById('ffMenuOpen')?.addEventListener('click',open);
    document.getElementById('ffMenuClose')?.addEventListener('click',close);
    overlay.addEventListener('click',close);

    document.addEventListener('keydown',e=>{
      if(e.key==='Escape') close();
    });

    window.addEventListener('resize',()=>{
      if(!isMobile()) close();
    });

    watchMobileTables();
  }

  function boot(){
    try{
      setup();
    }catch(e){
      console.error('Familia Android shell:',e);
      document.body?.classList.remove('ff-android');
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }
})();
