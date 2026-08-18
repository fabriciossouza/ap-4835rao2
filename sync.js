// Sincronização celular ⇄ tablet por ntfy (pub/sub por HTTP, sem conta), com
// VÁRIOS servidores: escuta todos e publica no primeiro que aceitar (fallback em 429/erro).
// Mensagens (JSON no corpo):
//   {"n":7,"src":"controle","cid":"x","t":ms}  → trocar pro slide 7
//   {"ack":7,"src":"tela"}                       → tablet aplicou o 7   (cache=no)
// Sem heartbeat: era o que estourava a cota diária por IP do ntfy.sh (17→18/08).
(function () {
  const CFG = window.CFG;
  const SERVERS = CFG.servers || [CFG.ntfy];
  const seen = new Set();
  const conns = {};                       // por servidor: {es, pollTimer, ok}
  let handlers = {}, status = "off";
  const CID = Math.random().toString(36).slice(2, 8);   // identifica esta página (pra ignorar o próprio eco)

  function recompute() {
    const s = Object.values(conns).some(c => c.ok) ? "ok" : (Object.keys(conns).length ? "reconectando" : "off");
    if (s !== status) { status = s; handlers.onStatus && handlers.onStatus(s); }
  }

  function handle(msg) {               // msg = objeto do ntfy {id, time, event, message}
    if (!msg || msg.event !== "message" || !msg.message) return;
    let p; try { p = JSON.parse(msg.message); } catch { return; }
    // dedupe entre servidores: a mesma publicação só existe em UM servidor, mas SSE+poll do
    // mesmo servidor podem repetir → chave = id do servidor + id da msg
    const key = (msg._srv || "") + ":" + msg.id;
    if (seen.has(key)) return;
    seen.add(key); if (seen.size > 800) seen.delete(seen.values().next().value);
    const antiga = (Date.now() / 1000 - (msg.time || 0)) > 10;   // histórico (replay) × ao vivo
    if (typeof p.n === "number") { if (!antiga && p.cid === CID) return;   // meu próprio eco
      handlers.onState && handlers.onState(p.n, p.src, antiga); }
    else if (typeof p.ack === "number") { if (!antiga) handlers.onAck && handlers.onAck(p.ack); }
    else if (p.hb) { if (!antiga) handlers.onHb && handlers.onHb(); }
  }

  async function poll(srv) {
    try {
      const r = await fetch(srv + "/" + CFG.topic + "/json?poll=1&since=12h", { cache: "no-store" });
      if (!r.ok) return false;
      const txt = await r.text();
      // ordena por time pra aplicar o histórico na ordem certa mesmo vindo de servidores diferentes
      const msgs = txt.split("\n").filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      msgs.forEach(m => { m._srv = srv; handle(m); });
      return true;
    } catch { return false; }
  }

  function openStream(srv) {
    const c = conns[srv] || (conns[srv] = { es: null, pollTimer: null, ok: false });
    if (c.es) { try { c.es.close(); } catch {} }
    c.ok = false; recompute();
    const es = new EventSource(srv + "/" + CFG.topic + "/sse?since=12h");
    c.es = es;
    es.onopen = () => { c.ok = true; recompute(); if (c.pollTimer) { clearInterval(c.pollTimer); c.pollTimer = null; } };
    es.onmessage = e => { try { const m = JSON.parse(e.data); m._srv = srv; handle(m); } catch {} };
    es.onerror = () => { c.ok = false; recompute(); if (!c.pollTimer) c.pollTimer = setInterval(() => poll(srv), 5000); };
  }

  async function connect(h) {
    handlers = h || {};
    // histórico: junta o de todos os servidores em ordem de tempo antes de aplicar
    const all = [];
    await Promise.all(SERVERS.map(async srv => {
      try { const r = await fetch(srv + "/" + CFG.topic + "/json?poll=1&since=12h", { cache: "no-store" });
        if (r.ok) (await r.text()).split("\n").filter(Boolean).forEach(l => { try { const m = JSON.parse(l); m._srv = srv; all.push(m); } catch {} });
      } catch {}
    }));
    all.sort((a, b) => (a.time - b.time)).forEach(handle);
    SERVERS.forEach(openStream);
    setInterval(() => SERVERS.forEach(srv => { const c = conns[srv]; if (!c || !c.es || c.es.readyState === 2) openStream(srv); }), 6000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) SERVERS.forEach(srv => { poll(srv); openStream(srv); }); });
    window.addEventListener("online", () => SERVERS.forEach(srv => { poll(srv); openStream(srv); }));
    window.addEventListener("pageshow", () => SERVERS.forEach(poll));
  }

  let preferido = null;                   // último servidor que aceitou — tenta ele primeiro
  async function publish(obj, opts) {
    const q = opts && opts.noCache ? "?cache=no" : "";
    const ordem = preferido ? [preferido, ...SERVERS.filter(x => x !== preferido)] : SERVERS;
    for (const srv of ordem) {            // primeiro que aceitar; 429/erro → próximo
      try {
        const r = await fetch(srv + "/" + CFG.topic + q, { method: "POST", body: JSON.stringify(obj) });
        if (r.ok) { preferido = srv; handlers.onPublish && handlers.onPublish(srv, true); return srv; }
      } catch {}
    }
    preferido = null;
    handlers.onPublish && handlers.onPublish(null, false);
    return null;
  }

  window.Sync = {
    connect,
    sendSlide: (n, src) => publish({ n, src, cid: CID, t: Date.now() }),
    sendAck:   (n)      => publish({ ack: n, src: "tela" }, { noCache: true }),
    sendHb:    ()       => Promise.resolve(null),   // desligado de propósito (cota diária)
    status:    () => status,
    servers:   () => Object.fromEntries(Object.entries(conns).map(([k, v]) => [k, v.ok])),
  };
})();
