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
  let stylePos=0;
  while(true){
    const start=text.indexOf('<style',stylePos);
    if(start<0) break;
    const openEnd=text.indexOf('>',start);
    if(openEnd<0){ fail('Unclosed <style> tag in '+file); break; }
    const close=text.indexOf('</style>',openEnd+1);
    if(close<0){ fail('Missing </style> tag in '+file); break; }
    if(text.slice(openEnd+1,close).includes('<style')) fail('Nested <style> block in '+file);
    stylePos=close+8;
  }

  const scripts=[...text.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)];
  for(const [,attrs,body] of scripts){
    if(!body.trim() || /src\s*=/.test(attrs)) continue;
    try{ new Function(body); }
    catch(e){ fail('Inline script syntax error in '+file+': '+e.message); }
  }
}

const ai=read('ai-agent.html');
const hppAi=read('hpp.html');
if(!hppAi.includes('AI Agent • Kalkulator HPP')) fail('Kalkulator HPP must contain the active Agen AI');
if(!ai.includes('Buka Kalkulator HPP')) fail('Agen AI compatibility page must point to Kalkulator HPP');

const dashboard=read('index.html');
if(!dashboard.includes("const overallProfitKnown=true;")) fail('Dashboard must expose measured Profit even when historical HPP is incomplete');
if(!dashboard.includes("const offNet=offRevenue-offExpense;")) fail('Dashboard must calculate Offline Uang Bersih from Pemasukan minus Pengeluaran');
if(!dashboard.includes("const offProfit=offHppKnown ? offNet-offHpp : null;")) fail('Dashboard must calculate Offline Profit from Uang Bersih minus measured HPP');
if(!dashboard.includes('id="offProfit">—')) fail('Dashboard Offline Profit must start unavailable instead of Rp 0');

const rekapHtml=read('rekap.html');
const rekapJs=read('rekap.js');
if(!rekapHtml.includes('rekap.js?v=20260929-1855')) fail('Rekap HTML must load the primary rekap.js module');
if(rekapHtml.includes('statustext')) fail('Rekap HTML must not query missing produk.statustext column');
if(!rekapHtml.includes('__REKAP_JS_READY')) fail('Rekap fallback must wait for primary module readiness');
if(!rekapJs.includes("document.addEventListener('DOMContentLoaded',startRekap")) fail('Rekap JS must start after DOM is ready');

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
