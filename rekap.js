
/* =====================================================
   ELEMENT
===================================================== */

const $ = id => document.getElementById(id);

// Biaya Online Lainnya yang sudah dikunci sebagai satu angka:
// modal dropship + gaji packing.
const ONLINE_OTHER_COST_LOCKED = 35293500;

/*
 * Jangan hentikan seluruh Rekap bila ff-core.js terlambat/gagal dimuat.
 * Pakai helper lokal sebagai fallback lalu gunakan FFCore bila tersedia.
 */
const FF = window.FFCore || {
  norm: v => String(v ?? '').trim().toLowerCase().replace(/\s+/g,' '),
  monthOf: v => {
    const m=String(v ?? '').match(/^(\d{4})-(\d{1,2})/);
    return m ? m[1]+'-'+String(Number(m[2])).padStart(2,'0') : '';
  },
  isMonth: v => /^\d{4}-\d{2}$/.test(String(v ?? '')),
  rupiah: n => 'Rp '+Math.round(Number(n)||0).toLocaleString('id-ID'),
  esc: v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  monthsOfData: d => {
    const set=new Set();
    (d?.olds||[]).forEach(x=>{const m=String(x.periode||'').slice(0,7);if(/^\d{4}-\d{2}$/.test(m))set.add(m)});
    (d?.sales||[]).forEach(x=>{const m=String(x.tanggal||'').slice(0,7);if(/^\d{4}-\d{2}$/.test(m))set.add(m)});
    (d?.expenses||[]).forEach(x=>{const m=String(x.periode||'').slice(0,7);if(/^\d{4}-\d{2}$/.test(m))set.add(m)});
    (d?.purchases||[]).forEach(x=>{const m=String(x.tanggal||'').slice(0,7);if(/^\d{4}-\d{2}$/.test(m))set.add(m)});
    (d?.returns||[]).forEach(x=>{const m=String(x.tanggal||'').slice(0,7);if(/^\d{4}-\d{2}$/.test(m))set.add(m)});
    return [...set].sort();
  },
  productSummary: () => []
};
const esc = FF.esc;


/* =====================================================
   DATA
===================================================== */

let sales = [];
let olds = [];
let expenses = [];
let expenseItems = [];
let products = [];
let hpps = [];
let purchases = [];
let returns = [];
let debtRecords = [];
let debtPayments = [];




/* =====================================================
   FETCH SUPABASE
===================================================== */

async function fetchAll(table, select='*'){

  let result = [];
  let start = 0;

  while(true){

    const r = await supabaseClient
      .from(table)
      .select(select)
      .range(start,start + 999);

    if(r.error){
      throw r.error;
    }

    const rows = r.data || [];

    result.push(...rows);

    if(rows.length < 1000){
      break;
    }

    start += 1000;

  }

  return result;

}


/* =====================================================
   FETCH AMAN
   Jangan biarkan satu tabel yang lambat/gagal membuat
   seluruh halaman Rekap berhenti di "Memuat...".
===================================================== */
async function fetchAllSafe(table, select='*', timeoutMs=15000){
  return await Promise.race([
    fetchAll(table,select),
    new Promise((_,reject)=>setTimeout(
      ()=>reject(new Error('Timeout membaca tabel '+table)),
      timeoutMs
    ))
  ]);
}


/* =====================================================
   DATA CORE
===================================================== */

const data = () => ({
  sales,
  olds,
  expenses,
  products,
  hpps,
  purchases,
  returns,
  debtRecords,
  debtPayments
});


/* =====================================================
   FORMAT RUPIAH
===================================================== */

const money = n => {

  return FF.rupiah(
    Number(n) || 0
  );

};


/* =====================================================
   LABEL BULAN
===================================================== */

const label = m => {

  return new Date(
    m + '-01T00:00:00'
  ).toLocaleDateString(
    'id-ID',
    {
      month:'long',
      year:'numeric'
    }
  );

};


/* =====================================================
   KEUANGAN ONLINE
   Historis resmi dibaca dari Data Lama Online STANDARD.
===================================================== */

function monthOfSaleRow(x){
  return FF.monthOf(x.tanggal||x.paid_time||x.created_time||'') || String(x.periode||'').slice(0,7);
}

function isCashExpense(x){
  // Hutang dicatat di Pengeluaran Utama untuk keterlacakan, tetapi
  // bukan arus kas/pengeluaran yang sudah dibayar. Pembayaran hutang
  // juga tidak dicatat ulang sebagai pengeluaran.
  return String(x?.cara_bayar||'Tunai').trim()!=='Hutang';
}
function offlineFinance(m){
  const oldRows=(olds||[]).filter(x=>String(x.periode||'').slice(0,7)===m);
  const newRows=(sales||[]).filter(x=>String(x.channel||'')==='Offline' && monthOfSaleRow(x)===m);
  const expenseRows=(expenses||[]).filter(x=>String(x.periode||'').trim()===m && isCashExpense(x));
  const oldRev=oldRows.reduce((a,x)=>a+Math.round(Number(x.nominal ?? x.omzet ?? x.total ?? 0)),0);
  const newRev=newRows.reduce((a,x)=>a+Math.round(Number(x.omzet_produk ?? (Number(x.qty||0)*Number(x.harga||0))),0),0);
  const rev=oldRev+newRev;
  const expense=expenseRows.reduce((a,x)=>a+Math.round(Number(x.nominal||0)),0);
  // Offline: Uang Bersih/Laba Offline = Pemasukan − Pengeluaran Tunai.
  // Hutang dipisahkan dari arus kas dan ditampilkan di modul Hutang.
  // HPP ditampilkan terpisah agar tidak dihitung dua kali.
  const net=rev-expense;
  return [rev,expense,net];
}

