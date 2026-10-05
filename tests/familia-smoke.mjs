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
    "source:'manual'","Jumlah Terjual (Bungkus)","refreshOfflineHistory","renderOfflineHistoryMonth","renderOfflineHistoryDate","refreshOnlineBatchHistory","renderOnlineBatchHistoryMonth","renderOnlineBatchHistoryDate","onlineBatchHistoryMonthRows","offlineHistoryViewBtn","offlineExpenseSave","offlineExpenseNominal","pengeluaran","Bulan → Tanggal → Detail","Pemasukan","Pengeluaran"
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

const core=await read('ff-core.js');
assert(core.includes('const ONLINE_ONLY_PRODUCTS = new Set(['),'Locked Online-only product mapping missing in shared core.');
assert(core.includes('const OFFLINE_LOCKED_MONTHLY = Object.freeze(['),'Shared Offline locked monthly snapshot missing.');
assert(core.includes('function offlineLockedFinance(month, add)'),'Shared Offline finance calculator missing.');
assert(core.includes('const ONLINE_LOCKED_HISTORY = Object.freeze('),'Shared Online historical size basis missing.');
assert(core.includes('const ONLINE_LOCKED_TOTAL = 8085'),'Shared Online locked total missing.');
assert(core.includes('const ONLINE_OTHER_COST_LOCKED = 35293500'),'Shared Online other cost missing.');
assert(rekap.includes('FFCore.ONLINE_OTHER_COST_LOCKED'),'Rekap must consume shared Online other cost.');


assert(core.includes("'naget 20'"),'Naget 20 must be in Online-only mapping.');
assert(core.includes("'naget 25+saus'"),'Naget 25+Saus must be in Online-only mapping.');
assert(core.includes("v === 'dropship'"),'Dropship must be mapped to Online.');
assert(core.includes('const channelMapped = isOfflineProduct(r.product_name);'),'Offline HPP must respect channel mapping for Data Lama.');
assert(!core.includes("['cireng crispy','Cireng biasa']"),'Shared core must not silently merge Cireng crispy into Cireng biasa');

const rekap=await read('rekap.js');
assert(count(rekap,'function data(){')===0,'Duplicate legacy function data() found in rekap.js');
assert(count(rekap,'const data = () =>')===1,'Expected one rekap data() helper');
assert(rekap.includes("newCash"),'Rekap new-online cash source missing');
assert(rekap.includes("newModal"),'Rekap new-online modal calculation missing');
assert(rekap.includes('purchases,\n  returns'),'Rekap data helper must pass purchases and returns into shared data context');
assert(rekap.includes('FFCore.offlineLockedFinance(m,add)'),'Rekap monthly cards must use shared Offline finance calculator.');


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
assert(hppArchive.includes('statustext || p.status || "aktif"'),'HPP must ignore archived products');
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
const hppAiSafety=await read('hpp.html');
assert(hppAiSafety.includes('AI Agent • Kalkulator HPP'),'AI Agent must be embedded in Kalkulator HPP');
assert(hppAiSafety.includes('Pengeluaran kategori Bahan Baku'),'HPP AI material-expense source missing');
assert(hppAiSafety.includes('ensureHppAiSession') || hppAiSafety.includes('signInAnonymously'),'HPP AI must establish anonymous Supabase session');
assert(hppAiSafety.includes('hppAiThreshold'),'HPP AI price-change threshold missing');
assert(hppAiSafety.includes('Konfirmasi simpan HPP'),'HPP AI confirmation flow missing');

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
assert(rekapPage.includes("const profit=h.measured?(offline?v[0]-h.total-v[3]:v[2]-h.total):null"),'Rekap page must separate HPP-included and non-HPP expenses');
assert(!rekapPage.includes("Pengeluaran tidak dipotong lagi ke Profit agar HPP dan pengeluaran tidak tercampur"),'Rekap page must not claim all expenses are excluded from profit');
assert(rekapPage.includes("Profit Terukur Offline = Pemasukan − HPP − Beban di luar HPP"),'Rekap page must describe measured Offline Profit');
const rekapModule=await read('rekap.js');
assert(rekapModule.includes('function offlineHpp(m)'), 'Rekap module offline HPP helper missing');
assert(/const profit=h\.measured\s*\?\s*v\[0\]-h\.total-v\[3\]\s*:\s*null/.test(rekapModule),'Rekap module must calculate measured profit after HPP-included expense treatment');
assert(!rekapModule.includes("key==='cireng crispy'"),'Rekap must not silently merge Cireng crispy into Cireng biasa');
assert(rekapModule.includes("String(x.status||'Aktif').toLowerCase()==='aktif'"),'Rekap purchase KPI must ignore cancelled purchases');
assert(rekapModule.includes('partial:!known && total>0'),'Rekap must expose partial HPP state');
assert(rekapModule.includes("expenseInHpp=expenseRows.filter(x=>String(x.kategori||'').trim().toLowerCase()==='bahan baku')"),'Rekap must separate HPP-included expenses from other cash expenses');


