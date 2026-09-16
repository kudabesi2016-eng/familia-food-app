/* Familia Food shared settings: master settings are user-editable data, never calculation rules. */
(function(){
  const fallback='#087443';
  const apply=async()=>{
    try{
      if(typeof supabaseClient==='undefined') return;
      const r=await supabaseClient.from('pengaturan').select('*').order('id',{ascending:true}).limit(1);
      if(r.error||!r.data?.[0]) return;
      const s=r.data[0], color=(s.warna||fallback).trim(), name=(s.nama_usaha||'Familia Food').trim();
      document.documentElement.style.setProperty('--brand-color',color);
      document.documentElement.style.setProperty('--green',color);
      document.querySelectorAll('.brand,.logo').forEach(el=>{
        const logo=(s.logo||'').trim();
        el.innerHTML=logo?`<img src="${logo.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" alt="${name.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" style="max-height:42px;max-width:150px;object-fit:contain;vertical-align:middle">`:`🍀 ${name.replace(/</g,'&lt;').replace(/>/g,'&gt;')}`;
      });
      document.title=document.title.replace(/Familia Food|Dashboard|Produk|Bahan Baku|Resep Produk|HPP|Penjualan|Rekap|Data Lama|Pengaturan/g,name);
    }catch(e){console.warn('Pengaturan bersama tidak dapat dimuat:',e);}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();