function onlineFinance(m){
  const rows=(sales||[]).filter(x=>String(x.channel||'')==='Online' && monthOfSaleRow(x)===m);

  // DATA LAMA ONLINE: Income/Settlement historis.
  const hist=rows.filter(x=>String(x.source||'')==='online_standard_finance');
  const histRev=hist.reduce((a,x)=>a+Number(x.omzet_produk||0),0);
  const histFee=hist.reduce((a,x)=>a+Number(x.biaya_platform||0),0);
  const histNet=hist.reduce((a,x)=>a+Number(x.uang_bersih||0),0);

  // DATA TRANSAKSI ONLINE BARU: Produk keluar + penerimaan uang.
  // Keduanya ditambahkan ke data lama, bukan menggantikan data lama.
  const newProducts=rows.filter(x=>String(x.source||'')==='online_batch');
  const newCash=rows.filter(x=>String(x.source||'')==='online_pencairan');

  const newNetKnown=newCash.length>0;
  const newNet=newCash.reduce(
    (a,x)=>a+Number(x.uang_bersih ?? x.omzet_produk ?? 0),0
  );

  // TRANSAKSI ONLINE BARU:
  // Nilai yang dicatat di "Penerimaan Uang Online" sudah merupakan
  // UANG BERSIH setelah seluruh potongan online. Jadi tidak ada
  // perhitungan potongan lagi untuk transaksi baru.
  // Untuk rekap, nilai penerimaan baru diperlakukan sebagai pemasukan
  // yang sudah bersih, lalu profit = uang bersih - modal.
  const totalRev=histRev+(newNetKnown?newNet:0);
  const totalNet=histNet+(newNetKnown?newNet:0);
  const totalFee=histFee;
  return [totalRev,totalFee,totalNet];
}

/* =====================================================
   HPP / MODAL ONLINE
===================================================== */

function ffNormOnline(v){
  return String(v??'').toLowerCase().trim().replace(/\s+/g,' ');
}
function ffDetectPackSize(row){
  const product=ffNormOnline(row?.product_name), variation=ffNormOnline(row?.variation);
  const n=ffNormOnline([row?.product_name,row?.variation,row?.seller_sku].filter(Boolean).join(' | '));
  const exactSku=String(row?.sku_id??'').trim();
  if(exactSku==='1733751720824702091')return 12;
  if(variation==='default' && /tempura aci naget/.test(product) && /bulat/.test(product) && !/(?:isi|pcs|bungkus)\s*(?:10|12|20|25|30|40|50)/.test(product))return 12;
  let z=n.match(/\b(\d+)\s*bungkus\s*(?:isi|is)\s*(\d+)\s*pcs?\b/);
  if(z){const packs=Number(z[1]),pcs=Number(z[2]),per=pcs/packs;if([10,12,20,25,30,40,50].includes(per))return per;}
  z=n.match(/\bisi\s*(10|12|20|25|30|40|50)\s*pcs?\b/); if(z)return Number(z[1]);
  z=n.match(/\b(10|12|20|25|30|40|50)\s*pcs?\b/); if(z)return Number(z[1]);
  z=n.match(/\bisi\s*(10|12|20|25|30|40|50)\b/); if(z)return Number(z[1]);
  return null;
}
function ffIsFamiliaOnline(row){
  const n=ffNormOnline([row?.product_name,row?.variation].filter(Boolean).join(' | '));
  if(/saus bantal|saos bakso/.test(n))return false;
  return /\btempura aci\b|\bnaget\b/.test(n);
}
function ffMasterNameForSize(size){
  const n=Number(size);
  if(n===25)return 'naget 25+saus';
  if([10,12,20,30,40,50].includes(n))return 'naget '+n;
  return '';
}
function ffOnlineHppUnit(row){
  if(!ffIsFamiliaOnline(row))return null;
  const size=ffDetectPackSize(row);
  const target=ffMasterNameForSize(size);
  if(!target)return null;
  const product=products.find(x=>ffNormOnline(x.nama_produk)===target);
  if(!product)return null;
  const h=hpps.find(x=>String(x.produk_id)===String(product.id));
  if(!h)return null;
  const price=Number(h.harga_online!=null?h.harga_online:(product.harga_online||0));
  const untung=Number(h.untung_online||0);
  if(price>0 && untung>=0 && price-untung>0)return Math.trunc(price-untung);
  if(h.hpp_online!=null&&Number(h.hpp_online)>0)return Math.trunc(Number(h.hpp_online));
  if(h.hpp_unit!=null&&Number(h.hpp_unit)>0)return Math.trunc(Number(h.hpp_unit));
  return null;
}

function onlineHpp(m){
  try{
    let total=0;

    // Historis TikTok Jan–Agustus 2026: wajib audit 8.085 bungkus.
    if(m>='2026-01' && m<='2026-08'){
      const lockedRows=(sales||[]).filter(x=>
        String(x.channel||'')==='Online' &&
        String(x.source||'')==='seller_center' &&
        monthOfSaleRow(x)===m
      );

      const lockedTotalAllMonths=(sales||[])
        .filter(x=>
          String(x.channel||'')==='Online' &&
          String(x.source||'')==='seller_center' &&
          monthOfSaleRow(x)>='2026-01' &&
          monthOfSaleRow(x)<='2026-08'
        )
        .reduce((a,x)=>a+Math.trunc(Number(x.qty||0)),0);

      const hasMissingHpp=lockedRows.some(x=>
        Number(x.qty||0)>0 &&
        Number(x.modal_hpp ?? (Number(x.qty||0)*Number(x.hpp||0)))<=0
      );

      if(lockedRows.length && (lockedTotalAllMonths!==8085 || hasMissingHpp)){
        return {known:false,total:0};
      }

      total+=lockedRows.reduce((a,x)=>{
        if(Number(x.qty||0)<=0)return a;
        const modal=x.modal_hpp!=null
          ? Number(x.modal_hpp)
          : Number(x.qty||0)*Number(x.hpp||0);
        return a+Math.trunc(modal||0);
      },0);
    }

    // Transaksi Online Baru: tambahkan modal produk keluar.
    const newProducts=(sales||[]).filter(x=>
      String(x.channel||'')==='Online' &&
      String(x.source||'')==='online_batch' &&
      monthOfSaleRow(x)===m
    );

    for(const x of newProducts){
      const modal=Number(x.modal_hpp ?? (Number(x.qty||0)*Number(x.hpp||0)));
      if(!Number.isFinite(modal) || modal<=0){
        return {known:false,total:0};
      }
      total+=Math.trunc(modal);
    }

    // Fallback lama bila belum ada sumber seller_center maupun transaksi baru.
    const hasCurrent=(
      ((sales||[]).some(x=>String(x.channel||'')==='Online' && String(x.source||'')==='seller_center' && monthOfSaleRow(x)===m)) ||
      newProducts.length>0
    );
    if(!hasCurrent){
      const standardProducts=(sales||[]).filter(x=>
        String(x.channel||'')==='Online' &&
        String(x.source||'')==='online_standard_product' &&
        monthOfSaleRow(x)===m
      );
      if(standardProducts.length){
        const familiaRows=standardProducts.filter(ffIsFamiliaOnline);
        for(const x of familiaRows){
          const unit=ffOnlineHppUnit(x);
          if(unit==null)return {known:false,total:0};
          total+=Math.trunc(Number(x.qty||0))*unit;
        }
      }
      const standard=(sales||[]).filter(x=>
        String(x.channel||'')==='Online' &&
        String(x.source||'')==='online_standard_finance' &&
        monthOfSaleRow(x)===m
      );
      if(standard.length){
        const missing=standard.some(x=>x.modal_hpp==null);
        if(missing)return {known:false,total:0};
      }
    }

    return {known:true,total:Math.trunc(total)};
  }catch(e){
    return {known:false,total:0};
  }
}