const penjualan=await read('penjualan.html');
assert(!penjualan.includes("supabaseClient.from('produk').select('id,nama_produk,hpp_offline"),'Forbidden hpp_offline select regression found in penjualan.html');
assert(penjualan.includes("await loadCustomerMaster();"),'Customer master is not loaded at POS startup');
assert(penjualan.includes('ffCustomerList'),'POS customer datalist missing');
assert(penjualan.includes('customerLinksReady'),'POS customer links must be database-backed');
assert(!penjualan.includes('ff_sale_customers_v1'),'POS must not keep sale↔customer mapping only in localStorage');
assert(/supabaseClient\.from\(['"]penjualan['"]\)\.update\(oldSale\.data\)/.test(penjualan),'Editing a sale must rollback when customer mapping fails');

const oldData=await read('data-lama.html');
assert(oldData.includes('loadSaleCustomers'),'Historical data page must read persistent customer↔sale mapping');
const index=await read('index.html');
assert(index.includes('const validExpenseRows='),'Dashboard expense validation missing');
assert(index.indexOf('const validExpenseRows=') < index.indexOf('const opExpense='),'Dashboard operational expense order is invalid');
assert(index.includes("const offExpenseInHpp=validExpenseRows.filter(x=>String(x.kategori||'').trim().toLowerCase()==='bahan baku').reduce((s,x)=>s+Math.round(num(x.nominal)),0);"),'Dashboard must identify HPP-included cash expenses');
assert(index.includes("const offProfit=offHppMeasured ? offNet+offExpenseInHpp-offHpp : null;"),'Dashboard offline profit must remove HPP-included expense once, not double-count it');
assert(/const totalProfit=/.test(index) && /dashboardOffProfit/.test(index) && /onProfit/.test(index) && /dashboardOffProfit\)\+Number\(onProfit\)/.test(index),'Dashboard combined profit must combine measured channel profits');
assert(index.includes('const totalNet=totalRevenue-totalOut;'),'Dashboard Uang Bersih harus dihitung dari Pemasukan − seluruh Pengeluaran/Potongan.');
assert(/const onNet=onNetBeforeOther;/.test(index) && /const onProfit=onContributionProfit-onOtherCost;/.test(index),'Dashboard Online must keep Uang Bersih after platform deductions separate and subtract Biaya Online Lainnya only in Profit Final.');
assert(index.includes('Uang Bersih (setelah Semua Pengeluaran)'),'Dashboard Uang Bersih label must state that all expenses are included.');
assert(index.includes('Bahan Baku tidak dipotong lagi karena sudah termasuk HPP'),'Dashboard must explain HPP expense is not double-counted');
assert(index.includes('&& String(x.status||\'Aktif\').toLowerCase()===\'aktif\''),'Dashboard purchase KPI must ignore cancelled purchases');


assert(operational.includes("update({harga_beli:price})"),'Purchase does not sync latest raw-material price');
assert(operational.includes("ff_pembelian_item"),'Purchase item table integration missing');
assert(operational.includes("ff_retur_penjualan"),'Return table integration missing');
assert(operational.includes('refreshMaterialLastPrices'),'Deleting a purchase must re-synchronize latest material price');
assert(operational.includes('Pembelian dibatalkan karena harga bahan'),'Purchase must rollback when material-price synchronization fails');
assert(operational.includes('previousPrices'),'Deleting a purchase must preserve the previous material price for rollback');
assert(operational.includes("update({harga_beli:oldPrice})"),'Deleting a purchase must restore the previous material price when re-sync fails');
assert(operational.includes('Qty retur melebihi qty penjualan'),'Return quantity guard missing');
assert(!operational.includes('localStorage.setItem(LS.'),'Operational business data must not fall back to localStorage writes');
assert(!operational.includes('lsSet('),'Operational module must not use legacy localStorage business-data writer');
const shellCss=await read('android-shell.css');
const shellJs=await read('android-shell.js');
assert(shellCss.includes('body .sidebar{'),'Android shell must provide a safe mobile sidebar fallback');
assert(shellCss.includes('body.ff-android .sidebar{display:none!important}'),'Android shell must hide desktop sidebar when active');
assert(shellCss.includes('.ff-mobile-bottom'),'Android shell bottom navigation missing');
assert(shellJs.includes("['operasional.html','🧾','Operasional']"),'Android quick navigation must include Operasional');
assert(!shellJs.match(/\['ai-agent\.html',/),'Standalone Agen AI must not be a navigation entry');
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

const core=await read('ff-core.js');
assert(core.includes("const ONLINE_HISTORICAL_END = '2026-08';"),'Online historical period must end at August 2026');
assert(core.includes("const ONLINE_NEW_START = '2026-09';"),'Online new transaction period must start at September 2026');
assert(core.includes('isOnlineHistoricalMonth'),'Shared Online historical-period guard missing');
assert(core.includes('isOnlineNewMonth'),'Shared Online new-period guard missing');
const rekap=await read('rekap.js');
assert(rekap.includes("isOnlineNewMonth(m)"),'Rekap must guard new Online cash by the new-transaction period');
assert(rekap.includes("isOnlineHistoricalMonth(monthOfSaleRow(x))"),'Rekap must guard historical Online finance by historical period');
assert(rekap.includes("source||'')==='online_pencairan' && isOnlineNewMonth"),'Rekap must not mix historical finance with new cash');

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

const supabaseConfig=await read('supabase.js');
assert(supabaseConfig.includes('createClient(SUPABASE_URL, SUPABASE_KEY)'),'Supabase client bootstrap missing');
assert(!supabaseConfig.includes('signInAnonymously'),'Loginless app must not require anonymous-auth provider at startup');

const rls=await read('SUPABASE-RLS-AUTH.sql');
for(const table of ['produk','bahan_baku','resep','hpp','penjualan','data_lama','pengeluaran','pengeluaran_item','pengaturan','ff_hutang_piutang','ff_hutang_piutang_bayar']){
  assert(new RegExp('on public\\.'+table+' for all to anon, authenticated','i').test(rls),'Loginless RLS policy missing for '+table);
}

assert(sql.includes('pengeluaran_kategori_master'),'Expense category master table missing from expansion SQL');
assert(sql.includes('pengeluaran_kategori_master_anon_all'),'Expense category master RLS policy missing');
const sql=await read('SUPABASE-EXPANSION.sql');
assert(sql.includes('ff_penjualan_pelanggan'),'Customer↔sale mapping table missing from expansion SQL');
const forbidden = ['stok','mutasi_stok','multi_outlet','user_role','pembayaran'];
for(const f of forbidden){
  assert(!new RegExp('create\\s+table[^;]*'+f,'i').test(sql),'Expansion SQL unexpectedly creates forbidden feature: '+f);
}

console.log('FAMILIA_SMOKE_PASS');
