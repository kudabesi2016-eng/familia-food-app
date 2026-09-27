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
    "source:'manual'","Jumlah Terjual (Bungkus)","refreshOfflineHistory","renderOfflineHistoryMonth","renderOfflineHistoryDate","refreshOnlineBatchHistory","renderOnlineBatchHistoryMonth","renderOnlineBatchHistoryDate","onlineBatchHistoryMonthRows","offlineHistoryViewBtn","offlineExpenseSave","offlineExpenseNominal","pengeluaran","Bulan → Tanggal → Detail","Pemasukan</b> dan <b>Pengeluaran</b>"
  ],
  'rekap.js': [
    'online_pencairan','online_batch','purchases','returns',
    'Profit transaksi baru =','Uang Bersih'
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

const produk=await read('produk.html');
assert(produk.includes('toggleStatusProduk'),'Produk must use status toggle instead of hard delete');
assert(produk.includes('Arsipkan'),'Produk archive action missing');
assert(produk.includes('Data produk, HPP, resep, penjualan, dan histori tetap dipertahankan'),'Product archive warning missing');
assert(!/\.from\(["']hpp["']\)\s*\.delete\(/.test(produk),'Produk must not hard-delete HPP records');
assert(!/\.from\(["']produk["']\)\s*\.delete\(/.test(produk),'Produk must not hard-delete product records');

const resep=await read('resep.html');
assert(resep.includes('status-aktif'),'Resep status support missing');
assert(resep.includes('toggleStatusResep'),'Resep must archive/activate instead of hard delete');
assert(resep.includes('data-action="toggle-resip"'),'Resep archive action marker missing');
assert(!/\.from\(["']resep["']\)\s*\.delete\(/.test(resep),'Resep must not hard-delete recipe rows');

const operational=await read('operasional.html');
const hppArchive=await read('hpp.html');
assert(hppArchive.includes('.eq("status","Aktif")'),'HPP must ignore archived recipe rows');
assert(hppArchive.includes("status || 'aktif'"),'HPP must ignore archived products');
const debt=await read('hutang-piutang.html');
assert(!debt.includes('await reconcileDebtFromExpenses();'),'Hutang page must not write/reconcile automatically on load');
assert(debt.includes('android-shell.css'),'Hutang page missing Android shell css');
assert(debt.includes('android-shell.js'),'Hutang page missing Android shell js');

assert(operational.includes("cara_bayar:'Tunai'"),'Operational new expenses must always be cash');
assert(!operational.includes("payMethod==='Hutang'"),'Operational new expense flow must not create Hutang');
assert(operational.includes('Pencatatan <b>Hutang/Piutang</b> dilakukan hanya di menu Hutang &amp; Piutang'),'Operational debt separation notice missing');

const operationalSafety=operational;
const settings=await read('app-settings.js');
assert(settings.includes("from('pengaturan')"),'Global settings must read branding from Supabase');
assert(settings.includes('FF_SETTINGS'),'Global settings runtime state missing');

const aiSafety=await read('ai-agent.html');
assert(aiSafety.includes("mutableSale(row)"),'AI sale mutation guard missing');
assert(aiSafety.includes("mutableExpense(row)"),'AI expense mutation guard missing');
assert(aiSafety.includes("pengeluaran_item"),'AI expense detail integration missing');
assert(aiSafety.includes("cara_bayar||'Tunai')!=='Hutang'"),'AI local finance must exclude opening Hutang');
assert((aiSafety.match(/function resolveProduct\(q\)\{/g)||[]).length===1,'AI must have exactly one product resolver');

assert(operationalSafety.includes('toggleSupplierStatus'),'Supplier must archive/activate instead of hard delete');
assert(operationalSafety.includes('toggleCustomerStatus'),'Customer must archive/activate instead of hard delete');
assert(!/\.from\(["']ff_supplier["']\)\s*\.delete\(/.test(operationalSafety),'Supplier must not hard-delete master records');
assert(!/\.from\(["']ff_pelanggan["']\)\s*\.delete\(/.test(operationalSafety),'Customer must not hard-delete master records');
assert(operationalSafety.includes('cancelPurchase'),'Purchase history must be cancelled, not deleted');
assert(operationalSafety.includes("status:'Aktif'"),'New purchases must have active status');

const bahan=await read('bahan-baku.html');
assert(bahan.includes('toggleStatusBahan'),'Bahan Baku must use status toggle instead of hard delete');
assert(bahan.includes('Arsipkan'),'Bahan Baku archive action missing');
assert(!/\.from\(["']bahan_baku["']\)\s*\.delete\(/.test(bahan),'Bahan Baku must not hard-delete material records');

const rekapPage=await read('rekap.html');
assert(rekapPage.includes("function offlineHpp(m)"),'Rekap page must calculate offline HPP');
assert(rekapPage.includes("const profit=h.known?v[2]-h.total:null"),'Rekap page profit must equal Uang Bersih minus HPP');
assert(rekapPage.includes("Profit = Uang Bersih − HPP/modal"),'Rekap page formula notice missing');
const rekapModule=await read('rekap.js');
assert(rekapModule.includes('function offlineHpp(m)'), 'Rekap module offline HPP helper missing');
assert(rekapModule.includes('const profit=h.known ? v[2]-h.total : null') || rekapModule.includes('const profit = modal !== null ? v[2] - modal : null'),'Rekap module profit formula must subtract HPP');

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
assert(shellJs.includes("ai-agent.html"),'Android drawer must include Agen AI');
const ai=await read('ai-agent.html');
assert(ai.includes('href="index.html" aria-label="Kembali ke Beranda"') || ai.includes('href="index.html" class="btn"'),'Agen AI must provide a direct Beranda link');
assert(ai.includes('Agen AI terhubung ke aplikasi'),'Agen AI health status UI missing');
assert(shellJs.includes("const fallbackLinks="),'Android shell must have a fallback navigation when a page has no sidebar');
assert(shellJs.includes("['index.html','🏠 Beranda']"),'Android fallback navigation must include Beranda');
assert(shellJs.includes('class="ff-mobile-home"') || shellJs.includes('ff-mobile-home'),'Android topbar must expose a direct Home button');
assert(shellJs.includes("document.addEventListener('DOMContentLoaded',boot,{once:true})"),'Android shell DOM boot hook missing');
assert(shellJs.includes('prepareMobileTables'),'Android shell must prepare tables for mobile cards');
assert(shellJs.includes('MutationObserver'),'Android shell must re-process dynamically rendered table rows');
assert(shellCss.includes('table.ff-mobile-table td::before'),'Mobile table labels must be visible without horizontal scrolling');
assert(shellCss.includes('flex-wrap:wrap!important'),'Mobile tabs must wrap instead of horizontal scrolling');
assert(shellCss.includes('overflow:visible!important'),'Mobile table containers must not require horizontal scrolling');
assert(shellCss.includes('grid-template-columns:repeat(2,minmax(0,1fr))!important'),'Professional mobile dashboard must use compact 2-column KPI cards');
assert(shellCss.includes('PROFESSIONAL MOBILE POS V2'),'Professional mobile POS shell marker missing');

const dashboard=await read('index.html');
assert(dashboard.includes('const ONLINE_LOCKED_TOTAL=8085;'),'Locked online quantity 8,085 missing');
assert(dashboard.includes('const onNewFee=0;'),'New-online fee must remain zero because input is already net');
assert(dashboard.includes('const onNewProfit=onNewNet-onNewHpp;'),'New-online profit formula regression');

const hpp=await read('hpp.html');
assert(hpp.includes('function hitungHppReal('),'HPP calculator must calculate HPP from actual modal and production quantity');
assert(hpp.includes('id="biayaProduksi"'),'HPP calculator must accept actual production overhead');
assert(hpp.includes('hpp_unit: hppOfflinePack'),'Master HPP must be saved from calculator result');
for(const forbiddenHpp of [
  'HPP_FIXED_OFFLINE_BUNGKUS',
  'HPP_FIXED_ONLINE_BUNGKUS',
  'HPP_NAGET_OFFLINE_PER_PCS',
  'HPP_NAGET_ONLINE_PACKING',
  'NAGET_SIZE_PRICES'
]){
  assert(!hpp.includes(forbiddenHpp),'HPP calculator must not hardcode HPP/price: '+forbiddenHpp);
}

const sql=await read('SUPABASE-EXPANSION.sql');
assert(sql.includes('ff_penjualan_pelanggan'),'Customer↔sale mapping table missing from expansion SQL');
const forbidden = ['stok','mutasi_stok','multi_outlet','user_role','pembayaran'];
for(const f of forbidden){
  assert(!new RegExp('create\\s+table[^;]*'+f,'i').test(sql),'Expansion SQL unexpectedly creates forbidden feature: '+f);
}

console.log('FAMILIA_SMOKE_PASS');
