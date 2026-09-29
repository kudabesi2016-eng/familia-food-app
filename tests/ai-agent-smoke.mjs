const {readFile}=await import('node:fs/promises');
const hpp=await readFile('hpp.html','utf8');
const ai=await readFile('ai-agent.html','utf8');
const fn=await readFile('supabase/functions/familia-ai/index.ts','utf8');
const arch=await readFile('AI-AGENT-ARCHITECTURE.md','utf8');

if(!hpp.includes('AI Agent • Kalkulator HPP')) throw new Error('HPP page missing embedded AI Agent');
if(!hpp.includes('signInAnonymously') && !hpp.includes('ensureHppAiSession')) throw new Error('HPP AI session bootstrap missing');
if(!hpp.includes('Authorization')) throw new Error('HPP AI must send Authorization to Edge Function');
if(!hpp.includes('__healthcheck__') && !hpp.includes('familia-ai')) throw new Error('HPP AI endpoint integration missing');
if(!hpp.includes('Pengeluaran kategori Bahan Baku')) throw new Error('HPP AI Bahan Baku expense source missing');
if(!hpp.includes('data_lama')) throw new Error('HPP AI must load Data Lama context');
if(!hpp.includes('Data Lama + Data Baru')) throw new Error('HPP AI must expose combined history context');
if(!hpp.includes('Tidak ada histori')) throw new Error('HPP AI must distinguish missing material history from a price decrease');
if(!hpp.includes('Baris agregat')) throw new Error('HPP AI must avoid double-counting aggregate history periods');

if(!hpp.includes('hppAiThreshold')) throw new Error('HPP AI threshold missing');
if(!hpp.includes('Konfirmasi simpan HPP')) throw new Error('HPP AI confirmation missing');
if(!hpp.includes('Tulis pertanyaan apa saja tentang HPP')) throw new Error('HPP AI must accept natural-language questions');
if(!hpp.includes('Pengguna boleh bertanya dengan bahasa bebas/natural')) throw new Error('Natural-language AI instruction missing');
if(!hpp.includes('master_hpp:productHpp')) throw new Error('Natural-language HPP context must include product names');
if(!hpp.includes('function localNaturalAnswer')) throw new Error('HPP AI local natural-language fallback missing');
if(!hpp.includes('Sumber angka')) throw new Error('HPP AI source-explanation response missing');
if(!hpp.includes('Total biaya bahan')) throw new Error('HPP AI HPP breakdown missing');
if(!hpp.includes('Rumus:')) throw new Error('HPP AI formula explanation missing');

if(!hpp.includes('a==null||b==null||Number(b)===0')) throw new Error('HPP AI change percentage must treat missing history as unknown');


if(!ai.includes('Buka Kalkulator HPP')) throw new Error('Compatibility AI page must point to HPP calculator');
if(!fn.includes('OPENAI_API_KEY')) throw new Error('AI server secret missing');
if(!fn.includes('SUPABASE_PUBLISHABLE_KEYS')) throw new Error('AI data adapter missing Supabase publishable key');
if(!fn.includes('buildSnapshot')) throw new Error('AI business snapshot missing');
if(!fn.includes('const onlineHist=sales.filter')) throw new Error('AI online historical dataset missing');
if(!fn.includes('const onlineSeller=sales.filter')) throw new Error('AI Seller Center dataset missing');
if(!fn.includes('const onlineNew=sales.filter')) throw new Error('AI online batch dataset missing');
if(!fn.includes('const onlineCash=sales.filter')) throw new Error('AI online payout dataset missing');
if(!fn.includes('const offlineRevenue=')) throw new Error('AI offline revenue calculation missing');
if(!fn.includes('online_baru_sudah_net')) throw new Error('Online net rule missing');
if(!fn.includes('8085')) throw new Error('Locked 8,085 online packs rule missing');
if(!fn.includes('lockedSellerTotal') || !fn.includes('lockedSellerAuditOk')) throw new Error('AI locked Seller Center audit missing');
if(!fn.includes('Healthcheck tetap wajib melewati autentikasi Supabase')) throw new Error('AI healthcheck auth rule missing');
if(!fn.includes('Bearer')) throw new Error('AI endpoint auth check missing');
if(/\.from\(['"][^'"]+['"]\)\.(insert|update|upsert|delete)\(/.test(fn)) throw new Error('AI server must remain read-only');
if(fn.includes('SUPABASE_SERVICE_ROLE_KEY')) throw new Error('AI function must not use service role directly');
if(!arch.includes('Kalkulator HPP')) throw new Error('AI architecture must reference HPP calculator');
if(!arch.includes('read-only')) throw new Error('AI architecture read-only rule missing');
console.log('AI_AGENT_STRUCTURE_PASS');