function offlineHpp(m){
  try{
    const rows=FF.productSummary(m,'Offline',data())||[];
    let total=0;
    for(const x of rows){
      if(x.hppKnown===false)return {known:false,total:0};
      if(x.hpp==null)return {known:false,total:0};
      total+=Math.trunc(Number(x.hpp)||0);
    }
    return {known:true,total:Math.trunc(total)};
  }catch(e){
    return {known:false,total:0};
  }
}

function finance(m){
  return $('channel').value==='Offline' ? offlineFinance(m) : onlineFinance(m);
}

function hppForChannel(m){
  return $('channel').value==='Offline' ? offlineHpp(m) : onlineHpp(m);
}

function updateChannelUI(){
  const offline=$('channel').value==='Offline';
  $('pageTitle').textContent=offline?'📊 Rekap Offline':'📊 Rekap Online';
  $('pageSub').textContent=offline?'Rekap penjualan Offline Familia Food per bulan.':'Rekap penjualan Online Shop Familia Food per bulan.';
  $('outLabel').textContent=offline?'Potongan':'Potongan Online Shop';
  $('monthlyOutHead').textContent=offline?'Potongan':'Potongan Online Shop';
  $('monthlyTitle').textContent=offline?'Rekap Offline Bulanan':'Rekap Online Bulanan';
  $('noticeChannel').textContent=offline?'🟢 Rekap Offline':'🔵 Rekap Online';
  $('noticeText').innerHTML=offline
    ? 'Pemasukan berasal dari Data Lama Offline dan transaksi Offline baru.<br>Pengeluaran ditampilkan terpisah.<br><b>Hasil Bersih Offline = Pemasukan − Pengeluaran.</b><br>HPP Produk Keluar ditampilkan terpisah agar biaya tidak dihitung dua kali.<br>Margin = Hasil Bersih ÷ Pemasukan × 100%.'
    : 'Pemasukan berasal dari Data Lama Online STANDARD dan Penerimaan Uang Online baru.<br>Untuk transaksi Online Baru, angka yang dimasukkan sudah berupa <b>Uang Bersih setelah potongan</b>, jadi tidak dihitung potongan lagi.<br><b>HPP/Profit historis Jan–Agustus memakai data audit TikTok yang tersimpan sebagai seller_center dan wajib total 8.085 bungkus.</b><br>Profit transaksi baru = Uang Bersih − Modal.<br>';
}

/* =====================================================
   BULAN
===================================================== */

function months(){
  const set=new Set();
  (sales||[]).forEach(x=>{
    const m=monthOfSaleRow(x);
    if(/^\d{4}-\d{2}$/.test(m))set.add(m);
  });
  (olds||[]).forEach(x=>{
    const m=String(x.periode||'').slice(0,7);
    if(/^\d{4}-\d{2}$/.test(m))set.add(m);
  });
  (purchases||[]).forEach(x=>{const m=String(x.tanggal||'').slice(0,7);if(/^\d{4}-\d{2}$/.test(m))set.add(m);});
  (returns||[]).forEach(x=>{const m=String(x.tanggal||'').slice(0,7);if(/^\d{4}-\d{2}$/.test(m))set.add(m);});
  try{FF.monthsOfData(data()).forEach(m=>set.add(m));}catch(e){}
  return [...set].sort();
}


/* =====================================================
   RENDER KARTU
===================================================== */

function renderCards(){
  const m=$('month').value;
  const offline=$('channel').value==='Offline';
  const v=finance(m);
  const marginEl=$('margin');
  if(!v){
    $('rev').textContent='Rp 0';
    $('out').textContent='Rp 0';
    $('net').textContent='Rp 0';
    $('hpp').textContent='—';
    $('profit').textContent='—';
    if(marginEl)marginEl.textContent='—';
    return;
  }
  const h=hppForChannel(m);
  $('rev').textContent=money(v[0]);
  $('out').textContent=money(v[1]);
  $('net').textContent=money(v[2]);

  if(offline){
    const profit=v[2];
    const margin=v[0]>0 ? (profit/v[0])*100 : null;
    $('hpp').textContent=h.known?money(h.total):'—';
    $('profit').textContent=profit===null?'—':money(profit);
    if(marginEl)marginEl.textContent=margin===null?'—':margin.toFixed(2)+'%';
    return;
  }

  if(h.known){
    const profit=v[2]-h.total;
    const margin=v[2]?(profit/v[2])*100:0;
    $('hpp').textContent=money(h.total);
    $('profit').textContent=money(profit);
    if(marginEl)marginEl.textContent=margin.toFixed(2)+'%';
  }else{
    $('hpp').textContent='—';
    $('profit').textContent='—';
    if(marginEl)marginEl.textContent='—';
  }
}

