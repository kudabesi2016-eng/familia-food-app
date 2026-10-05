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

  /* =====================================================
     LOCKED OFFLINE FINANCE SNAPSHOT
     Shared by Rekap + Dashboard so both pages use exactly
     the same historical Jan–Agustus 2026 basis.
     Do not change these values without business approval.
  ===================================================== */
  const OFFLINE_LOCKED_MONTHLY = Object.freeze([
    {m:'2026-01',revenue:26541100,hpp:22595940,grossProfit:3945160,outsideHpp:4510300,result:-565140},
    {m:'2026-02',revenue:33617200,hpp:28079150,grossProfit:5538050,outsideHpp:3833000,result:1705050},
    {m:'2026-03',revenue:27881100,hpp:24000160,grossProfit:3880940,outsideHpp:3736325,result:144615},
    {m:'2026-04',revenue:22110700,hpp:17450890,grossProfit:4659810,outsideHpp:6046700,result:-1386890},
    {m:'2026-05',revenue:17767500,hpp:15491091,grossProfit:2276409,outsideHpp:2490800,result:-214391},
    {m:'2026-06',revenue:21577000,hpp:19354764,grossProfit:2222236,outsideHpp:3853000,result:-1630764},
    {m:'2026-07',revenue:24144500,hpp:21640131,grossProfit:2504369,outsideHpp:5795500,result:-3291131},
    {m:'2026-08',revenue:12185000,hpp:10948291,grossProfit:1236709,outsideHpp:4743700,result:-3506991}
  ]);
  const OFFLINE_LOCKED_SUMMARY = Object.freeze(
    OFFLINE_LOCKED_MONTHLY.reduce((a,r)=>({
      revenue:a.revenue+r.revenue,
      hpp:a.hpp+r.hpp,
      grossProfit:a.grossProfit+r.grossProfit,
      outsideHpp:a.outsideHpp+r.outsideHpp,
      result:a.result+r.result
    }),{revenue:0,hpp:0,grossProfit:0,outsideHpp:0,result:0})
  );
  function offlineLockedMonth(month){
    return OFFLINE_LOCKED_MONTHLY.find(x=>x.m===String(month||'')) || null;
  }
  function offlineLockedFinance(month, add){
    const base=offlineLockedMonth(month);
    if(!base) return null;
    const extra=add||{};
    const revenue=base.revenue+Number(extra.revenue||0);
    const hpp=base.hpp+Number(extra.hpp||0);
    const grossProfit=base.grossProfit+Number(extra.profit||extra.grossProfit||0);
    const outsideHpp=base.outsideHpp;
    const expense=hpp+outsideHpp;
    const result=base.result+Number(extra.profit||0);
    return {month:String(month),revenue,hpp,grossProfit,outsideHpp,expense,result,net:result};
  }

  /* =====================================================
     LOCKED ONLINE HISTORICAL BASIS
     Jan–Agustus 2026. These are business-approved audit
     values and must not be changed without approval.
  ===================================================== */
  const ONLINE_LOCKED_HISTORY = Object.freeze({10:16,12:7292,20:211,25:293,30:90,40:67,50:116});
  const ONLINE_LOCKED_TOTAL = 8085;
  const ONLINE_HISTORICAL_END = '2026-08';
  const ONLINE_NEW_START = '2026-09';
  const ONLINE_OTHER_COST_LOCKED = 35293500;
  const isOnlineHistoricalMonth = month => String(month||'') >= '2026-01' && String(month||'') <= ONLINE_HISTORICAL_END;
  const isOnlineNewMonth = month => String(month||'') >= ONLINE_NEW_START;

  const aliasMap = new Map([
    ['naget isi 10','Naget 10'], ['naget 10','Naget 10'],
    ['naget isi 12','Naget 12'], ['naget 12','Naget 12'],
    ['naget isi 20','Naget 20'], ['naget 20','Naget 20'],
    ['naget isi 25+ saus','Naget 25+ Saus'], ['naget 25+ saus','Naget 25+ Saus'],
    ['naget isi 30','Naget 30'], ['naget 30','Naget 30'],
    ['naget isi 40','Naget 40'], ['naget 40','Naget 40'],
    ['naget isi 50','Naget 50'], ['naget 50','Naget 50'],
    ['cireng isi 10','Cireng isi'], ['cireng isi','Cireng isi'],
    ['cireng biasa','Cireng biasa'],
    ['cibay isi 10','Cibay'], ['cibay','Cibay']
  ]);

  const OFFLINE_PRODUCTS = new Set([
    'naget 10','naget isi 10',
    'naget 12','naget isi 12',
    'cireng isi','cireng isi 10',
    'cireng biasa','cireng crispy',
    'cibay','cibay isi 10'
  ]);

  const ONLINE_ONLY_PRODUCTS = new Set([
    'naget 20','naget isi 20',
    'naget 25+saus','naget isi 25+ saus',
    'naget 30','naget isi 30',
    'naget 40','naget isi 40',
    'naget 50','naget isi 50'
  ]);

  function productChannel(name, variation){
    const n = norm(name);
    const v = norm(variation);
    if(v === 'dropship' || n === 'dropship' || n.includes(' dropship ')) return 'Online';
    if(ONLINE_ONLY_PRODUCTS.has(n)) return 'Online';
    if(OFFLINE_PRODUCTS.has(n) || aliasMap.has(n)) return 'Offline';
    return null;
  }

  function isOfflineProduct(name, variation){
    return productChannel(name, variation) === 'Offline';
  }

  function isOnlineProduct(name, variation){
    return productChannel(name, variation) === 'Online';
  }

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

  function isCashExpense(x){
    return String(x?.cara_bayar || 'Tunai') !== 'Hutang';
  }

  function expenseIsInHpp(x){
    return String(x?.kategori || '').trim().toLowerCase() === 'bahan baku';
  }

  function financeFor(month, channel, data){
    const {sales=[],olds=[],expenses=[],products=[],hpps=[]} = data || {};
    let rev=0,out=0,net=0,hpp=0,hppKnown=true;
    let expenseInHpp=0,expenseOutsideHpp=0;
    const productRows=[];
    if(channel === 'Offline' || channel === 'all'){
      const old = offlineOldRows(olds,products).filter(r => r.tanggal === month);
      const neu = offlineNewRows(sales,month);
      for(const r of old){
        rev += r.revenue; net += r.net;
        const channelMapped = isOfflineProduct(r.product_name);
        const h = channelMapped ? hppFor(products,hpps,r) : null;
        if(!channelMapped || h == null) hppKnown=false;
        if(channelMapped && h != null) hpp += r.qty*h;
        productRows.push({...r, hpp:(channelMapped && h != null) ? r.qty*h : null, profit:(channelMapped && h != null) ? r.net-r.qty*h : null, knownHpp:channelMapped && h != null});
      }
      for(const r of neu){
        rev += r.revenue; net += r.net;
        const channelMapped = isOfflineProduct(r.product_name);
        if(channelMapped && r.knownHpp) hpp += Number(r.hpp||0);
        else hppKnown=false;
        productRows.push({...r, knownHpp:channelMapped && r.knownHpp});
      }
      const ex = (expenses || []).filter(x => expenseMonth(x) === month && isCashExpense(x));
      const expenseTotal = ex.reduce((a,x)=>a+Number(x.nominal||0),0);
      expenseInHpp = ex.filter(expenseIsInHpp).reduce((a,x)=>a+Number(x.nominal||0),0);
      expenseOutsideHpp = expenseTotal - expenseInHpp;
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
    const hppMeasured = hpp > 0;
    const profit = hppMeasured ? (net + expenseInHpp - hpp) : null;
    return {rev,out,net,hpp,hppKnown,hppMeasured,expenseInHpp,expenseOutsideHpp,profit,productRows};
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

  window.FFCore={norm,monthOf,isMonth,rupiah,esc,findProduct,hppMap,hppFor,expenseMonth,isRangeExpense,isCashExpense,expenseIsInHpp,productChannel,isOfflineProduct,isOnlineProduct,offlineOldRows,offlineNewRows,onlineIncomeRows,onlineSellerRows,financeFor,monthsOfData,productSummary,OFFLINE_LOCKED_MONTHLY,OFFLINE_LOCKED_SUMMARY,offlineLockedMonth,offlineLockedFinance,ONLINE_LOCKED_HISTORY,ONLINE_LOCKED_TOTAL,ONLINE_HISTORICAL_END,ONLINE_NEW_START,isOnlineHistoricalMonth,isOnlineNewMonth,ONLINE_OTHER_COST_LOCKED};
})();
