import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';

const corePages = [
  'index.html','produk.html','bahan-baku.html','resep.html','hpp.html',
  'penjualan.html','rekap.html','data-lama.html','pengaturan.html','operasional.html'
];

const requiredCommon = [
  'index.html','produk.html','bahan-baku.html','resep.html','hpp.html',
  'penjualan.html','rekap.html','data-lama.html','pengaturan.html','operasional.html'
];

const mustContain = {
  'operasional.html': [
    'ff_supplier','ff_pelanggan','ff_pembelian','ff_pembelian_item','ff_retur_penjualan',
    'Pembelian Bahan Baku','Retur Penjualan','Pengeluaran'
  ],
  'penjualan.html': [
    'ffCustomerList','loadCustomerMaster','saveCustomerMaster','saveCustomerLink','ff_penjualan_pelanggan',
    "source:'manual'","Jumlah Terjual (Bungkus)"
  ],
  'rekap.js': [
    'online_pencairan','online_batch','purchases','returns',
    'Profit =','Uang Bersih'
  ],
  'index.html': [
    'opPurchase','opExpense','opReturn','opSupplier',
    'ff_pembelian','ff_retur_penjualan','ff_supplier'
  ],
  'SUPABASE-EXPANSION.sql': [
    'ff_supplier','ff_pelanggan','ff_pembelian','ff_pembelian_item','ff_retur_penjualan','ff_penjualan_pelanggan'
  ]
};

async function read(path){
  return await readFile(path,'utf8');
}
function assert(ok,msg){
  if(!ok) throw new Error(msg);
}
function count(text,needle){
  return text.split(needle).length-1;
}

for(const page of corePages){
  await access(page);
}

for(const page of requiredCommon){
  const c=await read(page);
  assert(c.includes('android-shell.css'), page+' missing android shell css');
  assert(c.includes('android-shell.js'), page+' missing android shell js');
  assert(c.includes('operasional.html'), page+' missing Operasional navigation');
}

for(const [file, needles] of Object.entries(mustContain)){
  const c=await read(file);
  for(const n of needles) assert(c.includes(n), file+' missing required marker: '+n);
}

const rekap=await read('rekap.js');
assert(count(rekap,'function data(){')===0,'Duplicate legacy function data() found in rekap.js');
assert(count(rekap,'const data = () =>')===1,'Expected one rekap data() helper');
assert(rekap.includes("newCash"),'Rekap new-online cash source missing');
assert(rekap.includes("newModal"),'Rekap new-online modal calculation missing');
assert(rekap.includes('purchases,\n  returns'),'Rekap data helper must pass purchases and returns into shared data context');

const penjualan=await read('penjualan.html');
assert(!penjualan.includes("supabaseClient.from('produk').select('id,nama_produk,hpp_offline"),'Forbidden hpp_offline select regression found in penjualan.html');
assert(penjualan.includes("await loadCustomerMaster();"),'Customer master is not loaded at POS startup');
assert(penjualan.includes('ffCustomerList'),'POS customer datalist missing');
assert(penjualan.includes('customerLinksReady'),'POS customer links must be database-backed');
assert(!penjualan.includes('ff_sale_customers_v1'),'POS must not keep sale↔customer mapping only in localStorage');
assert(penjualan.includes('await supabaseClient.from(\'penjualan\').update(oldSale)'), 'Editing a sale must rollback when customer mapping fails');

const oldData=await read('data-lama.html');
assert(oldData.includes('loadSaleCustomers'),'Historical data page must read persistent customer↔sale mapping');
const index=await read('index.html');
assert(index.includes('const validExpenseRows='),'Dashboard expense validation missing');
assert(index.indexOf('const validExpenseRows=') < index.indexOf('const opExpense='),'Dashboard operational expense order is invalid');

const operational=await read('operasional.html');
assert(operational.includes("update({harga_beli:price})"),'Purchase does not sync latest raw-material price');
assert(operational.includes("ff_pembelian_item"),'Purchase item table integration missing');
assert(operational.includes("ff_retur_penjualan"),'Return table integration missing');
assert(operational.includes('refreshMaterialLastPrices'),'Deleting a purchase must re-synchronize latest material price');
assert(operational.includes('Pembelian dibatalkan karena harga bahan'),'Purchase must rollback when material-price synchronization fails');
assert(operational.includes('Harga sebelumnya dipertahankan'),'Deleting a purchase must preserve material price if re-sync fails');
assert(operational.includes('Qty retur melebihi qty penjualan'),'Return quantity guard missing');
assert(!operational.includes('localStorage.setItem(LS.'),'Operational business data must not fall back to localStorage writes');
assert(!operational.includes('lsSet('),'Operational module must not use legacy localStorage business-data writer');
const shellCss=await read('android-shell.css');
const shellJs=await read('android-shell.js');
assert(shellCss.includes('body .sidebar{'),'Android shell must provide a safe mobile sidebar fallback');
assert(shellCss.includes('body.ff-android .sidebar{display:none!important}'),'Android shell must hide desktop sidebar when active');
assert(shellCss.includes('.ff-mobile-bottom'),'Android shell bottom navigation missing');
assert(shellJs.includes("['operasional.html','🧾','Operasional']"),'Android quick navigation must include Operasional');
assert(shellJs.includes("document.addEventListener('DOMContentLoaded',boot,{once:true})"),'Android shell DOM boot hook missing');
assert(shellJs.includes('prepareMobileTables'),'Android shell must prepare tables for mobile cards');
assert(shellJs.includes('MutationObserver'),'Android shell must re-process dynamically rendered table rows');
assert(shellCss.includes('table.ff-mobile-table td::before'),'Mobile table labels must be visible without horizontal scrolling');
assert(shellCss.includes('flex-wrap:wrap!important'),'Mobile tabs must wrap instead of horizontal scrolling');
assert(shellCss.includes('overflow:visible!important'),'Mobile table containers must not require horizontal scrolling');

const dashboard=await read('index.html');
assert(dashboard.includes('const ONLINE_LOCKED_TOTAL=8085;'),'Locked online quantity 8,085 missing');
assert(dashboard.includes('const onNewFee=0;'),'New-online fee must remain zero because input is already net');
assert(dashboard.includes('const onNewProfit=onNewNet-onNewHpp;'),'New-online profit formula regression');

const hpp=await read('hpp.html');
for(const marker of ['HPP_FIXED_OFFLINE_BUNGKUS','"cireng isi": 2900','"cireng biasa": 2425','"cibay": 2900']) {
  assert(hpp.includes(marker),'Locked HPP marker missing: '+marker);
}

const sql=await read('SUPABASE-EXPANSION.sql');
assert(sql.includes('ff_penjualan_pelanggan'),'Customer↔sale mapping table missing from expansion SQL');
const forbidden = ['stok','mutasi_stok','multi_outlet','user_role','pembayaran'];
for(const f of forbidden){
  assert(!new RegExp('create\\s+table[^;]*'+f,'i').test(sql),'Expansion SQL unexpectedly creates forbidden feature: '+f);
}

console.log('FAMILIA_SMOKE_PASS');