/* =====================================================
   RENDER TABEL
===================================================== */

function renderNewOnlineMonthly(){
  const tb=document.getElementById('newOnlineMonthly'); if(!tb)return;
  const ms=months();
  if(!ms.length){tb.innerHTML='<tr><td colspan="8" class="empty">Belum ada data.</td></tr>';return;}
  tb.innerHTML=ms.map(m=>{
    const productRows=(sales||[]).filter(x=>String(x.channel||'')==='Online' && String(x.source||'')==='online_batch' && monthOfSaleRow(x)===m);
    const cashRows=(sales||[]).filter(x=>String(x.channel||'')==='Online' && String(x.source||'')==='online_pencairan' && monthOfSaleRow(x)===m);
    const qty=productRows.reduce((a,x)=>a+Math.round(Number(x.qty||0)),0);
    let familia=0,dropship=0;
    productRows.forEach(x=>{const v=Math.round(Number(x.modal_hpp??x.hpp??0)); if(String(x.variation||'').toLowerCase()==='dropship')dropship+=v; else familia+=v;});
    const cash=cashRows.reduce((a,x)=>a+Math.round(Number(x.uang_bersih??x.omzet_produk??0)),0);
    const profit=cash-(familia+dropship);
    const margin=cash?profit/cash*100:0;
    return `<tr><td><b>${label(m)}</b></td><td>${qty.toLocaleString('id-ID')}</td><td>${money(familia)}</td><td><b>${money(cash)}</b></td><td><b style="color:${profit<0?'#b42318':''}">${money(profit)}</b></td><td>${productRows.filter(x=>String(x.variation||'').toLowerCase()==='dropship').reduce((a,x)=>a+Math.round(Number(x.qty||0)),0).toLocaleString('id-ID')} bungkus</td><td>${money(dropship)}</td><td>${margin.toFixed(2)}%</td></tr>`;
  }).join('');
}

window.viewOnlineMonth=function(m){
  const card=$('onlineConnectionCard');
  if(!card)return;
  card.style.display='block';
  if($('channel').value==='Online'){
    renderOnlineConnection(m);
  }else{
    const title=$('onlineConnectionTitle');
    const note=$('onlineConnectionNote');
    const body=$('onlineConnectionBody');
    const v=offlineFinance(m);
    const h=offlineHpp(m);
    const profit=v[2];
    const margin=v[0]>0 ? (profit/v[0])*100 : null;
    if(title)title.textContent='🔗 Detail Rekap Offline • '+label(m);
    if(note)note.innerHTML='Ringkasan untuk <b>'+FF.esc(label(m))+'</b>.';
    if(body)body.innerHTML='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px"><div class="stat"><small>Pemasukan</small><strong>'+money(v[0])+'</strong></div><div class="stat"><small>Pengeluaran</small><strong>'+money(v[1])+'</strong></div><div class="stat"><small>Hasil Bersih</small><strong>'+money(v[2])+'</strong></div><div class="stat profit"><small>Hasil Bersih Offline</small><strong>'+money(profit)+'</strong><div class="hint" style="margin-top:4px">Margin '+(margin===null?'—':margin.toFixed(2)+'%')+'</div></div></div><div class="notice" style="margin-top:12px">HPP Produk Keluar: <b>'+(h.known?money(h.total):'Belum tersedia')+'</b> (terpisah)</div>';
  }
};

