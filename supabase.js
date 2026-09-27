const SUPABASE_URL = "https://zaqdjyhosksbdlafhluc.supabase.co";
const SUPABASE_KEY = "sb_publishable_v9HwG1jpZXKeo2MYrWmGdg_VO4Or8yt";

// Familia Food memakai Anonymous Auth sebagai identitas aplikasi.
// Semua query data menunggu sesi anonymous siap sehingga RLS dapat
// membatasi akses database ke role authenticated tanpa mengubah alur POS.
const nativeFetch = window.fetch.bind(window);
const authClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const FF_AUTH_READY = (async function(){
  const current = await authClient.auth.getSession();
  if(current?.data?.session?.access_token) return current.data.session;

  const signed = await authClient.auth.signInAnonymously();
  if(signed.error) throw signed.error;
  return signed.data.session;
})();

const authorizedFetch = async function(input, init){
  await FF_AUTH_READY;
  return nativeFetch(input, init);
};

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    global: {
      fetch: authorizedFetch
    }
  }
);

window.supabaseClient = supabaseClient;
window.FF_AUTH_READY = FF_AUTH_READY;
