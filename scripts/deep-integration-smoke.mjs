import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const htmlFiles=fs.readdirSync(root).filter(f=>f.endsWith('.html'));
const requiredPages=['index.html','produk.html','bahan-baku.html','resep.html','hpp.html','penjualan.html','operasional.html','rekap.html','data-lama.html','pengaturan.html','ai-agent.html'];
const requiredTables=['produk','bahan_baku','resep','hpp','penjualan','data_lama','pengeluaran','pengaturan'];

function fail(message){ console.error('❌ '+message); process.exitCode=1; }
function read(file){ return fs.readFileSync(path.join(root,file),'utf8'); }

for(const file of requiredPages){
  if(!fs.existsSync(path.join(root,file))) fail('Missing required page: '+file);
}

for(const file of htmlFiles){
  const text=read(file);
  const links=[...text.matchAll(/href=["']([^"'#]+)["']/gi)].map(m=>m[1]).filter(x=>x.endsWith('.html'));
  for(const link of links){
    const target=path.join(root,link);
    if(!fs.existsSync(target)) fail(file+' references missing page: '+link);
  }
  const scripts=[...text.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)];
  for(const [,attrs,body] of scripts){
    if(!body.trim() || /src\s*=/.test(attrs)) continue;
    try{ new Function(body); }
    catch(e){ fail('Inline script syntax error in '+file+': '+e.message); }
  }
}

const ai=read('ai-agent.html');
if(!/href=["']index\.html["'][^>]*>[^<]*🏠\s*Beranda/i.test(ai) && !/href=["']index\.html["'][^>]*aria-label=["'][^"']*Beranda/i.test(ai)){
  fail('Agen AI must provide a direct Beranda link');
}
for(const table of requiredTables){
  if(!ai.includes("'"+table+"'") && !ai.includes('"'+table+'"')) fail('Agen AI missing Supabase table reference: '+table);
}

const core=read('ff-core.js');
if(!core.includes("online_standard_finance")) fail('Shared reporting core must recognize online_standard_finance historical source');

const supa=read('supabase.js');
if(!/SUPABASE_URL\s*=\s*["']https:\/\/[^"']+\.supabase\.co["']/.test(supa)) fail('Supabase URL is missing/invalid');
if(!/SUPABASE_KEY\s*=\s*["'][^"']+["']/.test(supa)) fail('Supabase publishable key is missing');

for(const table of requiredTables){
  const found=htmlFiles.some(file=>read(file).includes("from('"+table+"')") || read(file).includes('from("'+table+'")'));
  if(!found) fail('No page queries Supabase table: '+table);
}

if(process.exitCode) process.exit(1);
console.log('✅ Deep integration smoke test passed: pages, internal links, inline JS syntax, Agen AI Beranda link, and required Supabase references are intact.');