function renderOnlineConnection(selectedMonth){
  const body=$('onlineConnectionBody');
  const note=$('onlineConnectionNote');
  if(!body||!note)return;

  const m=selectedMonth||$('month').value;
  const modeOnline=$('channel').value==='Online';
  const modeBadge=document.getElementById('onlineConnectionMode');
  if(modeBadge)modeBadge.textContent=modeOnline?'🔵 Online':'🟢 Offline';

  if(!modeOnline){
    const opsBuy=(purchases||[]).filter(x=>String(x.tanggal||'').slice(0,7)===m).reduce((a,x)=>a+Number(x.total||0),0);
    const opsRet=(returns||[]).filter(x=>String(x.tanggal||'').slice(0,7)===m && String(x.channel||'')==='Offline').reduce((a,x)=>a+Number(x.nominal||0),0);
    const opsExp=(expenses||[]).filter(x=>String(x.periode||'').slice(0,7)===m && isCashExpense(x)).reduce((a,x)=>a+Number(x.nominal||0),0);
    note.innerHTML='Bulan <b>'+esc(label(m))+'</b>. Ringkasan Offline tetap memakai rumus penjualan Familia Food. Informasi Operasional ditampilkan terpisah.';
    body.innerHTML='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">'+
      '<div class="stat"><small>🛒 Pembelian Bahan Baku</small><strong>'+money(opsBuy)+'</strong></div>'+
      '<div class="stat"><small>💸 Pengeluaran</small><strong>'+money(opsExp)+'</strong></div>'+
      '<div class="stat"><small>↩️ Retur Offline</small><strong>'+money(opsRet)+'</strong></div>'+
      '</div>';
    return;
  }

  if(!m){
    note.textContent='Belum ada bulan yang dipilih.';
    body.innerHTML='';
    return;
  }

  const rows=(sales||[]).filter(x=>String(x.channel||'')==='Online' && monthOfSaleRow(x)===m);
  const histFinance=rows.filter(x=>String(x.source||'')==='online_standard_finance');
  const newProducts=rows.filter(x=>String(x.source||'')==='online_batch');
  const newCash=rows.filter(x=>String(x.source||'')==='online_pencairan');

  const histRev=histFinance.reduce((a,x)=>a+Number(x.omzet_produk||0),0);
  const histFee=histFinance.reduce((a,x)=>a+Number(x.biaya_platform||0),0);
  const histNet=histFinance.reduce((a,x)=>a+Number(x.uang_bersih||0),0);

  const newQty=newProducts.reduce((a,x)=>a+Math.round(Number(x.qty||0)),0);
  const newModal=newProducts.reduce((a,x)=>a+Math.round(Number(x.modal_hpp??x.hpp??0)),0);
  const newCashAmount=newCash.reduce((a,x)=>a+Number(x.uang_bersih??x.omzet_produk??0),0);
  const opsBuy=(purchases||[]).filter(x=>String(x.tanggal||'').slice(0,7)===m).reduce((a,x)=>a+Number(x.total||0),0);
  const opsRet=(returns||[]).filter(x=>String(x.tanggal||'').slice(0,7)===m && String(x.channel||'')==='Online').reduce((a,x)=>a+Number(x.nominal||0),0);
  const opsExp=(expenses||[]).filter(x=>String(x.periode||'').slice(0,7)===m).reduce((a,x)=>a+Number(x.nominal||0),0);

  const totalHpp=hppForChannel(m);
  const oldHppKnown=totalHpp.known;
  const oldHpp=oldHppKnown?Math.max(0,totalHpp.total-newModal):null;

  note.innerHTML='Bulan <b>'+esc(label(m))+'</b>. Data Lama ditampilkan sebagai ringkasan, sedangkan <b>👁 Lihat Data</b> hanya membuka rincian <b>Transaksi Online Baru</b>.';

  let list='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">';
  list+='<div class="stat"><small>🛒 Pembelian Bahan Baku</small><strong>'+money(opsBuy)+'</strong></div>';
  list+='<div class="stat"><small>💸 Pengeluaran</small><strong>'+money(opsExp)+'</strong></div>';
  list+='<div class="stat"><small>↩️ Retur Online</small><strong>'+money(opsRet)+'</strong></div>';
  list+='</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">';

  list+='<div class="stat"><small>📁 Data Lama Online</small><strong>'+histFinance.length.toLocaleString('id-ID')+' baris</strong><div class="hint" style="margin-top:8px">Pemasukan '+money(histRev)+'<br>Potongan '+money(histFee)+'<br>Uang Bersih '+money(histNet)+'<br>Modal '+(oldHppKnown?money(oldHpp):'—')+'</div></div>';

  list+='<div class="stat profit"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><div><small>🆕 Transaksi Online Baru</small><strong>'+newProducts.length.toLocaleString('id-ID')+' baris • '+newQty.toLocaleString('id-ID')+' bungkus</strong></div><button class="btn light" type="button" id="viewNewOnlineDetail">👁 Lihat Data</button></div><div class="hint" style="margin-top:8px">Modal Produk Keluar '+money(newModal)+'<br>Penerimaan Uang '+money(newCashAmount)+'</div></div>';
  list+='</div>';

  list+='<div id="newOnlineDetail" style="display:none;margin-top:12px"><div class="tablewrap"><table style="min-width:850px"><thead><tr><th>Tanggal</th><th>Jenis</th><th>Produk</th><th>Qty Bungkus</th><th>Modal / Bungkus</th><th>Total Modal</th></tr></thead><tbody>';

  if(newProducts.length){
    list+=newProducts.map(x=>{
      const qty=Math.max(1,Math.round(Number(x.qty)||0));
      const total=Math.round(Number(x.modal_hpp??x.hpp??0));
      const unit=qty?Math.round(total/qty):0;
      return '<tr><td>'+esc(x.tanggal||'-')+'</td><td>'+esc(x.variation||'Naget')+'</td><td>'+esc(x.product_name||'-')+'</td><td>'+qty.toLocaleString('id-ID')+'</td><td>'+money(unit)+'</td><td>'+money(total)+'</td></tr>';
    }).join('');
  }else{
    list+='<tr><td colspan="6" class="empty">Belum ada transaksi Online Baru pada '+esc(label(m))+'.</td></tr>';
  }

  list+='</tbody></table></div></div>';
  body.innerHTML=list;

  const detailBtn=document.getElementById('viewNewOnlineDetail');
  const detailBox=document.getElementById('newOnlineDetail');

  if(detailBtn&&detailBox){
    detailBtn.onclick=()=>{
      const open=detailBox.style.display!=='none';
      detailBox.style.display=open?'none':'block';
      detailBtn.textContent=open?'👁 Lihat Data':'▲ Tutup Data';
    };
  }
}

function renderOnlineFinalSummary(){
  const card=$('onlineFinalSummaryCard');
  if(!card)return;
  const isOnline=$('channel').value==='Online';
  card.style.display=isOnline?'block':'none';
  if(!isOnline)return;

  const onlineRows=(sales||[]).filter(x=>String(x.channel||'')==='Online');

  const net=onlineRows
    .filter(x=>String(x.source||'')==='online_standard_finance')
    .reduce((a,x)=>a+Math.round(Number(x.uang_bersih||0)),0)
    + onlineRows
    .filter(x=>String(x.source||'')==='online_pencairan')
    .reduce((a,x)=>a+Math.round(Number(x.uang_bersih ?? x.omzet_produk ?? 0)),0);

  const hpp=onlineRows
    .filter(x=>String(x.source||'')==='seller_center' || String(x.source||'')==='online_batch')
    .reduce((a,x)=>a+Math.round(Number(x.modal_hpp ?? x.hpp ?? 0)),0);

  const other=ONLINE_OTHER_COST_LOCKED;
  const profit=net-hpp-other;
  const margin=net?profit/net*100:0;

  $('onlineFinalNet').textContent=money(net);
  $('onlineFinalHpp').textContent=money(hpp);
  $('onlineFinalOther').textContent=money(other);
  $('onlineFinalProfit').textContent=money(profit);
  $('onlineFinalMargin').textContent='Margin '+margin.toFixed(2)+'%';

  const p=$('onlineFinalProfit');
  if(p)p.style.color=profit<0?'#b42318':'';
}
function renderMonthly(){

  const ms =
    months();

  if(!ms.length){

    $('monthly').innerHTML = `

      <tr>
        <td colspan="6" class="empty">
          Belum ada data ${$('channel').value}.
        </td>
      </tr>

    `;

    return;

  }


  $('monthly').innerHTML =

    ms.map(m => {

      const v =
        finance(m);

      if(!v){
        return '';
      }


      const h =
        hppForChannel(m);


      const modal =
        h.known
          ? h.total
          : null;


      const offline = $('channel').value === 'Offline';
      const profit = offline ? v[2] : (modal !== null ? v[2] - modal : null);
      const marginBase = Number(v[0]);
      const margin = profit !== null && marginBase > 0 ? (profit / marginBase) * 100 : 0;


      return `

        <tr>

          <td>
            <b>${label(m)}</b>
          </td>

          <td>
            ${money(v[0])}
          </td>

          <td>
            ${money(v[1])}
          </td>

          <td>
            <b>${money(v[2])}</b>
          </td>

          <td>

            ${
              modal !== null
                ? money(modal)
                : '—'
            }

          </td>

          <td>

            ${
              profit !== null

                ? `
                  <b>${money(profit)}</b>
                  <div class="hint" style="margin-top:4px">Margin ${margin.toFixed(2)}%</div>
                `

                : `
                  <span class="hint">
                    Modal belum tersedia
                  </span>
                `
            }

          </td>

        </tr>

      `;

    }).join('');

}


