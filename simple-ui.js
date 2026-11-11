/* Familia Food — five primary menus, supporting menus tucked away */
(() => {
  "use strict";
  const fileName = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const mainMenu = [
    ["index.html","🏠 Dashboard"],
    ["penjualan.html","💰 Penjualan"],
    ["operasional.html","🧾 Pengeluaran"],
    ["produk.html","📦 Produk & HPP"],
    ["rekap.html","📊 Laporan"]
  ];
  const otherMenu = [
    ["bahan-baku.html","🥣 Bahan Baku"],
    ["resep.html","📋 Resep"],
    ["hpp.html","🧮 Kalkulator HPP"],
    ["data-lama.html","📁 Data Lama"],
    ["hutang-piutang.html","💳 Hutang & Piutang"],
    ["pengaturan.html","⚙️ Pengaturan"]
  ];

  const sidebar = document.querySelector(".sidebar");
  if (sidebar) {
    const brand = sidebar.querySelector(".brand,.logo") || document.createElement("div");
    if (!brand.textContent.trim()) brand.textContent = "🍀 Familia Food";
    brand.classList.add("ff-brand-title");

    const existing = new Map();
    sidebar.querySelectorAll("a[href]").forEach((a) => {
      const raw = (a.getAttribute("href") || "").split("?")[0].split("#")[0];
      const key = raw.split("/").pop().toLowerCase();
      if (key && !existing.has(key)) existing.set(key, a.getAttribute("href"));
    });

    const makeLink = ([file,label], isOther) => {
      const a = document.createElement("a");
      a.className = "ff-nav-link";
      a.href = existing.get(file) || file;
      a.textContent = label;
      const productGroup = ["produk.html","bahan-baku.html","resep.html","hpp.html"].includes(fileName);
      const active = file === fileName || (file === "produk.html" && productGroup);
      if (active) {
        a.classList.add("is-active");
        a.setAttribute("aria-current","page");
      }
      if (isOther && file === fileName) a.classList.add("is-active");
      return a;
    };

    const navWrap = document.createElement("nav");
    navWrap.className = "ff-nav-wrap";
    navWrap.setAttribute("aria-label","Navigasi utama");
    const primary = document.createElement("div");
    primary.className = "ff-primary-nav";
    mainMenu.forEach((item) => primary.appendChild(makeLink(item,false)));
    const more = document.createElement("details");
    more.className = "ff-more";
    if (otherMenu.some(([file]) => file === fileName)) more.open = true;
    const summary = document.createElement("summary");
    summary.textContent = "Menu lainnya";
    const secondary = document.createElement("div");
    secondary.className = "ff-more-links";
    otherMenu.forEach((item) => secondary.appendChild(makeLink(item,true)));
    more.append(summary,secondary);
    navWrap.append(primary,more);
    sidebar.replaceChildren(brand,navWrap);
  }

  if (fileName === "index.html" || fileName === "") {
    const main = document.querySelector(".main");
    const cards = main && main.querySelector(".cards");
    if (cards) {
      const primaryIds = ["totalRevenue","totalOut","totalNet","totalHpp","totalProfit"];
      const extraIds = ["totalMargin","totalProduk","totalPenjualan"];
      const findCard = (id) => {
        const node = document.getElementById(id);
        return node ? node.closest(".card") : null;
      };
      cards.classList.add("ff-primary-kpis");
      primaryIds.forEach((id) => {
        const card = findCard(id);
        if (card) { card.style.display = ""; cards.appendChild(card); }
      });
      const extras = extraIds.map(findCard).filter(Boolean);
      if (extras.length) {
        const extraDetails = document.createElement("details");
        extraDetails.className = "ff-dashboard-details";
        const title = document.createElement("summary");
        title.textContent = "Lihat indikator tambahan";
        const grid = document.createElement("div");
        grid.className = "ff-extra-metrics";
        extras.forEach((card) => { card.style.display = ""; grid.appendChild(card); });
        extraDetails.append(title,grid);
        cards.after(extraDetails);
      }
    }

    const quickSection = main && main.querySelector(".section");
    if (quickSection) {
      quickSection.classList.add("ff-dashboard-quick");
      const quick = quickSection.querySelector(".quick");
      if (quick) {
        const wanted = ["penjualan.html","operasional.html","rekap.html","produk.html"];
        const labels = ["＋ Input Penjualan","＋ Catat Pengeluaran","▤ Lihat Laporan","▣ Kelola Produk"];
        wanted.forEach((file,index) => {
          const link = Array.from(quick.querySelectorAll("a")).find((a) => (a.getAttribute("href") || "").split("?")[0].split("/").pop() === file);
          if (link) link.textContent = labels[index];
        });
        quick.querySelectorAll("a").forEach((a) => {
          const file = (a.getAttribute("href") || "").split("?")[0].split("/").pop();
          if (!wanted.includes(file)) a.remove();
        });
      }
    }

    const channels = main ? Array.from(main.querySelectorAll(":scope > .channel")) : [];
    if (channels.length) {
      const details = document.createElement("details");
      details.className = "ff-dashboard-details";
      const summary = document.createElement("summary");
      summary.textContent = "Lihat rincian Offline, Online & Operasional";
      details.appendChild(summary);
      channels[0].before(details);
      channels.forEach((section) => details.appendChild(section));
      if (quickSection) quickSection.after(details);
    }
  }
})();
