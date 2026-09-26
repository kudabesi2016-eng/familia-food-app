import fs from 'node:fs';

const supa=fs.readFileSync('supabase.js','utf8');
const url=(supa.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)||[])[1];
const key=(supa.match(/SUPABASE_KEY\s*=\s*["']([^"']+)["']/)||[])[1];
if(!url||!key) throw new Error('Supabase configuration missing');

const tables=['produk','bahan_baku','resep','hpp','penjualan','data_lama','pengeluaran','pengaturan'];
for(const table of tables){
  const res=await fetch(url+'/rest/v1/'+table+'?select=*&limit=1',{
    headers:{apikey:key,Authorization:'Bearer '+key}
  });
  if(!res.ok) throw new Error('Supabase '+table+' check failed: HTTP '+res.status+' '+(await res.text()).slice(0,300));
  await res.text();
  console.log('✅ Supabase live check: '+table);
}
console.log('✅ Live Supabase integration test passed for '+tables.length+' required tables.');
