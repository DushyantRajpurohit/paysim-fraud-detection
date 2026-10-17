(() => {
  "use strict";

  const API = "https://paysim-fraud-detection-591g.onrender.com";
  const C = { ink: "#111111", soft: "#3b3630", faint: "#6b6357", paper: "#fff8e8", yellow: "#ffe84d",
              pink: "#ff6fae", pinkInk: "#c2185b", teal: "#2dd4bf", tealInk: "#0f766e", grey: "#b5ab9b" };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) document.documentElement.classList.add("no-motion");
  const SVGNS = "http://www.w3.org/2000/svg";
  const rc = (svg) => rough.svg(svg);

  // Real test-set transactions (the same presets as the API's own demo page).
  const PRESETS = [
    { label: "Fraud it catches", tx: { type: "TRANSFER", amount: 4445514.2, oldbalanceOrg: 4445514.2, oldbalanceDest: 0, step: 379, dest_prior_txns: 0, dest_prior_amount: 0 } },
    { label: "Fraud it misses", tx: { type: "CASH_OUT", amount: 99656.93, oldbalanceOrg: 99656.93, oldbalanceDest: 0, step: 546, dest_prior_txns: 0, dest_prior_amount: 0 } },
    { label: "Legitimate transfer", tx: { type: "TRANSFER", amount: 512223.02, oldbalanceOrg: 5015, oldbalanceDest: 72330.64, step: 378, dest_prior_txns: 2, dest_prior_amount: 72330.64 } },
    { label: "False alarm", tx: { type: "CASH_OUT", amount: 293688.71, oldbalanceOrg: 164503, oldbalanceDest: 59276.04, step: 656, dest_prior_txns: 4, dest_prior_amount: 601259.56 } },
  ];
  const FEATURE_NAMES = {
    is_transfer: "transfer, not cash-out", log_amount: "amount", hour: "hour of day",
    dest_empty_before: "destination was empty", log_dest_balance: "destination balance",
    dest_prior_txns: "destination's earlier payments", log_dest_prior_amount: "destination's earlier total",
    amount_vs_dest_usual: "amount vs destination's usual",
  };

  const fmt = {
    n: (x) => Math.round(x).toLocaleString("en-US"),
    p1: (x) => (x * 100).toFixed(1) + "%",
    d3: (x) => x.toFixed(3),
  };
  const el = (tag, attrs = {}, parent) => {
    const node = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (parent) parent.appendChild(node);
    return node;
  };
  const text = (svg, x, y, str, cls = "tick", anchor = "start", extra = {}) => {
    const t = el("text", { x, y, class: cls, "text-anchor": anchor, ...extra }, svg);
    String(str).split(/(\d[\d.,]*%?)/).forEach((part, i) => {
      if (!part) return;
      if (i % 2) el("tspan", { class: "num" }, t).textContent = part;
      else t.appendChild(document.createTextNode(part));
    });
    return t;
  };
  // a drawn arrow, never a typed one
  const arrow = (g, svg, x1, y1, x2, y2, color = C.ink, seed = 1) => {
    const a = Math.atan2(y2 - y1, x2 - x1), h = 9;
    svg.appendChild(g.line(x1, y1, x2, y2, { stroke: color, strokeWidth: 1.8, roughness: 0.7, seed }));
    svg.appendChild(g.linearPath([[x2 - h * Math.cos(a - 0.5), y2 - h * Math.sin(a - 0.5)], [x2, y2],
      [x2 - h * Math.cos(a + 0.5), y2 - h * Math.sin(a + 0.5)]], { stroke: color, strokeWidth: 1.8, roughness: 0.5, seed: seed + 1 }));
  };
  const clear = (svg) => { while (svg.lastChild && svg.lastChild.tagName !== "title" && svg.lastChild.tagName !== "desc") svg.removeChild(svg.lastChild); };
  const widthOf = (svg) => Math.max(340, Math.min(960, svg.parentElement.clientWidth || 960));

  // ---------- sketched outlines for boxes and buttons ----------
  function sketchOutline(host, opts = {}) {
    host.classList.add("sketch-host");
    let svg = host.querySelector(":scope > svg.sketch");
    if (!svg) { svg = el("svg", { class: "sketch", "aria-hidden": "true" }); host.prepend(svg); }
    const draw = () => {
      const { width: w, height: h } = host.getBoundingClientRect();
      if (!w || !h) return;
      clear(svg);
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      svg.appendChild(rc(svg).rectangle(2, 2, w - 4, h - 4, {
        stroke: C.ink, strokeWidth: opts.width || 2.2, roughness: opts.roughness ?? 1.1, bowing: 1.2, seed: opts.seed || 7,
      }));
      if (opts.shadow) svg.insertBefore(rc(svg).line(8, h + 1, w + 1, h + 1, { stroke: C.ink, strokeWidth: 2.5, roughness: 0.8, seed: 3 }), svg.firstChild);
    };
    draw();
    new ResizeObserver(draw).observe(host);
  }
  document.querySelectorAll(".btn").forEach((b, i) => sketchOutline(b, { seed: 11 + i, shadow: b.classList.contains("primary") }));
  ["#codecard", "#dots-fraud, #dots-legit", ".setaside", "#result"].forEach((sel) =>
    document.querySelectorAll(sel).forEach((n, i) => sketchOutline(n, { seed: 21 + i, width: 2.4 })));

  // marker underline under every chapter heading
  const UNDERLINE = { trick: C.pink, honest: C.teal, properly: C.teal, try: C.teal };
  document.querySelectorAll(".chapter h2").forEach((h, i) => {
    const svg = el("svg", { class: "underline", "aria-hidden": "true", preserveAspectRatio: "none", viewBox: "0 0 300 12" }, h);
    const color = UNDERLINE[h.closest(".chapter").id] || C.ink;
    svg.appendChild(rc(svg).curve([[2, 7], [90, 4], [200, 8], [298, 5]], { stroke: color, strokeWidth: color === C.ink ? 2.6 : 4, roughness: 1.4, seed: 40 + i }));
  });

  // the rail's divider, drawn rather than ruled
  (() => {
    const rail = document.querySelector(".rail");
    const svg = el("svg", { class: "rail-line", "aria-hidden": "true", preserveAspectRatio: "none", viewBox: "0 0 6 1000" }, rail);
    svg.appendChild(rc(svg).linearPath([[3, 0], [2, 260], [4, 520], [2.5, 780], [3, 1000]], { stroke: C.ink, strokeWidth: 2.4, roughness: 0.6, seed: 77 }));
  })();

  // the hero's doodled arrow, from the callout to the line that does the work
  function heroArrow() {
    const svg = document.getElementById("hero-arrow"), card = document.querySelector(".reveal-card");
    const hit = document.getElementById("hit").getBoundingClientRect(), call = document.getElementById("callout").getBoundingClientRect();
    const c4 = document.getElementById("c4").getBoundingClientRect(), box = card.getBoundingClientRect();
    clear(svg);
    Object.assign(svg.style, { left: "0", top: "0", width: box.width + "px", height: box.height + "px" });
    svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    // stay right of the comment line so the tail never strikes through it
    const ex = Math.max(hit.right - box.left - 14, c4.right - box.left + 16), ey = hit.bottom - box.top + 6;
    const sx = Math.max(call.right - box.left - 40, ex + 4), sy = call.top - box.top + 2;
    const g = rc(svg);
    svg.appendChild(g.curve([[sx, sy], [sx + 6, (sy + ey) / 2 + 12], [ex + 4, ey + 16], [ex, ey]], { stroke: C.pinkInk, strokeWidth: 2.6, roughness: 1, seed: 5 }));
    svg.appendChild(g.linearPath([[ex - 11, ey + 9], [ex, ey], [ex + 11, ey + 10]], { stroke: C.pinkInk, strokeWidth: 2.6, roughness: 0.8, seed: 6 }));
  }

  // ---------- numbers: every figure on the page comes from the pipeline ----------
  function fillNumbers(m, x) {
    const byName = Object.fromEntries(m.results.map((r) => [r.model, r]));
    const rule = byName["One-line rule: amount == origin balance"];
    const served = byName["LightGBM, signature-free (served)"];
    const leaky = byName["LightGBM, + post-transaction balances"];
    const s = m.signature, sp = m.split;
    const hours = x.feature_sets["+ history + hours since last"];
    const values = {
      "first.pr2": m.first_attempt.pr_auc.toFixed(2),
      "first.pr3": fmt.d3(m.first_attempt.pr_auc),
      "first.trees": m.first_attempt.trees === 1 ? "1 tree" : `${m.first_attempt.trees} trees`,
      "rule.pr": fmt.d3(rule.pr_auc),
      "served.pr": fmt.d3(served.pr_auc),
      "served.recall": fmt.p1(served.recall),
      "served.amount": fmt.p1(served.fraud_amount_caught),
      "leaky.pr": fmt.d3(leaky.pr_auc),
      "sig.fraudPct": fmt.p1(s.fraud_equal / s.fraud),
      "sig.legitM": (s.legit / 1e6).toFixed(2) + " million",
      "sig.legitEqual": s.legit_equal === 0 ? "not once" : s.legit_equal === 1 ? "once" : `${fmt.n(s.legit_equal)} times`,
      "split.train": `${sp.train.steps[0]}–${sp.train.steps[1]}`,
      "split.val": `${sp.val.steps[0]}–${sp.val.steps[1]}`,
      "split.test": `${sp.test.steps[0]}–${sp.test.steps[1]}`,
      "split.trainRate": ((sp.train.fraud / sp.train.rows) * 100).toFixed(2) + "%",
      "split.testRate": ((sp.test.fraud / sp.test.rows) * 100).toFixed(2) + "%",
      "exp.hoursMean": hours.mean.toFixed(3),
      "exp.hoursPsi": x.psi_train_vs_test.dest_hours_since_last.toFixed(2),
    };
    document.querySelectorAll("[data-v]").forEach((n) => {
      const v = values[n.dataset.v];
      if (v !== undefined) n.textContent = v;
    });

    const rows = [
      ["PaySim built-in rule (transfer > 200k)", "PaySim's built-in rule (transfer &gt; 200k)", ""],
      ["One-line rule: amount == origin balance", "One line: <code>amount == oldbalanceOrg</code>", "shortcut"],
      ["LightGBM, all pre-transaction features", "LightGBM, all pre-transaction features", ""],
      ["LightGBM, + post-transaction balances", "LightGBM, + post-transaction balances", ""],
      ["Logistic regression, signature-free", "Logistic regression, signature-free", ""],
      ["LightGBM, signature-free (served)", "LightGBM, signature-free (served)", "served"],
    ];
    document.getElementById("results-body").innerHTML = rows.map(([key, label, cls]) => {
      const r = byName[key];
      return `<tr class="${cls}"><td>${label}</td><td class="num" data-label="PR-AUC">${fmt.d3(r.pr_auc)}</td>` +
        `<td class="num" data-label="Alerts">${fmt.n(r.alerts)}</td><td class="num" data-label="Precision">${fmt.p1(r.precision)}</td>` +
        `<td class="num" data-label="Recall">${fmt.p1(r.recall)}</td><td class="num" data-label="Fraud money caught">${fmt.p1(r.fraud_amount_caught)}</td></tr>`;
    }).join("");
  }

  // ---------- chart: volume per day ----------
  function volumeChart(m) {
    const svg = document.getElementById("volume-chart"), W = widthOf(svg), small = W < 600;
    const H = small ? 380 : 420, L = small ? 52 : 70, R = 16, gap = 34;
    clear(svg); svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const days = m.volume_by_day, n = days.length, bw = (W - L - R) / n;
    const topH = (H - 88 - gap) * 0.62, botH = (H - 88 - gap) * 0.38, top0 = 46, bot0 = top0 + topH + gap;
    const maxL = Math.max(...days.map((d) => d.legit)), maxF = Math.max(...days.map((d) => d.fraud));
    const g = rc(svg);
    // the time split, as dashed fences
    const sp = m.split, x = (step) => L + (step / 24) * bw;
    [[sp.val.steps[0], "validation", 16], [sp.test.steps[0], "test", 38]].forEach(([s, label, ly], i) => {
      svg.appendChild(g.line(x(s), ly - 14, x(s), bot0 + botH + 4, { stroke: C.soft, strokeWidth: 1.6, strokeLineDash: [6, 6], roughness: 0.6, seed: 90 + i }));
      text(svg, x(s) + 6, ly, label, "lbl");
      if (i === 1) arrow(g, svg, x(s) + 44, ly - 6, x(s) + 78, ly - 6, C.ink, 95);
    });
    text(svg, L + 4, 16, "train", "lbl");
    days.forEach((d, i) => {
      const h1 = (d.legit / maxL) * topH, h2 = (d.fraud / maxF) * botH, bx = L + i * bw + bw * 0.14, w = bw * 0.72;
      if (h1 > 1) svg.appendChild(g.rectangle(bx, top0 + topH - h1, w, h1, { stroke: C.ink, strokeWidth: 1.2, fill: C.grey, fillStyle: "hachure", hachureGap: 5, roughness: 0.9, seed: 100 + i }));
      if (h2 > 1) svg.appendChild(g.rectangle(bx, bot0 + botH - h2, w, h2, { stroke: C.ink, strokeWidth: 1.2, fill: C.soft, fillStyle: "cross-hatch", hachureGap: 4, roughness: 0.9, seed: 200 + i }));
    });
    svg.appendChild(g.line(L, top0 + topH, W - R, top0 + topH, { stroke: C.ink, strokeWidth: 2, roughness: 0.7, seed: 301 }));
    svg.appendChild(g.line(L, bot0 + botH, W - R, bot0 + botH, { stroke: C.ink, strokeWidth: 2, roughness: 0.7, seed: 302 }));
    text(svg, L - 8, top0 + 10, small ? fmt.n(maxL / 1000) + "k" : fmt.n(maxL), "tick", "end");
    text(svg, L - 8, bot0 + 10, fmt.n(maxF), "tick", "end");
    text(svg, L - 8, top0 + topH, "0", "tick", "end");
    text(svg, L - 8, bot0 + botH, "0", "tick", "end");
    text(svg, W - R, top0 + topH - (small ? 34 : 56), "legitimate per day", "lbl", "end");
    text(svg, W - R, bot0 + 2, "fraud per day", "lbl", "end");
    for (let i = 0; i < n; i += small ? 10 : 5) text(svg, L + i * bw + bw / 2, H - 18, `day ${i + 1}`, "tick", "middle");

    // caption from the data itself
    const first = days.slice(0, 14), last = days.slice(-10);
    const avg = (a, k) => a.reduce((s, d) => s + d[k], 0) / a.length;
    document.getElementById("volume-caption").textContent =
      `Legitimate transfers and cash-outs average ${fmt.n(avg(first, "legit"))} a day over the first two weeks and ${fmt.n(avg(last, "legit"))} over the last ten days; ` +
      `fraud stays near ${fmt.n(avg(days, "fraud"))} a day throughout. The dashed fences are how I split the data by time.`;
  }

  // ---------- chart: precision-recall curves ----------
  const CURVES = [
    ["LightGBM, + post-transaction balances", "balances after payment (leak)", C.grey, 2, [7, 6]],
    ["LightGBM, all pre-transaction features", "sees the origin balance", C.grey, 2.4, null],
    ["One-line rule: amount == origin balance", "the one line", C.pink, 3.2, null],
    ["Logistic regression, signature-free", "logistic regression, no shortcut", C.faint, 2, [3, 6]],
    ["LightGBM, signature-free (served)", "served model, no shortcut", C.teal, 4.2, null],
  ];
  function prChart(curves, m) {
    const svg = document.getElementById("pr-chart"), W = widthOf(svg), small = W < 700;
    const plotW = small ? W - 70 : W - 330, H = small ? plotW + 250 : 520, L = 56, T = 20, P = small ? plotW - 10 : 440;
    clear(svg); svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const g = rc(svg), X = (r) => L + r * (plotW - 10), Y = (p) => T + (1 - p) * P;
    svg.appendChild(g.linearPath([[L, T], [L, T + P], [L + plotW - 10, T + P]], { stroke: C.ink, strokeWidth: 2.2, roughness: 0.8, seed: 401 }));
    [0, 0.5, 1].forEach((v) => {
      text(svg, X(v), T + P + 24, v.toFixed(1), "tick", "middle");
      text(svg, L - 10, Y(v) + 5, v.toFixed(1), "tick", "end");
    });
    text(svg, X(0.5), T + P + 50, "recall: share of frauds found", "lbl", "middle");
    text(svg, 16, Y(0.5), "precision", "lbl", "middle", { transform: `rotate(-90 16 ${Y(0.5)})` });
    const byName = Object.fromEntries(m.results.map((r) => [r.model, r]));
    CURVES.forEach(([key, label, color, sw, dash], i) => {
      const c = curves[key];
      const pts = c.recall.map((r, j) => [X(r), Y(c.precision[j])]);
      const opts = { stroke: color, strokeWidth: sw, roughness: 0.7, seed: 410 + i };
      if (dash) opts.strokeLineDash = dash;
      const node = g.linearPath(pts, opts);
      node.classList.add("draw");
      svg.appendChild(node);
      const lx = small ? 20 : L + plotW + 24, ly = small ? T + P + 84 + i * 30 : T + 30 + i * 46;
      svg.appendChild(g.line(lx, ly - 6, lx + 34, ly - 6, { ...opts, seed: 430 + i }));
      const short = { "balances after payment (leak)": "leak: balances after", "sees the origin balance": "sees origin balance",
        "logistic regression, no shortcut": "logistic regression", "served model, no shortcut": "served model" };
      text(svg, lx + 44, ly, `${small ? short[label] || label : label}  ${fmt.d3(byName[key].pr_auc)}`, "lbl", "start", key.includes("served") ? { "font-weight": "700" } : {});
    });
    armDrawOn(svg);
  }

  // ---------- chart: decisions on rolling windows ----------
  function foldsChart(x) {
    const svg = document.getElementById("folds-chart"), W = widthOf(svg), small = W < 700;
    const rows = [
      ...Object.entries(x.feature_sets).map(([k, v]) => ({ k, v, group: "features" })),
      ...Object.entries(x.tuning).map(([k, v]) => ({ k, v, group: "trees" })),
    ];
    const labelW = small ? 0 : 360, rowH = small ? 52 : 38, T = 46, H = T + rows.length * rowH + 52;
    const L = labelW + 20, R = 30, lo = 0.38, hi = 0.5, X = (v) => L + ((v - lo) / (hi - lo)) * (W - L - R);
    clear(svg); svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const g = rc(svg);
    [0.4, 0.44, 0.48].forEach((v, i) => {
      svg.appendChild(g.line(X(v), T - 18, X(v), T + rows.length * rowH - 6, { stroke: C.grey, strokeWidth: 1, roughness: 0.4, seed: 500 + i, strokeLineDash: [3, 6] }));
      text(svg, X(v), T - 24, v.toFixed(2), "tick", "middle");
    });
    text(svg, W - R - 44, H - 12, small ? "avg precision, rolling windows" : "average precision on the rolling windows", "tick", "end");
    arrow(g, svg, W - R - 36, H - 18, W - R, H - 18, C.soft, 590);
    rows.forEach((r, i) => {
      const y = T + i * rowH + (small ? 26 : 12);
      const served = r.k.includes("served") || r.k === "leaves=15, min_child=1000";
      const rejected = r.k.includes("hours since last");
      const color = served ? C.tealInk : rejected ? C.pinkInk : C.ink;
      const label = r.k.replace("leaves=", small ? "" : "trees with ").replace(", min_child=", " leaves, ≥").replace(/(\d+)$/, "$1 rows per leaf")
        .replace(" (served)", "").replace("+ history + hours since last", "+ hours since last paid") +
        (served ? " · kept" : rejected ? " · drifts, rejected" : "");
      text(svg, small ? 4 : labelW, small ? y - 16 : y + 5, label, "tick", small ? "start" : "end", { fill: color, "font-weight": served ? "700" : "400" });
      r.v.fold_ap.forEach((a, j) => svg.appendChild(g.circle(X(a), y, 7, { stroke: color, strokeWidth: 1.4, roughness: 0.6, seed: 520 + i * 5 + j })));
      svg.appendChild(g.line(X(r.v.mean), y - 12, X(r.v.mean), y + 12, { stroke: color, strokeWidth: served ? 5 : 3.4, roughness: 0.5, seed: 560 + i }));
    });
  }

  // ---------- threshold slider ----------
  function slider(m) {
    const sweep = m.review_cost_sweep, input = document.getElementById("cost"), out = document.getElementById("cost-out");
    const readout = document.getElementById("readout"), svg = document.getElementById("cost-chart");
    input.max = String(sweep.length - 1);
    const def = sweep.findIndex((r) => r.review_cost === 10000);
    input.value = String(def >= 0 ? def : Math.floor(sweep.length / 2));
    const art = document.getElementById("range-art");
    const drawKnob = () => {
      const { width: w, height: h } = art.getBoundingClientRect();
      if (!w) return;
      clear(art); art.setAttribute("viewBox", `0 0 ${w} ${h}`);
      const g = rc(art), t = +input.value / +input.max, kx = 17 + t * (w - 34), y = h / 2;
      art.appendChild(g.line(6, y, w - 6, y, { stroke: C.ink, strokeWidth: 2.4, roughness: 1, seed: 640 }));
      art.appendChild(g.line(6, y, kx, y, { stroke: C.ink, strokeWidth: 5, roughness: 0.8, seed: 641 }));
      art.appendChild(g.circle(kx, y, 30, { stroke: C.ink, strokeWidth: 2.4, fill: C.yellow, fillStyle: "solid", roughness: 1, seed: 642 }));
    };
    new ResizeObserver(drawKnob).observe(art);
    const render = () => {
      const r = sweep[+input.value];
      drawKnob();
      out.textContent = fmt.n(r.review_cost);
      input.setAttribute("aria-valuetext", `review cost ${fmt.n(r.review_cost)}`);
      readout.innerHTML = `At a review cost of <b>${fmt.n(r.review_cost)}</b>, I'd send <b>${fmt.n(r.alerts)}</b> transactions to review. ` +
        `<b>${fmt.p1(r.precision)}</b> of them are fraud. Together they catch <b>${fmt.p1(r.recall)}</b> of the frauds and <b>${fmt.p1(r.fraud_amount_caught)}</b> of the stolen money.`;
      const W = widthOf(svg), H = 150, L = W < 600 ? 4 : 190, R = 70;
      clear(svg); svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      const g = rc(svg);
      [["frauds caught", r.recall, 26], ["fraud money caught", r.fraud_amount_caught, 96]].forEach(([label, v, y], i) => {
        const by = W < 600 ? y + 4 : y - 12;
        text(svg, W < 600 ? 4 : L - 14, W < 600 ? y - 14 : y + 8, label, "lbl", W < 600 ? "start" : "end");
        svg.appendChild(g.rectangle(L, by, W - L - R, 26, { stroke: C.ink, strokeWidth: 1.6, roughness: 0.8, seed: 600 + i }));
        if (v > 0) svg.appendChild(g.rectangle(L, by, (W - L - R) * v, 26, { stroke: "none", fill: C.teal, fillStyle: "hachure", hachureGap: 4.5, fillWeight: 2, roughness: 1, seed: 610 + i }));
        text(svg, W - R + 10, by + 20, fmt.p1(v), "lbl");
      });
    };
    input.addEventListener("input", render);
    render();
    return render;
  }

  // ---------- the trick: a field of transactions ----------
  function trick(m) {
    const s = m.signature;
    const fraudHits = Math.round((s.fraud_equal / s.fraud) * 100);
    const legitHits = Math.round((s.legit_equal / s.legit) * 100);
    const fill = (id, hits, seed) => {
      const box = document.getElementById(id);
      box.querySelectorAll("svg.field").forEach((n) => n.remove());
      const svg = el("svg", { class: "field", viewBox: "0 0 400 400", "aria-hidden": "true" }, box), g = rc(svg);
      // scatter the matches so the field doesn't sort itself before you press anything
      const order = Array.from({ length: 100 }, (_, i) => i).sort((a, b) => ((a * 37) % 101) - ((b * 37) % 101));
      const hitSet = new Set(order.slice(0, hits));
      for (let i = 0; i < 100; i++) {
        const cx = 20 + (i % 10) * 40, cy = 20 + Math.floor(i / 10) * 40;
        const dot = el("g", { class: `dot${hitSet.has(i) ? " match" : ""}`, style: `--i:${i}` }, svg);
        const f = g.circle(cx, cy, 25, { stroke: "none", fill: C.pink, fillStyle: "solid", roughness: 1.2, seed: seed + i });
        f.classList.add("fill");
        dot.appendChild(f);
        dot.appendChild(g.circle(cx, cy, 28, { stroke: C.ink, strokeWidth: 1.8, roughness: 1.1, seed: seed + 300 + i }));
      }
    };
    fill("dots-fraud", fraudHits, 1000);
    fill("dots-legit", legitHits, 2000);
    const field = document.getElementById("trickfield"), btn = document.getElementById("apply");
    const tF = document.getElementById("tally-fraud"), tL = document.getElementById("tally-legit");
    btn.addEventListener("click", () => {
      const on = !field.classList.contains("applied");
      field.classList.toggle("applied", on);
      btn.setAttribute("aria-pressed", String(on));
      btn.querySelector("span").textContent = on ? "Undo" : "Apply the line";
      tF.innerHTML = on ? `<b>${fraudHits}</b> of 100 caught by one comparison.` : "Not checked yet.";
      tL.innerHTML = on ? `<b>${legitHits}</b> of 100 flagged. Across all ${(s.legit / 1e6).toFixed(2)} million: ${s.legit_equal === 0 ? "not one" : fmt.n(s.legit_equal)}.` : "Not checked yet.";
    });
  }

  // ---------- live scorer ----------
  function scorer() {
    const form = document.getElementById("score-form"), presets = document.getElementById("presets");
    const face = document.querySelector("#result-face use"), verdict = document.getElementById("verdict");
    const meta = document.getElementById("result-meta"), msg = document.getElementById("result-msg");
    const reasons = document.getElementById("reasons"), btn = document.getElementById("score-btn");
    const setFace = (mood) => face.setAttribute("href", `#m-${mood}`);
    const fill = (tx) => { for (const [k, v] of Object.entries(tx)) form.elements[k].value = v; };
    PRESETS.forEach((p, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = p.label; b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", () => {
        presets.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
        fill(p.tx); form.requestSubmit();
      });
      presets.appendChild(b);
      sketchOutline(b, { seed: 820 + i, width: 1.8 });
      if (i === 0) fill(p.tx);
    });
    form.querySelectorAll("input, select").forEach((field, i) => {
      const box = document.createElement("span");
      box.className = "box";
      field.replaceWith(box);
      box.appendChild(field);
      sketchOutline(box, { seed: 860 + i, width: 1.8, roughness: 0.9 });
    });

    const drawReasons = (rs) => {
      clear(reasons);
      if (!rs.length) return;
      const W = 440, mid = 230, max = Math.max(...rs.map((r) => Math.abs(r.contribution)), 1e-9), g = rc(reasons);
      reasons.setAttribute("viewBox", `0 0 ${W} 170`);
      reasons.appendChild(g.line(mid, 6, mid, 160, { stroke: C.ink, strokeWidth: 1.6, roughness: 0.6, seed: 700 }));
      rs.forEach((r, i) => {
        const y = 14 + i * 50, w = (Math.abs(r.contribution) / max) * 190, up = r.contribution > 0;
        reasons.appendChild(g.rectangle(up ? mid : mid - w, y + 16, w, 18, { stroke: C.ink, strokeWidth: 1.3, fill: up ? C.pink : C.teal, fillStyle: "solid", roughness: 0.8, seed: 710 + i }));
        text(reasons, up ? mid - 8 : mid + 8, y + 11, FEATURE_NAMES[r.feature] || r.feature, "tick", up ? "end" : "start");
        text(reasons, up ? mid + w + 6 : mid - w - 6, y + 30, (up ? "+" : "") + r.contribution.toFixed(2), "tick", up ? "start" : "end");
      });
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const tx = Object.fromEntries(new FormData(form));
      for (const k of Object.keys(tx)) if (k !== "type") tx[k] = Number(tx[k]);
      btn.disabled = true; setFace("curious");
      verdict.className = "verdict"; verdict.textContent = "Scoring…"; meta.textContent = ""; clear(reasons);
      msg.textContent = "";
      const slow = setTimeout(() => { setFace("worried"); msg.textContent = "Waking the model up. Free hosting naps when nobody's around; this takes up to a minute the first time."; }, 2500);
      const ctl = new AbortController(), timeout = setTimeout(() => ctl.abort(), 90000);
      try {
        const res = await fetch(`${API}/score`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tx), signal: ctl.signal });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setFace("worried"); verdict.textContent = "That input doesn't work";
          msg.textContent = (body.detail && body.detail[0] && `${body.detail[0].loc.at(-1)}: ${body.detail[0].msg}.`) || `The model answered ${res.status}.`;
          return;
        }
        msg.textContent = "";
        if (body.score === null) {
          setFace("happy"); verdict.className = "verdict approve"; verdict.textContent = "Approve";
          meta.textContent = "Not scored: PaySim never has fraud in this transaction type.";
          return;
        }
        const review = body.decision === "review";
        setFace(review ? "gotcha" : "happy");
        verdict.className = `verdict ${review ? "review" : "approve"}`;
        verdict.textContent = review ? "Send to review" : "Approve";
        meta.textContent = `score ${body.score.toFixed(4)} · threshold ${body.threshold.toFixed(4)}`;
        msg.textContent = "What pushed it, in log-odds: pink toward review, teal toward approve.";
        drawReasons(body.reasons);
      } catch (err) {
        setFace("worried"); verdict.textContent = "Couldn't reach the model";
        msg.textContent = err.name === "AbortError"
          ? "It didn't wake up within 90 seconds. Try again in a minute."
          : "The request didn't get through. If it was asleep, it's waking now; try again in a minute.";
      } finally {
        clearTimeout(slow); clearTimeout(timeout); btn.disabled = false;
      }
    });
  }

  // ---------- reading position and arrival ----------
  function wayfinding() {
    const links = [...document.querySelectorAll(".toc a")];
    const sections = links.map((a) => document.querySelector(a.getAttribute("href")));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) en.target.classList.add("is-in");
      });
      const current = sections.filter((s) => s.getBoundingClientRect().top < window.innerHeight * 0.4).pop();
      links.forEach((a, i) => a.setAttribute("aria-current", String(sections[i] === current)));
    }, { rootMargin: "0px 0px -30% 0px", threshold: [0, 0.2] });
    sections.forEach((s) => io.observe(s));
    window.addEventListener("scroll", () => {
      const current = sections.filter((s) => s.getBoundingClientRect().top < window.innerHeight * 0.4).pop();
      links.forEach((a, i) => a.setAttribute("aria-current", String(sections[i] === current)));
    }, { passive: true });
    const rail = document.querySelector(".rail"), toggle = document.querySelector(".toc-toggle");
    toggle.addEventListener("click", () => {
      const open = rail.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    links.forEach((a) => a.addEventListener("click", () => { rail.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }));
  }

  // curves draw themselves on when their chapter arrives
  function armDrawOn(svg) {
    if (reduceMotion) return;
    svg.querySelectorAll(".draw path").forEach((p) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = `${len}`;
      p.style.strokeDashoffset = svg.closest(".chapter").classList.contains("is-in") ? "0" : `${len}`;
    });
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      svg.querySelectorAll(".draw path").forEach((p) => { p.style.strokeDashoffset = "0"; });
      io.disconnect();
    }), { threshold: 0.35 });
    io.observe(svg);
  }

  // ---------- boot ----------
  wayfinding();
  scorer();
  heroArrow();
  new ResizeObserver(heroArrow).observe(document.querySelector(".reveal-card"));
  document.fonts && document.fonts.ready.then(heroArrow);

  Promise.all(["metrics", "curves", "experiments"].map((f) => fetch(`data/${f}.json`).then((r) => {
    if (!r.ok) throw new Error(f);
    return r.json();
  }))).then(([m, curves, x]) => {
    fillNumbers(m, x);
    trick(m);
    const charts = () => { volumeChart(m); prChart(curves, m); foldsChart(x); };
    charts();
    const redrawSlider = slider(m);
    let w = window.innerWidth, t;
    window.addEventListener("resize", () => {
      if (window.innerWidth === w) return;
      w = window.innerWidth; clearTimeout(t);
      t = setTimeout(() => { charts(); redrawSlider(); }, 150);
    });
  }).catch((err) => {
    console.error(err);
    document.querySelectorAll("figure .chart").forEach((svg) => {
      const f = svg.closest("figure");
      f.insertAdjacentHTML("beforeend", "<p class='msg'>This chart couldn't load its data. The numbers in the text above are the same ones.</p>");
    });
  });
})();
