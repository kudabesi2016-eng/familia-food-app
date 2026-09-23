import OpenAI from "npm:openai@6";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const MODEL = Deno.env.get("FF_AI_MODEL") || "gpt-5.6-luna";

function json(data, status=200) {
  return new Response(JSON.stringify(data), { status, headers: cors });
}
function n(v){ const x=Number(v); return Number.isFinite(x) ? x : 0; }
function monthOf(v){
  const m=String(v ?? "").match(/^(\d{4})-(\d{1,2})/);
  return m ? m[1]+"-"+String(Number(m[2])).padStart(2,"0") : "";
}
function norm(v){ return String(v ?? "").trim().toLowerCase().replace(/\s+/g," "); }
function rupiah(v){ return "Rp "+Math.round(n(v)).toLocaleString("id-ID"); }
function monthLabel(m){
  if(!/^\d{4}-\d{2}$/.test(m)) return m || "-";
  return new Date(m+"-01T00:00:00Z").toLocaleDateString("id-ID",{month:"long",year:"numeric",timeZone:"UTC"});
}
function requestedMonth(q){
  const s=norm(q);
  const now=new Date();
  let y=now.getUTCFullYear();
  const ym=s.match(/\b(20\d{2})[-\/]?(0?[1-9]|1[0-2])\b/);
  if(ym) return ym[1]+"-"+String(Number(ym[2])).padStart(2,"0");
  const names=["januari","februari","maret","april","mei","juni","juli","agustus","september","oktober","november","desember"];
  for(let i=0;i<names.length;i++) if(s.includes(names[i])) return y+"-"+String(i+1).padStart(2,"0");
  return now.toISOString().slice(0,7);
}

