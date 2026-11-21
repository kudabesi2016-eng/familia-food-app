const SUPABASE_URL = "https://zaqdjyhosksbdlafhluc.supabase.co";
const SUPABASE_KEY = "sb_publishable_v9HwG1jpZXKeo2MYrWmGdg_VO4Or8yt";
const FF_OWNER_EMAIL = "kudabesi2016@gmail.com";
const FF_LOGIN_PAGE = /(^|\/)login\.html$/i.test(window.location.pathname);
const FF_API_ORIGIN = new URL(SUPABASE_URL).origin;
let ffSessionReady = null;
let ffRedirectingToLogin = false;
let supabaseClient;

function ffLoginUrl(){
  const login = new URL('login.html', window.location.href);
  if(!FF_LOGIN_PAGE){
    const next = window.location.pathname + window.location.search + window.location.hash;
    login.searchParams.set('next', next);
  }
  return login.href;
}

function ffSafeNext(raw){
  try{
    const fallback = new URL('index.html', window.location.href);
    const candidate = new URL(raw || fallback.href, window.location.href);
    if(candidate.origin !== window.location.origin) return fallback.href;
    if(/(^|\/)login\.html$/i.test(candidate.pathname)) return fallback.href;
    if(!candidate.pathname.toLowerCase().endsWith('.html')) return fallback.href;
    return candidate.href;
  }catch{
    return new URL('index.html', window.location.href).href;
  }
}

function ffRedirectLogin(){
  if(FF_LOGIN_PAGE || ffRedirectingToLogin) return;
  ffRedirectingToLogin = true;
  window.location.replace(ffLoginUrl());
}

function ffIsProtectedApi(input){
  try{
    const raw = input && typeof input === 'object' && 'url' in input ? input.url : input;
    const url = new URL(String(raw), window.location.href);
    if(url.origin !== FF_API_ORIGIN) return false;
    return /^\/(rest\/v1|functions\/v1|storage\/v1|graphql\/v1)(\/|$)/i.test(url.pathname);
  }catch{
    return false;
  }
}

async function ffRequireSession(){
  if(!ffSessionReady){
    ffSessionReady = supabaseClient.auth.getSession().then(({data,error})=>{
      const session = error ? null : (data?.session || null);
      if(!session) ffRedirectLogin();
      return session;
    }).catch(()=>{
      ffRedirectLogin();
      return null;
    });
  }
  const session = await ffSessionReady;
  if(!session) throw new Error('Sesi login diperlukan untuk memakai Familia Food.');
  return session;
}

async function ffAuthenticatedFetch(input,init){
  if(!FF_LOGIN_PAGE && ffIsProtectedApi(input)) await ffRequireSession();
  return window.fetch(input,init);
}

supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  global: { fetch: ffAuthenticatedFetch }
});

window.supabaseClient = supabaseClient;
window.FF_OWNER_EMAIL = FF_OWNER_EMAIL;
window.FF_SAFE_NEXT = ffSafeNext;

supabaseClient.auth.onAuthStateChange((event,session)=>{
  if(event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED'){
    ffSessionReady = Promise.resolve(session || null);
  }
  if(event === 'SIGNED_OUT'){
    ffSessionReady = Promise.resolve(null);
    ffRedirectLogin();
  }
});

function ffAddLogoutControl(){
  if(FF_LOGIN_PAGE || document.getElementById('ffLogout')) return;
  const sidebar = document.querySelector('.sidebar');
  if(!sidebar) return;
  const button = document.createElement('button');
  button.id = 'ffLogout';
  button.type = 'button';
  button.className = 'menu';
  button.textContent = '🚪 Keluar';
  button.style.cssText = 'width:100%;text-align:left;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;';
  button.addEventListener('click',async()=>{
    button.disabled=true;
    const {error}=await supabaseClient.auth.signOut();
    if(error){
      button.disabled=false;
      alert('Gagal keluar. Periksa koneksi lalu coba lagi.');
    }
  });
  sidebar.appendChild(button);
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded',ffAddLogoutControl,{once:true});
}else{
  ffAddLogoutControl();
}

if(!FF_LOGIN_PAGE){
  ffRequireSession().catch(()=>{});
}