/* =====================================================
   PILIH BULAN
===================================================== */

function renderMonthOptions(){

  const ms =
    months();

  const current =
    $('month').value;


  $('month').innerHTML =

    ms.map(m => {

      return `
        <option value="${m}">
          ${label(m)}
        </option>
      `;

    }).join('');


  if(
    current &&
    ms.includes(current)
  ){

    $('month').value =
      current;

  }else if(ms.length){

    $('month').value =
      ms[0];

  }

}


/* =====================================================
   RENDER
===================================================== */

function debtMonthStats(m){
  const monthStart=m+'-01';
  const nextMonth=new Date(Number(m.slice(0,4)),Number(m.slice(5,7)),1);
  const next=nextMonth.getFullYear()+'-'+String(nextMonth.getMonth()+1).padStart(2,'0')+'-01';
  const created=(debtRecords||[]).filter(x=>String(x.tanggal||'')>=monthStart && String(x.tanggal||'')<next);
  const paymentsInMonth=(debtPayments||[]).filter(x=>String(x.tanggal||'')>=monthStart && String(x.tanggal||'')<next);
  let hnew=0,pnew=0,hpaid=0,ppaid=0,hbal=0,pbal=0;
  created.forEach(x=>{if(x.jenis==='Hutang')hnew+=Number(x.nominal_awal||0);else if(x.jenis==='Piutang')pnew+=Number(x.nominal_awal||0);});
  paymentsInMonth.forEach(p=>{
    const rec=(debtRecords||[]).find(x=>Number(x.id)===Number(p.hutang_piutang_id));
    if(rec?.jenis==='Hutang')hpaid+=Number(p.nominal||0);
    if(rec?.jenis==='Piutang')ppaid+=Number(p.nominal||0);
  });
  const activeToMonth=(debtRecords||[]).filter(x=>String(x.tanggal||'')<next);
  activeToMonth.forEach(x=>{
    const paid=(debtPayments||[]).filter(p=>Number(p.hutang_piutang_id)===Number(x.id) && String(p.tanggal||'')<next)
      .reduce((a,p)=>a+Number(p.nominal||0),0);
    const sisa=Math.max(0,Number(x.nominal_awal||0)-paid);
    if(x.jenis==='Hutang')hbal+=sisa;
    if(x.jenis==='Piutang')pbal+=sisa;
  });
  return {hnew,pnew,hpaid,ppaid,hbal,pbal};
}
function renderDebtConnection(m){
  const card=$('debtConnectionCard'); if(!card)return;
  const s=debtMonthStats(m);
  $('debtConnectionTitle').textContent=label(m);
  $('debtNew').textContent=money(s.hnew);
  $('debtPaid').textContent=money(s.hpaid);
  $('debtBalance').textContent=money(s.hbal);
  $('receivableNew').textContent=money(s.pnew);
  $('receivablePaid').textContent=money(s.ppaid);
  $('receivableBalance').textContent=money(s.pbal);
}

function render(){

  updateChannelUI();
  renderCards();

  renderMonthly();
  renderNewOnlineMonthly();
  renderOnlineFinalSummary();
  renderTransactionRecap();

  viewOnlineMonth($('month').value);

}


/* =====================================================
   REKAP SEMUA TRANSAKSI
===================================================== */

function trxSourceLabel(x, kind){
  const s=String(x?.source||'').trim();
  const map={
    manual:'Transaksi Baru',
    online_pencairan:'Penerimaan Uang Online',
    online_standard_finance:'Data Lama Online • Keuangan',
    seller_center:'Data Lama Online • Produk Keluar',
    online_batch:'Transaksi Online Baru • Produk Keluar',
    online_standard_product:'Data Lama Online • Produk Keluar'
  };
  if(map[s])return map[s];
  if(kind==='expense')return 'Pengeluaran Utama';
  if(kind==='old')return 'Data Lama Offline';
  return s||'Transaksi';
}

function renderHistoricalExpenseAggregate(){
  const card=document.getElementById('historicalExpenseAggregateCard');
  const countEl=document.getElementById('historicalExpenseCount');
  const totalEl=document.getElementById('historicalExpenseTotal');
  const body=document.getElementById('historicalExpenseRows');
  if(!card||!countEl||!totalEl||!body)return;

  const rows=(expenses||[]).filter(x=>{
    const p=String(x.periode||'').trim();
    return /^20\\d{2}-\\d{2}\\s+s\\/d\\s+20\\d{2}-\\d{2}$/i.test(p) &&
      isCashExpense(x) &&
      Number(x.nominal||0)>0;
  }).sort((a,b)=>Number(b.nominal||0)-Number(a.nominal||0));

  const total=rows.reduce((a,x)=>a+Number(x.nominal||0),0);
  countEl.textContent=rows.length.toLocaleString('id-ID');
  totalEl.textContent=money(total);

  body.innerHTML=rows.length ? rows.map(x=>
    '<tr>'+
      '<td>'+FF.esc(x.periode||'-')+'</td>'+
      '<td>'+FF.esc(x.kategori||'-')+'</td>'+
      '<td>'+FF.esc(x.keterangan||'-')+'</td>'+
      '<td>'+FF.esc(x.cara_bayar||'Tunai')+'</td>'+
      '<td><b>'+money(x.nominal)+'</b></td>'+
    '</tr>'
  ).join('') : '<tr><td colspan="5" class="empty">Tidak ada data periode gabungan.</td></tr>';
}