async function makeDb(req){
  const url=Deno.env.get("SUPABASE_URL");
  let key="";
  try {
    const map=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    key=map.default || "";
  } catch {}
  if(!key) key=Deno.env.get("SUPABASE_ANON_KEY") || "";
  const auth=req.headers.get("Authorization") || "";
  if(!/^Bearer\s+\S+/i.test(auth)) throw new Error("Sesi Agen AI belum terautentikasi.");
  if(!url || !key) throw new Error("Konfigurasi Supabase Edge Function belum lengkap.");
  return createClient(url,key,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
}

async function read(db, table, select="*", filterFn=null, limit=5000){
  const r=await db.from(table).select(select).limit(limit);
  if(r.error) throw new Error(table+": "+r.error.message);
  const rows=r.data || [];
  return filterFn ? rows.filter(filterFn) : rows;
}

function buildSnapshot(month, q, data){
  const {sales, olds, expenses, products, hpps, purchases, returns, suppliers, customers}=data;
  const hppByName=new Map();
  for(const h of hpps){
    const p=products.find(x=>String(x.id)===String(h.produk_id));
    if(!p) continue;
    const unit=n(h.hpp_unit);
    if(unit>0) hppByName.set(norm(p.nama_produk),unit);
  }
  const resolveHpp=name=>{
    const raw=norm(name);
    const direct=hppByName.get(raw);
    if(direct) return direct;
    const m=raw.match(/^naget\s+isi\s+(10|12|20|25|30|40|50)(?:\s*\+?\s*saus)?$/);
    if(m){
      const target=norm("naget "+m[1]+(m[1]==="25"?"+saus":""));
      return hppByName.get(target) || null;
    }
    return null;
  };

  const oldOffline=olds.filter(x=>monthOf(x.periode)===month);
  const newOffline=sales.filter(x=>x.channel==="Offline" && monthOf(x.tanggal)===month);
  const histRev=onlineHist.reduce((a,x)=>a+n(x.omzet_produk),0);
  const histFee=onlineHist.reduce((a,x)=>a+n(x.biaya_platform),0);
  const histNet=onlineHist.reduce((a,x)=>a+n(x.uang_bersih),0);
  const newNet=onlineCash.reduce((a,x)=>a+n(x.uang_bersih ?? x.omzet_produk),0);
  const onlineRevenue=histRev+newNet;
  const onlineNet=histNet+newNet;
  let onlineModal=0, onlineHppKnown=true;
  const onlineProducts=new Map();

  // Audit terkunci: data Seller Center Jan–Agustus 2026 wajib berjumlah 8.085 bungkus.
  const lockedSellerAll=sales.filter(x=>
    x.channel==="Online" && x.source==="seller_center" &&
    monthOf(x.tanggal)>="2026-01" && monthOf(x.tanggal)<="2026-08"
  );
  const lockedSellerTotal=lockedSellerAll.reduce((a,x)=>a+Math.trunc(n(x.qty)),0);
  const lockedSellerHasRows=lockedSellerAll.length>0;
  const lockedSellerAuditOk=!lockedSellerHasRows || lockedSellerTotal===8085;

  for(const x of onlineSeller){
    const qty=n(x.qty), modal=x.modal_hpp!=null?n(x.modal_hpp):qty*n(x.hpp);
    if(qty>0 && modal<=0) onlineHppKnown=false;
    onlineModal+=modal;
    const key=norm(x.product_name||"-");
    const g=onlineProducts.get(key)||{name:x.product_name||"-",qty:0,revenue:0,modal:0,modalKnown:true};
    g.qty+=qty; g.modal+=modal; if(qty>0&&modal<=0)g.modalKnown=false;
    onlineProducts.set(key,g);
  }
  for(const x of onlineNew){
    const qty=n(x.qty), modal=x.modal_hpp!=null?n(x.modal_hpp):qty*n(x.hpp);
    if(qty>0 && modal<=0) onlineHppKnown=false;
    onlineModal+=modal;
    const key=norm(x.product_name||"-");
    const g=onlineProducts.get(key)||{name:x.product_name||"-",qty:0,revenue:0,modal:0,modalKnown:true};
    g.qty+=qty; g.modal+=modal; if(qty>0&&modal<=0)g.modalKnown=false;
    onlineProducts.set(key,g);
  }
  if(month>="2026-01" && month<="2026-08" && lockedSellerHasRows && !lockedSellerAuditOk){
    onlineHppKnown=false;
  }

  const onlineProfit=onlineHppKnown ? onlineNet-onlineModal : null;
  const offlineProfit=offlineHppKnown ? offlineNet-offlineModal : null;

  const purchaseRows=purchases.filter(x=>monthOf(x.tanggal)===month);
  const returnRows=returns.filter(x=>monthOf(x.tanggal)===month);
  const purchaseTotal=purchaseRows.reduce((a,x)=>a+n(x.total),0);
  const returnTotal=returnRows.reduce((a,x)=>a+n(x.nominal),0);

  const productRows=[
    ...[...offlineProducts.values()].map(x=>({...x,channel:"Offline"})),
    ...[...onlineProducts.values()].map(x=>({...x,channel:"Online"}))
  ].sort((a,b)=>b.qty-a.qty).slice(0,20);

  return {
    periode:month,
    label:monthLabel(month),
    requested_question:q,
    aturan:{
      satuan:"bungkus",
      online_histori_jan_agustus_2026_bungkus:8085,
      online_baru_sudah_net:true,
      online_baru_tidak_hitung_potongan_lagi:true,
      mode:"read-only"
    },
    offline:{
      pemasukan:offlineRevenue,
      pengeluaran:offlineExpense,
      uang_bersih:offlineNet,
      modal:offlineHppKnown?offlineModal:null,
      profit:offlineProfit,
      transaksi_baru:newOffline.length,
      data_lama:oldOffline.length
    },
    online:{
      pemasukan:onlineRevenue,
      potongan_histori:histFee,
      uang_bersih:onlineNet,
      modal:onlineHppKnown?onlineModal:null,
      profit:onlineProfit,
      seller_center_bungkus:onlineSeller.reduce((a,x)=>a+n(x.qty),0),
      transaksi_produk_baru:onlineNew.length,
      bungkus_baru:onlineNew.reduce((a,x)=>a+n(x.qty),0),
      penerimaan_baru:newNet,
      data_lama_finance:onlineHist.length
    },
    produk_teratas:productRows,
    operasional:{
      pembelian:purchaseTotal,
      jumlah_pembelian:purchaseRows.length,
      pengeluaran:offlineExpense,
      retur_nominal:returnTotal,
      retur_bungkus:returnRows.reduce((a,x)=>a+n(x.qty),0),
      supplier_aktif:suppliers.filter(x=>String(x.status||"Aktif")==="Aktif").length,
      pelanggan_aktif:customers.filter(x=>String(x.status||"Aktif")==="Aktif").length
    },
    kualitas_data:{
      hpp_offline_tersedia:offlineHppKnown,
      hpp_online_tersedia:onlineHppKnown,
      audit_online_seller_center_8085_bungkus: lockedSellerAuditOk,
      total_online_seller_center_jan_agustus_2026: lockedSellerTotal,
      produk_master:products.length,
      bahan_baku: data.materials?.length || undefined
    }
  };
}

async function getData(db, month){
  const specs=[
    ["penjualan","*"],["data_lama","*"],["pengeluaran","*"],["produk","*"],["hpp","*"],
    ["ff_pembelian","id,tanggal,total"],["ff_retur_penjualan","id,tanggal,channel,nama_produk,qty,nominal"],
    ["ff_supplier","id,status"],["ff_pelanggan","id,status"]
  ];
  const out={};
  for(const [table,select] of specs){
    try { out[table]=await read(db,table,select); }
    catch(e) { out[table]=[]; out[table+"_error"]=e.message; }
  }
  return {
    sales:out.penjualan||[], olds:out.data_lama||[], expenses:out.pengeluaran||[],
    products:out.produk||[], hpps:out.hpp||[], purchases:out.ff_pembelian||[],
    returns:out.ff_retur_penjualan||[], suppliers:out.ff_supplier||[], customers:out.ff_pelanggan||[],
    errors:Object.entries(out).filter(([k,v])=>k.endsWith("_error")).map(([k,v])=>v)
  };
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(req.method!=="POST") return json({error:"Method not allowed"},405);
  try{
    const body=await req.json();
    const message=String(body?.message||"").trim();
    if(!message)return json({error:"Pertanyaan kosong"},400);
    // Healthcheck harus benar-benar zero-cost: tidak membutuhkan OpenAI API key.
    if(message==="__healthcheck__") return json({ok:true,mode:"read-only",source:"familia_food_snapshot"});
    if(!OPENAI_KEY) return json({error:"OPENAI_API_KEY belum diset di Supabase Edge Function."},503);

    const month=requestedMonth(message);
    const db=await makeDb(req);
    const data=await getData(db,month);
    const snapshot=buildSnapshot(month,message,data);
    const history=Array.isArray(body?.history)?body.history.slice(-6):[];

    const response=await new OpenAI({apiKey:OPENAI_KEY}).responses.create({
      model:MODEL,
      store:false,
      instructions:[
        "Kamu adalah Agen AI internal Familia Food.",
        "Gunakan snapshot data usaha yang diberikan server sebagai sumber angka utama.",
        "Jangan mengarang angka. Jika snapshot tidak punya data, katakan data belum tersedia.",
        "Jangan mengubah database. Tahap ini read-only.",
        "Semua qty produk dinyatakan dalam bungkus, bukan pcs.",
        "Bedakan Data Lama dan transaksi baru, tetapi gunakan keduanya saat menjawab rekap.",
        "Untuk Online Baru, Uang Bersih sudah setelah potongan platform; jangan menghitung potongan kedua kali.",
        "Jika HPP/modal belum diketahui, jangan membuat profit.",
        "Jawab Bahasa Indonesia, ringkas namun beri rincian perhitungan saat ditanya.",
        "Jika pertanyaan tidak terkait usaha Familia Food, arahkan kembali ke data usaha."
      ].join(" "),
      input:[
        {role:"system",content:[{type:"input_text",text:"SNAPSHOT DATA USAHA:\n"+JSON.stringify(snapshot)}]},
        ...history.map(x=>({role:x.role==="assistant"?"assistant":"user",content:[{type:"input_text",text:String(x.content||"").slice(0,2000)}]})),
        {role:"user",content:[{type:"input_text",text:message}]}
      ]
    });
    return json({answer:response.output_text||"Agen AI tidak mengembalikan jawaban.",period:month,source:"familia_food_snapshot"});
  }catch(e){
    console.error("familia-ai",e);
    return json({error:String(e?.message||e)},500);
  }
});
