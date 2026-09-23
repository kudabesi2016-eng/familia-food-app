import { readFile } from 'node:fs/promises';

const supabaseJs = await readFile('supabase.js','utf8');
const urlMatch = supabaseJs.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/);
const keyMatch = supabaseJs.match(/SUPABASE_KEY\s*=\s*["']([^"']+)["']/);
if(!urlMatch || !keyMatch) throw new Error('Supabase config not found');
const BASE = urlMatch[1].replace(/\/$/,'');
const KEY = keyMatch[1];

const headers = {
  apikey: KEY,
  Authorization: 'Bearer ' + KEY,
  'Content-Type': 'application/json',
  Prefer: 'return=representation'
};

async function request(path,{method='GET',body}={}) {
  const res = await fetch(BASE + '/rest/v1/' + path,{
    method, headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if(!res.ok) {
    throw new Error(method+' '+path+' -> HTTP '+res.status+' '+text.slice(0,500));
  }
  return data;
}

async function readTable(table){
  await request(table+'?select=*&limit=1');
}

const coreTables = ['produk','bahan_baku','resep','hpp','penjualan','data_lama','pengeluaran'];
const expansionTables = [
  'ff_supplier','ff_pelanggan','ff_pembelian',
  'ff_pembelian_item','ff_retur_penjualan','ff_penjualan_pelanggan'
];

for(const table of coreTables) await readTable(table);
for(const table of expansionTables) await readTable(table);

const suffix = Date.now().toString();
let supplierId = null;
let customerId = null;
let purchaseId = null;
let saleId = null;

try {
  const supplier = await request('ff_supplier',{
    method:'POST',
    body:{nama:'__FF_LIVE_TEST_SUPPLIER_'+suffix,status:'Aktif'}
  });
  supplierId = supplier?.[0]?.id ?? null;
  if(!supplierId) throw new Error('Supplier insert returned no id');

  const customer = await request('ff_pelanggan',{
    method:'POST',
    body:{nama:'__FF_LIVE_TEST_CUSTOMER_'+suffix,status:'Aktif'}
  });
  customerId = customer?.[0]?.id ?? null;
  if(!customerId) throw new Error('Customer insert returned no id');

  const purchases = await request('ff_pembelian',{
    method:'POST',
    body:{
      tanggal:new Date().toISOString().slice(0,10),
      supplier_id:supplierId,
      total:123,
      catatan:'__FF_LIVE_TEST_'+suffix
    }
  });
  purchaseId = purchases?.[0]?.id ?? null;
  if(!purchaseId) throw new Error('Purchase insert returned no id');

  const items = await request('ff_pembelian_item',{
    method:'POST',
    body:{
      pembelian_id:purchaseId,
      nama_bahan:'__FF_LIVE_TEST_MATERIAL_'+suffix,
      qty:1,
      satuan:'uji',
      harga_beli:123,
      subtotal:123
    }
  });
  if(!Array.isArray(items) || !items.length) throw new Error('Purchase item insert returned no row');

  const returns = await request('ff_retur_penjualan',{
    method:'POST',
    body:{
      tanggal:new Date().toISOString().slice(0,10),
      channel:'Offline',
      nama_produk:'__FF_LIVE_TEST_RETURN_'+suffix,
      qty:1,
      nominal:123,
      alasan:'__FF_LIVE_TEST_'+suffix
    }
  });
  if(!Array.isArray(returns) || !returns.length) throw new Error('Return insert returned no row');

  const sales = await request('penjualan?select=id&limit=1');
  saleId = sales?.[0]?.id ?? null;
  if(saleId){
    const links = await request('ff_penjualan_pelanggan',{
      method:'POST',
      body:{penjualan_id:saleId,pelanggan_id:customerId}
    });
    if(!Array.isArray(links) || !links.length) throw new Error('Customer↔sale link insert returned no row');
    await request('ff_penjualan_pelanggan?penjualan_id=eq.'+encodeURIComponent(String(saleId)),{method:'DELETE'});
  }

  const expenses = await request('pengeluaran',{
    method:'POST',
    body:{
      periode:new Date().toISOString().slice(0,7),
      kategori:'__FF_LIVE_TEST__',
      keterangan:'__FF_LIVE_TEST_'+suffix,
      nominal:123
    }
  });
  if(!Array.isArray(expenses) || !expenses.length) throw new Error('Expense insert returned no row');

  const expenseId = expenses[0]?.id;
  if(expenseId == null) throw new Error('Expense insert returned no id');
  await request('pengeluaran?id=eq.'+encodeURIComponent(String(expenseId)),{method:'DELETE'});
  
  console.log('SUPABASE_LIVE_PASS');
  console.log('Core tables reachable:', coreTables.join(', '));
  console.log('Expansion tables reachable:', expansionTables.join(', '));
  console.log('Writes tested: supplier, customer, purchase, purchase item, return, customer-sale mapping'+(saleId?'':' (skipped: no existing sale)'), 'and expense');
} finally {
  if(purchaseId){
    try { await request('ff_pembelian?id=eq.'+encodeURIComponent(String(purchaseId)),{method:'DELETE'}); } catch(e) { console.error('Cleanup purchase failed:',e.message); }
  }
  if(customerId){
    try { await request('ff_pelanggan?id=eq.'+encodeURIComponent(String(customerId)),{method:'DELETE'}); } catch(e) { console.error('Cleanup customer failed:',e.message); }
  }
  if(supplierId){
    try { await request('ff_supplier?id=eq.'+encodeURIComponent(String(supplierId)),{method:'DELETE'}); } catch(e) { console.error('Cleanup supplier failed:',e.message); }
  }
}