function buildTransactionRecapRows(){
  const rows=[];

  (olds||[]).forEach((x,i)=>{
    const m=String(x.periode||'').slice(0,7);
    if(!FF.isMonth(m))return;
    const qty=Math.round(Number(x.qty||0));
    const nominal=Math.round(Number(x.nominal ?? x.omzet ?? x.total ?? 0));
    if(nominal<=0 && qty<=0)return;
    rows.push({
      key:'old-'+(x.id??i),period:m,date:m,channel:'Offline',type:'Pemasukan',
      source:'Data Lama Offline',
      detail:[x.konsumen,x.produk].filter(Boolean).join(' • ')||'Data lama offline',
      qty,nominal
    });
  });

  // Transaksi Offline baru: beberapa produk yang dibeli customer disimpan
  // sebagai beberapa baris penjualan dengan order_id yang sama.
  // Rekap menyatukannya menjadi SATU transaksi agar tidak double count.
  const groupedOffline=new Map();
  (sales||[]).forEach((x,i)=>{
    const m=monthOfSaleRow(x);
    if(!FF.isMonth(m))return;
    const src=String(x.source||'').trim();
    const channel=String(x.channel||'Offline')==='Online'?'Online':'Offline';
    const isHpp=['seller_center','online_batch','online_standard_product'].includes(src);
    const isOnlineFinance=['online_standard_finance','online_pencairan'].includes(src);
    const type=isHpp?'Modal/HPP':'Pemasukan';
    let nominal=0;
    if(isHpp){
      const raw=(x.modal_hpp!=null?x.modal_hpp:(x.hpp!=null?x.hpp:(Number(x.qty||0)*Number(x.hpp||0))));
      nominal=Math.round(Number(raw)||0);
    }else if(isOnlineFinance){
      nominal=Math.round(Number(x.uang_bersih ?? x.omzet_produk ?? x.total ?? 0));
    }else{
      nominal=Math.round(Number(x.omzet_produk ?? x.total ?? (Number(x.qty||0)*Number(x.harga||0) ?? 0)));
    }
    const qty=Math.round(Number(x.qty||0));
    if(nominal<=0 && qty<=0)return;

    if(channel==='Offline' && src==='manual' && String(x.order_id||'').trim()){
      const oid=String(x.order_id).trim();
      if(!groupedOffline.has(oid)){
        groupedOffline.set(oid,{
          key:'offline-order-'+oid,period:m,date:String(x.tanggal||m),
          channel:'Offline',type:'Pemasukan',source:'Transaksi Offline Baru',
          details:[],qty:0,nominal:0
        });
      }
      const g=groupedOffline.get(oid);
      g.qty+=qty;
      g.nominal+=nominal;
      const product=String(x.product_name||x.variation||'Produk').trim();
      if(product&&!g.details.includes(product))g.details.push(product);
      return;
    }

    const product=String(x.product_name||'').trim();
    const variation=String(x.variation||'').trim();
    let detail=product||variation||src||'Transaksi';
    if(product&&variation&&variation!=='Uang Bersih')detail+=' • '+variation;

    rows.push({
      key:'sale-'+(x.id??i),period:m,date:String(x.tanggal||m),
      channel,type,source:trxSourceLabel(x,'sale'),detail,qty,nominal
    });
  });

  groupedOffline.forEach(g=>{
    rows.push({
      key:g.key,period:g.period,date:g.date,channel:g.channel,type:g.type,
      source:g.source,
      detail:(g.details.length?g.details.slice(0,5).join(' + '):'Transaksi Offline')+
        (g.details.length>5?' + '+(g.details.length-5)+' produk lain':''),
      qty:g.qty,nominal:Math.round(g.nominal)
    });
  });

  const itemMap=new Map();
  (expenseItems||[]).forEach(it=>{
    const key=String(it.pengeluaran_id);
    if(!itemMap.has(key))itemMap.set(key,[]);
    itemMap.get(key).push(it);
  });

  (expenses||[]).forEach((x,i)=>{
    const m=String(x.periode||'').slice(0,7);
    if(!FF.isMonth(m) || !isCashExpense(x))return;
    const nominal=Math.round(Number(x.nominal||0));
    if(nominal<=0)return;
    const items=itemMap.get(String(x.id))||[];
    const itemSummary=items.length
      ? ' • '+items.slice(0,4).map(it=>String(it.nama_item||'Item')).join(', ')+(items.length>4?' …':'')
      : '';
    rows.push({
      key:'exp-'+(x.id??i),period:m,date:String(x.tanggal||x.periode||m),
      channel:'Offline',type:'Pengeluaran',source:'Pengeluaran Utama',
      detail:[x.kategori,x.keterangan].filter(Boolean).join(' • ')+itemSummary||'Pengeluaran',
      qty:0,nominal
    });
  });

  return rows;
}
function renderTransactionRecap(){
  const monthEl=document.getElementById('trxMonth');
  const channelEl=document.getElementById('trxChannel');
  const typeEl=document.getElementById('trxType');
  const body=document.getElementById('transactionRecapRows');
  if(!monthEl||!channelEl||!typeEl||!body)return;

  const ms=months().sort().reverse();
  const selected=monthEl.value;
  monthEl.innerHTML='<option value="Semua">Semua Bulan</option>'+ms.map(m=>'<option value="'+m+'">'+FF.esc(label(m))+'</option>').join('');
  if(selected && (selected==='Semua'||ms.includes(selected)))monthEl.value=selected;
  else monthEl.value=ms[0]||'Semua';

  const month=monthEl.value;
  const channel=channelEl.value;
  const type=typeEl.value;
  const rows=buildTransactionRecapRows()
    .filter(x=>(month==='Semua'||x.period===month)&&(channel==='Semua'||x.channel===channel)&&(type==='Semua'||x.type===type))
    .sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(a.channel).localeCompare(String(b.channel))||String(a.type).localeCompare(String(b.type))||String(a.detail).localeCompare(String(b.detail)));

  const income=rows.filter(x=>x.type==='Pemasukan').reduce((a,x)=>a+x.nominal,0);
  const expense=rows.filter(x=>x.type==='Pengeluaran').reduce((a,x)=>a+x.nominal,0);
  const hpp=rows.filter(x=>x.type==='Modal/HPP').reduce((a,x)=>a+x.nominal,0);
  const net=income-expense;

  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=money(v);};
  set('trxIncome',income);set('trxExpense',expense);set('trxHpp',hpp);set('trxNet',net);

  const badge=document.getElementById('transactionRecapCount');
  if(badge)badge.textContent=rows.length.toLocaleString('id-ID')+' transaksi';

  if(!rows.length){
    body.innerHTML='<tr><td colspan="7" class="empty">Tidak ada transaksi sesuai filter.</td></tr>';
    return;
  }

  body.innerHTML=rows.map(x=>{
    const isNeg=x.type==='Pengeluaran';
    const isHpp=x.type==='Modal/HPP';
    const c=isNeg?'#b42318':(isHpp?'#7a5c00':'#087443');
    return '<tr>'+
      '<td><b>'+FF.esc(x.date||x.period)+'</b><div class="hint">'+FF.esc(label(x.period))+'</div></td>'+
      '<td>'+FF.esc(x.channel)+'</td>'+
      '<td><b style="color:'+c+'">'+FF.esc(x.type)+'</b></td>'+
      '<td>'+FF.esc(x.source)+'</td>'+
      '<td>'+FF.esc(x.detail)+'</td>'+
      '<td>'+((Number(x.qty)||0)>0?Number(x.qty).toLocaleString('id-ID'):'—')+'</td>'+
      '<td><b style="color:'+c+'">'+money(x.nominal)+'</b></td>'+
      '</tr>';
  }).join('');
}

