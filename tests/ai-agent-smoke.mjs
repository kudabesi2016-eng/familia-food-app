const {readFile}=await import('node:fs/promises');
const ai=await readFile('ai-agent.html','utf8');
const fn=await readFile('supabase/functions/familia-ai/index.ts','utf8');
if(!ai.includes('Agen AI Familia Food')) throw new Error('AI page missing');
if(!ai.includes('Tanya Agen AI')) throw new Error('AI form missing');
if(!fn.includes('OPENAI_API_KEY')) throw new Error('AI server secret missing');
if(fn.includes('SUPABASE_SERVICE_ROLE_KEY')) throw new Error('AI function must not expose service role by default');
console.log('AI_AGENT_STRUCTURE_PASS');
