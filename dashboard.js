/* Lunaria — dashboard demo
   Data disimpan di localStorage (kunci: lunaria.transactions.v1).
   Semua perhitungan dilakukan di sisi klien; tidak ada permintaan jaringan.
*/
(function () {
  "use strict";

  var STORAGE_KEY = "lunaria.transactions.v1";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var fmtRp = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });
  var fmtShort = function (n) {
    if (Math.abs(n) >= 1e9) return "Rp " + (n / 1e9).toFixed(1).replace(".", ",") + " M";
    if (Math.abs(n) >= 1e6) return "Rp " + (n / 1e6).toFixed(1).replace(".", ",") + " jt";
    if (Math.abs(n) >= 1e3) return "Rp " + Math.round(n / 1e3) + " rb";
    return "Rp " + n;
  };
  var fmtDate = function (iso) {
    var d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  /* =========================================================
     1. Data awal (dummy) — dibuat relatif terhadap hari ini
     ========================================================= */

  var seedTemplates = {
    income: [
      { desc: "Invoice desain identitas", category: "Jasa", client: "Kirana Studio", base: 8500000, status: "paid" },
      { desc: "Paket retainer media sosial", category: "Jasa", client: "Rempah Co.", base: 4200000, status: "paid" },
      { desc: "Penjualan 24 botol sirup", category: "Produk", client: "Toko daring", base: 1560000, status: "paid" },
      { desc: "Invoice landing page", category: "Jasa", client: "Nusa Digital", base: 6250000, status: "pending" },
      { desc: "Kelas daring batch 7", category: "Penjualan", client: "Peserta umum", base: 3100000, status: "paid" },
    ],
    expense: [
      { desc: "Sewa studio bulanan", category: "Operasional", client: "", base: 2400000, status: "paid" },
      { desc: "Iklan Meta Ads", category: "Pemasaran", client: "", base: 1250000, status: "paid" },
      { desc: "Honor editor video", category: "Gaji", client: "Bagas S.", base: 1800000, status: "paid" },
      { desc: "Langganan Figma & Notion", category: "Peralatan", client: "", base: 420000, status: "paid" },
      { desc: "Bahan kemasan 500 pcs", category: "Operasional", client: "", base: 980000, status: "pending" },
    ],
  };

  var uid = function () {
    return "t" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
  };

  function seedData() {
    var out = [];
    var now = new Date();
    var statuses = ["paid", "paid", "paid", "pending", "overdue"];

    for (var m = 11; m >= 0; m--) {
      var ref = new Date(now.getFullYear(), now.getMonth() - m, 1);
      var year = ref.getFullYear();
      var month = ref.getMonth();
      var daysInMonth = new Date(year, month + 1, 0).getDate();
      var isCurrent = m === 0;
      var maxDay = isCurrent ? Math.max(now.getDate() - 1, 1) : daysInMonth;

      // 3 pemasukan per bulan, 2–3 pengeluaran
      var incCount = 3;
      for (var i = 0; i < incCount; i++) {
        var tpl = seedTemplates.income[(m + i) % seedTemplates.income.length];
        var day = Math.min(maxDay, 3 + ((i * 7 + m * 3) % 22));
        var wobble = 1 + (((m * 13 + i * 7) % 11) - 5) / 40;
        out.push({
          id: uid(),
          desc: tpl.desc,
          type: "income",
          amount: Math.round((tpl.base * wobble) / 1000) * 1000,
          date: isoDate(year, month, day),
          category: tpl.category,
          client: tpl.client,
          status: m === 0 && i === 1 ? "pending" : tpl.status,
        });
      }

      // 2–3 pengeluaran per bulan
      var expCount = 2 + (m % 2);
      for (var j = 0; j < expCount; j++) {
        var etpl = seedTemplates.expense[(m + j) % seedTemplates.expense.length];
        var eday = Math.min(maxDay, 5 + ((j * 9 + m * 4) % 20));
        var ewobble = 1 + (((m * 7 + j * 5) % 9) - 4) / 45;
        out.push({
          id: uid(),
          desc: etpl.desc,
          type: "expense",
          amount: Math.round((etpl.base * ewobble) / 1000) * 1000,
          date: isoDate(year, month, eday),
          category: etpl.category,
          client: etpl.client,
          status: statuses[(m + j) % statuses.length],
        });
      }
    }

    // satu pengeluaran besar di bulan berjalan supaya arus kas terlihat wajar
    var nowRef = new Date();
    out.push({
      id: uid(),
      desc: "Laptop kerja baru",
      amount: 1800000,
      type: "expense",
      date: isoDate(
        nowRef.getFullYear(),
        nowRef.getMonth(),
        Math.max(1, Math.min(nowRef.getDate() - 1, 28))
      ),
      category: "Peralatan",
      client: "",
      status: "paid",
    });

    // urutkan terbaru lebih dulu
    out.sort(function (a, b) {
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    });
    return out;
  }

  function isoDate(y, m, d) {
    return y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
  }

  /* =========================================================
     2. Penyimpanan
     ========================================================= */

  var store = {
    read: function () {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        var parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
      } catch (err) {
        return null;
      }
    },
    write: function (list) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch (err) {
        toast("Penyimpanan peramban penuh. Hapus beberapa transaksi lama.", false);
      }
    },
    reset: function () {
      var fresh = seedData();
      store.write(fresh);
      return fresh;
    },
  };

  var transactions = store.read() || store.reset();

  /* =========================================================
     3. Helper perhitungan
     ========================================================= */

  var monthKey = function (iso) {
    return iso.slice(0, 7);
  };

  function sumBy(list, type, filterMonth) {
    return list.reduce(function (total, t) {
      if (t.type !== type) return total;
      if (filterMonth && monthKey(t.date) !== filterMonth) return total;
      return total + Number(t.amount);
    }, 0);
  }

  function monthsBack(count) {
    var now = new Date();
    var arr = [];
    for (var i = count - 1; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      arr.push({
        key: isoDate(d.getFullYear(), d.getMonth(), 1).slice(0, 7),
        label: d.toLocaleDateString("id-ID", { month: "short" }),
        full: d.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
      });
    }
    return arr;
  }

  function currentMonthKey() {
    var d = new Date();
    return isoDate(d.getFullYear(), d.getMonth(), 1).slice(0, 7);
  }

  function prevMonthKey() {
    var d = new Date();
    var p = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    return isoDate(p.getFullYear(), p.getMonth(), 1).slice(0, 7);
  }

  /* =========================================================
     4. Render: ringkasan
     ========================================================= */

  var el = {
    valBalance: document.getElementById("valBalance"),
    deltaBalance: document.getElementById("deltaBalance"),
    valIncome: document.getElementById("valIncome"),
    footIncome: document.getElementById("footIncome"),
    valExpense: document.getElementById("valExpense"),
    footExpense: document.getElementById("footExpense"),
    valTax: document.getElementById("valTax"),
    txBody: document.getElementById("txBody"),
    txSub: document.getElementById("txSub"),
    sideTxCount: document.getElementById("sideTxCount"),
    breakdown: document.getElementById("breakdown"),
    todayLabel: document.getElementById("todayLabel"),
    chart: document.getElementById("cashChart"),
    chartTip: document.getElementById("chartTip"),
    toastStack: document.getElementById("toastStack"),
  };

  function renderSummary() {
    var thisMonth = currentMonthKey();
    var lastMonth = prevMonthKey();

    var incomeNow = sumBy(transactions, "income", thisMonth);
    var expenseNow = sumBy(transactions, "expense", thisMonth);
    var incomePrev = sumBy(transactions, "income", lastMonth);
    var expensePrev = sumBy(transactions, "expense", lastMonth);

    var balance = sumBy(transactions, "income") - sumBy(transactions, "expense");
    var netNow = incomeNow - expenseNow;
    var netPrev = incomePrev - expensePrev;

    el.valBalance.textContent = fmtRp.format(balance);

    var delta = netPrev > 0 ? ((netNow - netPrev) / netPrev) * 100 : 0;
    var up = delta >= 0;
    el.deltaBalance.className = "pill-delta" + (up ? "" : " is-down");
    el.deltaBalance.innerHTML =
      '<svg aria-hidden="true"><use href="#i-arrow-' + (up ? "up" : "down") + '"/></svg> ' +
      (up ? "+" : "") + delta.toFixed(1).replace(".", ",") + "%";

    el.valIncome.textContent = fmtRp.format(incomeNow);
    el.valExpense.textContent = fmtRp.format(expenseNow);

    var incCount = transactions.filter(function (t) {
      return t.type === "income" && monthKey(t.date) === thisMonth;
    }).length;
    var expCount = transactions.filter(function (t) {
      return t.type === "expense" && monthKey(t.date) === thisMonth;
    }).length;

    el.footIncome.textContent = incCount + " transaksi masuk tercatat";
    el.footExpense.textContent = expCount + " transaksi keluar tercatat";

    // PPh final UMKM 0,5% dari omzet bruto
    el.valTax.textContent = fmtRp.format(Math.round(incomeNow * 0.005));
  }

  /* =========================================================
     5. Render: grafik arus kas
     ========================================================= */

  var chartRange = 6;

  function renderChart() {
    var months = monthsBack(chartRange);
    var data = months.map(function (m) {
      return {
        key: m.key,
        label: m.label,
        full: m.full,
        income: sumBy(transactions, "income", m.key),
        expense: sumBy(transactions, "expense", m.key),
      };
    });
    data.forEach(function (d) {
      d.net = d.income - d.expense;
    });

    // gambar pada lebar piksel sebenarnya agar label tidak terdistorsi
    var W = Math.max(260, Math.round(el.chart.clientWidth || 640));
    var H = W < 480 ? 190 : 215;
    var padL = W < 360 ? 50 : 44;
    var padR = 10;
    var padT = 14;
    var padB = 28;
    var plotW = W - padL - padR;
    var plotH = H - padT - padB;

    var maxVal = Math.max.apply(
      null,
      data.map(function (d) {
        return Math.max(d.income, d.expense, d.net, 0);
      })
    );
    var minVal = Math.min.apply(
      null,
      data.map(function (d) {
        return Math.min(d.net, 0);
      })
    );
    if (maxVal === 0) maxVal = 1;
    var span = maxVal - minVal || 1;
    var yOf = function (v) {
      return padT + plotH - ((v - minVal) / span) * plotH;
    };

    var parts = [];
    parts.push(
      '<defs>' +
        '<linearGradient id="barIncome" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#a89bff"/><stop offset="1" stop-color="#5f7dff"/>' +
        "</linearGradient>" +
        '<linearGradient id="barExpense" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="rgba(255,255,255,0.28)"/><stop offset="1" stop-color="rgba(255,255,255,0.12)"/>' +
        "</linearGradient>" +
        "</defs>"
    );

    // grid + label sumbu Y
    for (var g = 0; g <= 3; g++) {
      var val = minVal + (span / 3) * g;
      var y = yOf(val);
      parts.push(
        '<line class="grid-line" x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + y.toFixed(1) + '"/>'
      );
      parts.push(
        '<text class="axis-label" x="' + (padL - 8) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="end">' +
          shortAxis(val) +
        "</text>"
      );
    }

    var slot = plotW / data.length;
    var barW = Math.min(18, slot * 0.26);
    var gap = 5;
    var zeroY = yOf(0);

    data.forEach(function (d, i) {
      var cx = padL + slot * i + slot / 2;

      var inH = Math.max((zeroY - yOf(d.income)) * (d.income > 0 ? 1 : 0), 0);
      var outH = Math.max((zeroY - yOf(d.expense)) * (d.expense > 0 ? 1 : 0), 0);

      var inX = cx - barW - gap / 2;
      var outX = cx + gap / 2;

      parts.push(
        '<rect class="bar" x="' + inX.toFixed(1) + '" y="' + (zeroY - inH).toFixed(1) +
          '" width="' + barW.toFixed(1) + '" height="' + inH.toFixed(1) +
          '" rx="3" fill="url(#barIncome)" style="animation-delay:' + (i * 45) + 'ms"/>'
      );
      parts.push(
        '<rect class="bar" x="' + outX.toFixed(1) + '" y="' + (zeroY - outH).toFixed(1) +
          '" width="' + barW.toFixed(1) + '" height="' + outH.toFixed(1) +
          '" rx="3" fill="url(#barExpense)" style="animation-delay:' + (i * 45 + 30) + 'ms"/>'
      );

      // label bulan — dilewati jika ruang antar slot terlalu sempit
      var labelEvery = slot < 30 ? 3 : slot < 40 ? 2 : 1;
      if (i % labelEvery === 0) {
        parts.push(
          '<text class="axis-label" x="' + cx.toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + d.label + "</text>"
        );
      }

      // area hover
      parts.push(
        '<rect x="' + (padL + slot * i).toFixed(1) + '" y="' + padT + '" width="' + slot.toFixed(1) +
          '" height="' + plotH + '" fill="transparent" data-i="' + i + '" class="bar-hit"/>'
      );
    });

    // garis laba bersih
    var points = data.map(function (d, i) {
      return [padL + slot * i + slot / 2, yOf(d.net)];
    });
    var pathD = points
      .map(function (p, i) {
        return (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1);
      })
      .join(" ");
    parts.push('<path class="net-line" d="' + pathD + '"/>');
    points.forEach(function (p, i) {
      parts.push(
        '<circle class="net-dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.2" data-i="' + i + '"/>'
      );
    });

    el.chart.setAttribute("viewBox", "0 0 " + W + " " + H);
    el.chart.setAttribute("height", H);
    el.chart.innerHTML = parts.join("");
    el.chart.setAttribute(
      "aria-label",
      "Arus kas " + data.length + " bulan terakhir. Bulan terakhir: pemasukan " +
        fmtRp.format(data[data.length - 1].income) + ", pengeluaran " +
        fmtRp.format(data[data.length - 1].expense) + "."
    );

    // tooltip
    var svgRect = null;
    var showTip = function (index, clientX) {
      var d = data[index];
      if (!d) return;
      svgRect = el.chart.getBoundingClientRect();
      var scale = svgRect.width / W;
      var cx = (padL + slot * index + slot / 2) * scale;
      el.chartTip.innerHTML =
        "<b>" + d.full + "</b>" +
        'Pemasukan <i>' + fmtShort(d.income) + "</i><br>" +
        "Pengeluaran <em>" + fmtShort(d.expense) + "</em><br>" +
        "Laba bersih " + fmtShort(d.net);
      el.chartTip.style.left = Math.min(Math.max(cx, 70), svgRect.width - 70) + "px";
      el.chartTip.style.top = "12px";
      el.chartTip.classList.add("is-on");
    };
    var hideTip = function () {
      el.chartTip.classList.remove("is-on");
    };

    el.chart.querySelectorAll(".bar-hit").forEach(function (hit) {
      var idx = Number(hit.dataset.i);
      hit.addEventListener("mouseenter", function () {
        showTip(idx);
      });
      hit.addEventListener("mouseleave", hideTip);
      hit.addEventListener("click", function () {
        showTip(idx);
      });
    });
    el.chart.addEventListener("mouseleave", hideTip);
  }

  function shortAxis(v) {
    var abs = Math.abs(v);
    if (abs >= 1e9) return (v / 1e9).toFixed(1).replace(".", ",") + " M";
    if (abs >= 1e6) return (v / 1e6).toFixed(1).replace(".", ",") + " jt";
    if (abs >= 1e3) return Math.round(v / 1e3) + " rb";
    return String(Math.round(v));
  }

  /* =========================================================
     6. Render: pengeluaran per kategori
     ========================================================= */

  var catIcons = {
    Operasional: "i-truck",
    Pemasaran: "i-bolt",
    Gaji: "i-users",
    Peralatan: "i-laptop",
    Produk: "i-coffee",
    Jasa: "i-laptop",
    Penjualan: "i-wallet",
    Lainnya: "i-wallet",
  };

  function renderBreakdown() {
    var thisMonth = currentMonthKey();
    var byCat = {};
    transactions.forEach(function (t) {
      if (t.type !== "expense" || monthKey(t.date) !== thisMonth) return;
      byCat[t.category] = (byCat[t.category] || 0) + Number(t.amount);
    });

    var rows = Object.keys(byCat)
      .map(function (k) {
        return { name: k, total: byCat[k] };
      })
      .sort(function (a, b) {
        return b.total - a.total;
      })
      .slice(0, 5);

    if (!rows.length) {
      el.breakdown.innerHTML =
        '<p style="color:var(--muted);font-size:var(--fs-sm)">Belum ada pengeluaran bulan ini. Tambahkan transaksi pertama Anda.</p>';
      return;
    }

    var max = rows[0].total;
    el.breakdown.innerHTML = rows
      .map(function (r) {
        var pct = Math.round((r.total / max) * 100);
        return (
          '<div class="breakdown__row">' +
          '<div class="breakdown__top"><span>' + escapeHtml(r.name) + "</span><b>" + fmtShort(r.total) + "</b></div>" +
          '<div class="bar-track"><div class="bar-fill" data-w="' + pct + '"></div></div>' +
          "</div>"
        );
      })
      .join("");

    // animasi lebar bar setelah elemen terpasang
    requestAnimationFrame(function () {
      el.breakdown.querySelectorAll(".bar-fill").forEach(function (bar) {
        bar.style.width = bar.dataset.w + "%";
      });
    });
  }

  /* =========================================================
     7. Render: tabel transaksi
     ========================================================= */

  var searchTerm = "";

  function visibleTransactions() {
    var q = searchTerm.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(function (t) {
      return (
        t.desc.toLowerCase().indexOf(q) !== -1 ||
        (t.client || "").toLowerCase().indexOf(q) !== -1 ||
        t.category.toLowerCase().indexOf(q) !== -1
      );
    });
  }

  var statusLabel = {
    paid: "Lunas",
    pending: "Menunggu",
    overdue: "Jatuh tempo",
    draft: "Draf",
  };

  function renderTable() {
    var list = visibleTransactions();
    el.txSub.textContent = list.length + " dari " + transactions.length + " transaksi";
    el.sideTxCount.textContent = transactions.length;

    if (!list.length) {
      el.txBody.innerHTML =
        '<tr><td colspan="6"><div class="empty">' +
        '<svg aria-hidden="true"><use href="#i-search"/></svg>' +
        "<b>Tidak ada transaksi yang cocok</b>" +
        "<p>Coba kata kunci lain, atau tambahkan transaksi baru lewat tombol Tambah transaksi.</p>" +
        "</div></td></tr>";
      return;
    }

    el.txBody.innerHTML = list
      .slice(0, 40)
      .map(function (t) {
        var isIn = t.type === "income";
        return (
          "<tr>" +
          '<td><div class="tx__desc">' +
          '<span class="tx__icon ' + (isIn ? "tx__icon--in" : "") + '" aria-hidden="true">' +
          '<svg><use href="#' + (catIcons[t.category] || "i-wallet") + '"/></svg></span>' +
          "<div><b>" + escapeHtml(t.desc) + "</b>" +
          "<span>" + (t.client ? escapeHtml(t.client) : "Tanpa klien") + "</span></div>" +
          "</div></td>" +
          "<td>" + fmtDate(t.date) + "</td>" +
          "<td>" + escapeHtml(t.category) + "</td>" +
          '<td><span class="badge badge--' + t.status + '">' + (statusLabel[t.status] || "Draf") + "</span></td>" +
          '<td class="tx__amount ' + (isIn ? "is-in" : "") + '">' +
          (isIn ? "+" : "−") + fmtRp.format(t.amount) + "</td>" +
          '<td><div class="row-actions">' +
          '<button type="button" data-delete="' + t.id + '" aria-label="Hapus transaksi ' + escapeHtml(t.desc) + '">' +
          '<svg aria-hidden="true"><use href="#i-trash"/></svg></button>' +
          "</div></td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* =========================================================
     8. Render semua
     ========================================================= */

  function renderAll() {
    renderSummary();
    renderChart();
    renderBreakdown();
    renderTable();
  }

  /* =========================================================
     9. Toast
     ========================================================= */

  function toast(message, success) {
    var node = document.createElement("div");
    node.className = "toast";
    node.innerHTML =
      '<svg aria-hidden="true"><use href="#' + (success === false ? "i-close" : "i-check") + '"/></svg>' +
      "<span>" + escapeHtml(message) + "</span>";
    if (success === false) node.querySelector("svg").style.color = "var(--expense)";
    el.toastStack.appendChild(node);
    setTimeout(function () {
      node.classList.add("is-leaving");
      setTimeout(function () {
        node.remove();
      }, 220);
    }, 2600);
  }

  /* =========================================================
     10. Modal tambah transaksi
     ========================================================= */

  var modal = document.getElementById("txModal");
  var form = document.getElementById("txForm");
  var descInput = document.getElementById("txDesc");
  var amountInput = document.getElementById("txAmount");
  var dateInput = document.getElementById("txDate");
  var lastFocused = null;

  function openModal() {
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    dateInput.value = isoDate(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate()
    );
    setTimeout(function () {
      descInput.focus();
    }, 40);
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocused) lastFocused.focus();
  }

  document.getElementById("addTxFab").addEventListener("click", openModal);
  document.getElementById("addTxTop").addEventListener("click", openModal);

  modal.addEventListener("click", function (e) {
    if (e.target.closest("[data-close-modal]")) closeModal();
  });

  // jebak fokus di dalam modal selama terbuka
  modal.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var focusables = modal.querySelectorAll(
      'button, [href], input:not([type="radio"]), select, [tabindex]:not([tabindex="-1"])'
    );
    var list = Array.prototype.filter.call(focusables, function (node) {
      return node.offsetParent !== null;
    });
    if (!list.length) return;
    var first = list[0];
    var last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });

  // format ribuan saat mengetik
  amountInput.addEventListener("input", function () {
    var digits = amountInput.value.replace(/\D/g, "");
    amountInput.value = digits ? Number(digits).toLocaleString("id-ID") : "";
    document.getElementById("errAmount").hidden = true;
    amountInput.setAttribute("aria-invalid", "false");
  });

  descInput.addEventListener("input", function () {
    document.getElementById("errDesc").hidden = true;
    descInput.setAttribute("aria-invalid", "false");
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var desc = descInput.value.trim();
    var amount = Number(amountInput.value.replace(/\D/g, ""));
    var valid = true;

    if (desc.length < 3) {
      document.getElementById("errDesc").hidden = false;
      descInput.setAttribute("aria-invalid", "true");
      valid = false;
    }
    if (!amount || amount <= 0) {
      document.getElementById("errAmount").hidden = false;
      amountInput.setAttribute("aria-invalid", "true");
      valid = false;
    }
    if (!valid) {
      (desc.length < 3 ? descInput : amountInput).focus();
      return;
    }

    var type = form.querySelector('input[name="type"]:checked').value;

    transactions.unshift({
      id: uid(),
      desc: desc,
      type: type,
      amount: amount,
      date: dateInput.value || isoDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()),
      category: document.getElementById("txCategory").value,
      client: document.getElementById("txClient").value.trim(),
      status: document.getElementById("txStatus").value,
    });

    transactions.sort(function (a, b) {
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    });

    store.write(transactions);
    renderAll();
    closeModal();
    form.reset();
    amountInput.value = "";
    toast("Transaksi tersimpan: " + desc);
  });

  /* =========================================================
     11. Hapus transaksi
     ========================================================= */

  el.txBody.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-delete]");
    if (!btn) return;
    var id = btn.dataset.delete;
    var target = transactions.find(function (t) {
      return t.id === id;
    });
    if (!target) return;

    transactions = transactions.filter(function (t) {
      return t.id !== id;
    });
    store.write(transactions);
    renderAll();
    toast("Dihapus: " + target.desc);
  });

  /* =========================================================
     12. Pencarian & rentang grafik
     ========================================================= */

  var searchInput = document.getElementById("txSearch");
  var searchTimer;
  searchInput.addEventListener("input", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      searchTerm = searchInput.value;
      renderTable();
    }, 120);
  });

  document.querySelectorAll(".segmented button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".segmented button").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b === btn));
      });
      chartRange = Number(btn.dataset.range);
      renderChart();
    });
  });

  /* =========================================================
     13. Ekspor CSV
     ========================================================= */

  document.getElementById("exportCsv").addEventListener("click", function () {
    var list = visibleTransactions();
    var header = ["Tanggal", "Keterangan", "Jenis", "Kategori", "Klien", "Status", "Nominal"];
    var rows = list.map(function (t) {
      return [
        t.date,
        t.desc,
        t.type === "income" ? "Pemasukan" : "Pengeluaran",
        t.category,
        t.client || "",
        statusLabel[t.status] || "Draf",
        String(t.amount),
      ];
    });
    var csv = [header].concat(rows)
      .map(function (r) {
        return r
          .map(function (cell) {
            return '"' + String(cell).replace(/"/g, '""') + '"';
          })
          .join(",");
      })
      .join("\r\n");

    var blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "lunaria-transaksi-" + currentMonthKey() + ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("CSV berisi " + list.length + " transaksi diunduh");
  });

  /* =========================================================
     14. Drawer navigasi (mobile)
     ========================================================= */

  var drawer = document.getElementById("drawer");
  var drawerOpen = document.getElementById("drawerOpen");

  function setDrawer(open) {
    drawer.hidden = !open;
    drawerOpen.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
    if (open) {
      var first = drawer.querySelector("a, button");
      if (first) first.focus();
    } else {
      drawerOpen.focus();
    }
  }

  drawerOpen.addEventListener("click", function () {
    setDrawer(true);
  });

  drawer.addEventListener("click", function (e) {
    if (e.target.closest("[data-close-drawer]")) setDrawer(false);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !drawer.hidden) setDrawer(false);
  });

  /* =========================================================
     15. Reset demo & tombol lain
     ========================================================= */

  document.getElementById("resetDemo").addEventListener("click", function () {
    transactions = store.reset();
    renderAll();
    toast("Data demo dikembalikan ke kondisi awal");
  });

  document.getElementById("bellBtn").addEventListener("click", function () {
    var pending = transactions.filter(function (t) {
      return t.status === "pending" || t.status === "overdue";
    }).length;
    toast(
      pending
        ? pending + " transaksi belum lunas. Buka tabel transaksi untuk meninjaunya."
        : "Semua transaksi sudah lunas. Tidak ada yang perlu ditindak."
    );
  });

  // menu yang belum ada di demo: beri penjelasan, bukan tautan mati
  document.querySelectorAll("[data-demo]").forEach(function (link) {
    link.addEventListener("click", function () {
      toast("Halaman ini belum tersedia di demo. Bagian transaksi di bawah sudah bisa dipakai.");
    });
  });

  /* =========================================================
     16. Gambar ulang grafik saat lebar berubah
     ========================================================= */

  var lastChartWidth = 0;
  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var w = el.chart.clientWidth;
      if (Math.abs(w - lastChartWidth) < 24) return;
      lastChartWidth = w;
      renderChart();
    }, 180);
  });

  /* =========================================================
     17. Mulai — tampilkan skeleton sebentar, lalu data
     ========================================================= */

  el.todayLabel.textContent = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  var bootDelay = reduceMotion ? 0 : 620;
  setTimeout(function () {
    renderAll();
  }, bootDelay);
})();