function bindTransactionRecap(){
  const monthEl=document.getElementById('trxMonth');
  const channelEl=document.getElementById('trxChannel');
  const typeEl=document.getElementById('trxType');
  const reload=document.getElementById('trxReload');
  if(monthEl)monthEl.onchange=renderTransactionRecap;
  if(channelEl)channelEl.onchange=renderTransactionRecap;
  if(typeEl)typeEl.onchange=renderTransactionRecap;
  if(reload)reload.onclick=async()=>{await init();renderTransactionRecap();};
}

/* =====================================================
   EVENT + STARTUP
===================================================== */

function showRuntimeError(e){
  console.error('Rekap runtime error:',e);
  const msg = e?.message || String(e || 'Kesalahan tidak diketahui');
  const box=document.getElementById('onlineConnectionBody');
  if(box){
    box.innerHTML='<div class="notice" style="background:#fff4f2;border-color:#f3c2bc;color:#9f1239"><b>Rekap gagal dijalankan.</b><br>'+FF.esc(msg)+'</div>';
  }
  const tb=document.getElementById('monthly');
  if(tb){
    tb.innerHTML='<tr><td colspan="6" class="empty error"><b>Gagal menjalankan Rekap:</b><br>'+FF.esc(msg)+'</td></tr>';
  }
}

async function bootRekap(){
  try{
    $('month').onchange = render;
    $('channel').onchange = render;
    $('reload').onclick = init;
    const monthEl = $('month');
    const channelEl = $('channel');
    const reloadEl = $('reload');

    if(monthEl) monthEl.onchange = render;
    if(channelEl) channelEl.onchange = render;
    if(reloadEl) reloadEl.onclick = init;

    await init();
  }catch(e){
    showRuntimeError(e);
  }
}

window.addEventListener('error',e=>{
  if(e?.error) showRuntimeError(e.error);
});

window.addEventListener('unhandledrejection',e=>{
  showRuntimeError(e?.reason || 'Promise gagal');
});


/* =====================================================
   INIT
===================================================== */

async function init(){

  $('monthly').innerHTML = `
    <tr>
      <td colspan="6" class="empty">Memuat data Rekap...</td>
    </tr>
  `;

  const jobs = [
    ['penjualan', 'sales'],
    ['data_lama', 'olds'],
    ['pengeluaran', 'expenses'],
    ['pengeluaran_item', 'expenseItems'],
    ['produk', 'products'],
    ['hpp', 'hpps'],
    ['ff_pembelian', 'purchases'],
    ['ff_retur_penjualan', 'returns'],
    ['ff_hutang_piutang', 'debtRecords'],
    ['ff_hutang_piutang_bayar', 'debtPayments']
  ];

  const results = await Promise.all(
    jobs.map(async ([table,key]) => {
      try{
        return {key, rows:await fetchAllSafe(table)};
      }catch(e){
        console.error('Gagal membaca '+table,e);
        return {key, rows:[], error:e.message};
      }
    })
  );

  for(const r of results){
    if(r.key==='sales') sales=r.rows;
    if(r.key==='olds') olds=r.rows;
    if(r.key==='expenses') expenses=r.rows;
    if(r.key==='expenseItems') expenseItems=r.rows;
    if(r.key==='products') products=r.rows;
    if(r.key==='hpps') hpps=r.rows;
    if(r.key==='purchases') purchases=r.rows;
    if(r.key==='returns') returns=r.rows;
    if(r.key==='debtRecords') debtRecords=r.rows;
    if(r.key==='debtPayments') debtPayments=r.rows;
  }

  if(!['Offline','Online'].includes($('channel').value)){
    $('channel').value='Online';
  }

  renderMonthOptions();
  bindTransactionRecap();
  render();
  renderHistoricalExpenseAggregate();

  const failed=results.filter(x=>x.error);
  if(failed.length){
    $('noticeText').innerHTML += '<br><b style="color:#b42318">Catatan:</b> beberapa data belum terbaca: '+failed.map(x=>FF.esc(x.key)).join(', ')+'. Klik <b>↻ Muat Ulang</b> untuk mencoba lagi.';
  }

}


/* =====================================================
   START
===================================================== */

bootRekap();
