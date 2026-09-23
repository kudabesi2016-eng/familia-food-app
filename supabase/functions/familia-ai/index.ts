import OpenAI from "npm:openai@6";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const client = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({error:"Method not allowed"}), {status:405,headers:cors});

  try {
    if (!Deno.env.get("OPENAI_API_KEY")) throw new Error("OPENAI_API_KEY belum diset");
    const body = await req.json();
    const message = String(body?.message || "").trim();
    if (!message) return new Response(JSON.stringify({error:"Pertanyaan kosong"}), {status:400,headers:cors});

    // Read-only agent: context is supplied by a future server-side data adapter.
    // Do not put an OpenAI key in browser/Android code.
    const response = await client.responses.create({
      model: Deno.env.get("FF_AI_MODEL") || "gpt-5.6-luna",
      store: false,
      instructions: [
        "Kamu adalah Agen AI Familia Food.",
        "Jawab dalam Bahasa Indonesia yang ringkas, jelas, dan berbasis data.",
        "Jangan mengarang angka. Jika data usaha belum diberikan oleh server, katakan datanya belum tersedia.",
        "Tahap pertama adalah read-only: jangan menyuruh atau melakukan perubahan database.",
        "Fokus pada penjualan, HPP, profit, pengeluaran, pembelian, supplier, pelanggan, retur, dan laporan Familia Food."
      ].join(" "),
      input: message
    });

    return new Response(JSON.stringify({answer: response.output_text || "Tidak ada jawaban."}), {headers:cors});
  } catch (e) {
    return new Response(JSON.stringify({error:String(e?.message||e)}), {status:500,headers:cors});
  }
});
