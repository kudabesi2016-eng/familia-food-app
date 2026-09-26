/* Familia Food POS - shared pure helpers. No database writes here. */
(function(){
  const norm = v => String(v ?? '').trim().toLowerCase().replace(/\s+/g,' ');
  const monthOf = v => {
    const m = String(v ?? '').match(/^(\d{4})-(\d{1,2})/);
    return m ? `${m[1]}-${String(Number(m[2])).padStart(2,'0')}` : '';
  };
  const isMonth = v => /^\d{4}-\d{2}$/.test(String(v ?? ''));
  const rupiah = n => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const aliasMap = new Map([
    ['naget isi 10','Naget 10'], ['naget 10','Naget 10'],
    ['naget isi 12','Naget 12'], ['naget 12','Naget 12'],
    ['naget isi 20','Naget 20'], ['naget 20','Naget 20'],
    ['naget isi 25+ saus','Naget 25+ Saus'], ['naget 25+ saus','Naget 25+ Saus'],
    ['naget isi 30','Naget 30'], ['naget 30','Naget 30'],
    ['naget isi 40','Naget 40'], ['naget 40','Naget 40'],
    ['naget isi 50','Naget 50'], ['naget 50','Naget 50'],
    ['cireng isi 10','Cireng isi'], ['cireng isi','Cireng isi'],
    ['cireng biasa','Cireng biasa'], ['cireng crispy','Cireng biasa'], ['cibay isi 10','Cibay'], ['cibay','Cibay']
  ]);

  function findProduct(products, name, id){
    const byId = id != null ? (products || []).find(p => String(p.id) === String(id)) : null;
    if(byId) return byId;
    const raw = norm(name);
    if(!raw) return null;
    const alias = aliasMap.get(raw);
    if(alias){
      const a = norm(alias);
      const p = (products || []).find(x => norm(x.nama_produk) === a);
      if(p) return p;
    }
    return (products || []).find(x => norm(x.nama_produk) === raw) || null;
  }

  function hppMap(products, hpps){
    const m = new Map();
    const pm = new Map((products || []).map(p => [String(p.id), p]));
    (hpps || []).forEach(h => { if(pm.has(String(h.produk_id))) m.set(String(h.produk_id), Number(h.hpp_unit || 0)); });
    return m;
  }
  function hppFor(products, hpps, row){
    const p = findProduct(products, row.product_name ?? row.jenis, row.produk_id ?? row.product_id);
    if(!p) return null;
    const v = hppMap(products,hpps).get(String(p.id));
    return Number.isFinite(v) && v > 0 ? v : null;
  }

  function expenseMonth(x){
    const p = String(x?.periode ?? '').trim();
    if(isMonth(p)) return p;
    return monthOf(x?.tanggal);
  }
  function isRangeExpense(x){
    const p = String(x?.periode ?? '').trim();
    return p !== '' && !isMonth(p);
  }

  function offlineOldRows(olds, products){
    return (olds || []).map(x => ({
      source:'data_lama', channel:'Offline', tanggal:monthOf(x.periode),
      product_id:null, product_name:(findProduct(products,x.jenis)?.nama_produk || x.jenis || '-'),
      qty:Number(x.catatan || 0), revenue:Number(x.nominal || 0),
      net:Number(x.nominal || 0), hpp:null, profit:null, knownHpp:false,
      customer:String(x.keterangan || '')
    }));
  }
  function offlineNewRows(sales, month){
    return (sales || []).filter(x => x.channel === 'Offline' && monthOf(x.tanggal) === month)
      .map(x => ({
        source:x.source || 'manual', channel:'Offline', tanggal:monthOf(x.tanggal),
        product_id:x.produk_id, product_name:x.product_name || '-', qty:Number(x.qty || 0),
        revenue:Number(x.omzet_produk ?? (Number(x.qty||0)*Number(x.harga||0))),
        net:Number(x.uang_bersih ?? x.omzet_produk ?? (Number(x.qty||0)*Number(x.harga||0))),
        hpp:x.modal_hpp != null ? Number(x.modal_hpp) : (x.hpp != null ? Number(x.hpp) : null),
        profit:x.profit_online != null ? Number(x.profit_online) : (x.laba != null ? Number(x.laba) : null),
        knownHpp:x.modal_hpp != null || x.hpp != null, id:x.id
      }));
  }
  function onlineIncomeRows(sales, month){
    return (sales || []).filter(x => x.channel === 'Online' && monthOf(x.tanggal) === month && (
      x.source === 'income_tiktok_pesanan' || x.source === 'online_historical_finance' || x.source === 'online_historical_import' || x.source === 'online_standard_finance'
    )).map(x => ({
      source:x.source, channel:'Online', tanggal:monthOf(x.tanggal), product_id:x.produk_id,
      product_name:x.product_name || '-', qty:Number(x.qty || 0), revenue:Number(x.omzet_produk || 0),
      net:Number(x.uang_bersih || 0), fee:Math.max(0,Number(x.omzet_produk || 0) - Number(x.uang_bersih || 0)),
      hpp:x.modal_hpp != null ? Number(x.modal_hpp) : null,
      profit:x.profit_online != null ? Number(x.profit_online) : null,
      knownHpp:x.modal_hpp != null, id:x.id
    }));
  }
  function onlineSellerRows(sales, month){
    const direct=(sales || []).filter(x => x.channel === 'Online' && x.source === 'seller_center' && monthOf(x.tanggal) === month);
    const fallback=(sales || []).filter(x => x.channel === 'Online' && (x.source === 'online_historical_product' || x.source === 'online_historical_import') && monthOf(x.tanggal) === month);
    const rows=direct.length?direct:fallback;
    return rows.map(x => ({
      source:x.source, product_id:x.produk_id, product_name:x.product_name || '-', qty:Number(x.qty || 0),
      revenue:Number(x.omzet_produk || 0), hpp:x.modal_hpp != null ? Number(x.modal_hpp) : null,
      profit:x.profit_online != null ? Number(x.profit_online) : null
    }));
  }

  function financeFor(month, channel, data){
    const {sales=[],olds=[],expenses=[],products=[],hpps=[]} = data || {};
    let rev=0,out=0,net=0,hpp=0,hppKnown=true;
    const productRows=[];
    if(channel === 'Offline' || channel === 'all'){
      const old = offlineOldRows(olds,products).filter(r=>r.tanggal === month);
      const neu = offlineNewRows(sales,month);
      for(const r of old){
        rev += r.revenue; net += r.net;
        const h = hppFor(products,hpps,r);
        if(h == null) hppKnown=false; else hpp += r.qty*h;
        productRows.push({...r, hpp:h != null ? r.qty*h : null, profit:h != null ? r.net-r.qty*h : null, knownHpp:h != null});
      }
      for(const r of neu){
        rev += r.revenue; net += r.net;
        if(r.knownHpp) hpp += Number(r.hpp||0); else hppKnown=false;
        productRows.push(r);
      }
      // Pengeluaran sah untuk bulan berjalan. Gunakan periode bila valid,
      // atau fallback ke tanggal. Jangan membuang data hanya karena periode
      // berbentuk rentang/teks; yang penting bulan dapat ditentukan dengan aman.
      const ex = (expenses || []).filter(x => expenseMonth(x) === month);
      const expenseTotal = ex.reduce((a,x)=>a+Number(x.nominal||0),0);
      out += expenseTotal;
      net -= expenseTotal;
    }
    if(channel === 'Online' || channel === 'all'){
      const fin = onlineIncomeRows(sales,month);
      rev += fin.reduce((a,x)=>a+x.revenue,0);
      net += fin.reduce((a,x)=>a+x.net,0);
      out += fin.reduce((a,x)=>a+x.fee,0);
      for(const x of onlineSellerRows(sales,month)) productRows.push({channel:'Online',...x});
      const detail = onlineSellerRows(sales,month);
      if(fin.length){
        if(!detail.length) hppKnown=false;
        else {
          for(const x of detail){ if(x.hpp == null) hppKnown=false; else hpp += x.hpp; }
        }
      }
    }
    const profit = hppKnown ? net - hpp : null;
    return {rev,out,net,hpp,hppKnown,profit,productRows};
  }

  function monthsOfData(data){
    const set = new Set();
    (data?.olds||[]).forEach(x=>{const m=monthOf(x.periode);if(isMonth(m))set.add(m)});
    (data?.sales||[]).forEach(x=>{const m=monthOf(x.tanggal);if(isMonth(m))set.add(m)});
    (data?.expenses||[]).forEach(x=>{const m=expenseMonth(x);if(isMonth(m))set.add(m)});
    return [...set].sort().reverse();
  }

  function productSummary(month, channel, data){
    const {sales=[],olds=[],products=[],hpps=[]} = data || {};
    const map = new Map();
    const add = (r,c)=>{
      const p = findProduct(products,r.product_name,r.product_id);
      const name = p?.nama_produk || r.product_name || '-';
      const key = c+'|'+name;
      if(!map.has(key)) map.set(key,{name,channel:c,qty:0,rev:0,hpp:0,hppKnown:true,profit:0,profitKnown:true});
      const g=map.get(key); g.qty+=Number(r.qty||0); g.rev+=Number(r.revenue||0);
      let resolvedHpp = r.hpp != null ? Number(r.hpp) : null;
      if(resolvedHpp == null && c==='Offline') { const h=hppFor(products,hpps,r); if(h!=null) resolvedHpp=Number(r.qty||0)*h; }
      if(resolvedHpp != null) g.hpp+=resolvedHpp; else g.hppKnown=false;
      if(r.profit!=null) g.profit+=Number(r.profit); else {
        const h = c==='Offline' ? hppFor(products,hpps,r) : null;
        if(c==='Offline' && h!=null) g.profit += Number(r.net||r.revenue||0)-Number(r.qty||0)*h;
        else g.profitKnown=false;
      }
    };
    if(channel==='Offline'||channel==='all'){
      for(const r of offlineOldRows(olds,products).filter(x=>x.tanggal===month)) add(r,'Offline');
      for(const r of offlineNewRows(sales,month)) add(r,'Offline');
    }
    if(channel==='Online'||channel==='all'){
      for(const r of onlineSellerRows(sales,month)) add(r,'Online');
    }
    return [...map.values()].sort((a,b)=>a.channel.localeCompare(b.channel)||a.name.localeCompare(b.name,'id'));
  }

  window.FFCore={norm,monthOf,isMonth,rupiah,esc,findProduct,hppMap,hppFor,expenseMonth,isRangeExpense,offlineOldRows,offlineNewRows,onlineIncomeRows,onlineSellerRows,financeFor,monthsOfData,productSummary};
})();
