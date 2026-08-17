// Sincronização celular ⇄ tablet pelo ntfy.sh (pub/sub por HTTP, sem conta).
// Mensagens (JSON no corpo):
//   {"n":7,"src":"controle"}   → trocar pro slide 7
//   {"ack":7,"src":"tela"}      → tablet aplicou o 7   (cache=no)
//   {"hb":1,"src":"tela"}       → tablet vivo          (cache=no)
// Ordem = ordem de chegada do servidor (ntfy entrega em ordem); duplicatas
// (SSE + poll) são descartadas pelo id da mensagem.
(function () {
  const CFG = window.CFG;
  const base = CFG.ntfy + "/" + CFG.topic;
  const seen = new Set();
  let es = null, pollTimer = null, watchdog = null, handlers = {}, status = "off";
  const CID = Math.random().toString(36).slice(2, 8);   // identifica esta página (pra ignorar o próprio eco)

  function setStatus(s) { if (s !== status) { status = s; handlers.onStatus && handlers.onStatus(s); } }

  function handle(msg) {               // msg = objeto do ntfy {id, time, event, message}
    if (!msg || msg.event !== "message" || !msg.id || seen.has(msg.id)) return;
    seen.add(msg.id); if (seen.size > 500) seen.delete(seen.values().next().value);
    let p; try { p = JSON.parse(msg.message); } catch { return; }
    // "antiga" = veio do histórico (replay) — aplica sem reagir; "recente" = ao vivo
    const antiga = (Date.now() / 1000 - (msg.time || 0)) > 10;
    if (typeof p.n === "number") { if (!antiga && p.cid === CID) return;   // meu próprio eco
      handlers.onState && handlers.onState(p.n, p.src, antiga); }
    else if (typeof p.ack === "number") { if (!antiga) handlers.onAck && handlers.onAck(p.ack); }
    else if (p.hb) { if (!antiga) handlers.onHb && handlers.onHb(); }
  }

  async function poll() {              // pega o histórico recente (só o que ainda não vimos)
    try {
      const r = await fetch(base + "/json?poll=1&since=12h", { cache: "no-store" });
      const txt = await r.text();
      txt.split("\n").filter(Boolean).forEach(l => { try { handle(JSON.parse(l)); } catch {} });
      return true;
    } catch { return false; }
  }

  function openStream() {
    if (es) { try { es.close(); } catch {} }
    setStatus("conectando");
    es = new EventSource(base + "/sse?since=12h");
    es.onopen = () => { setStatus("ok"); if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } };
    es.onmessage = e => { try { handle(JSON.parse(e.data)); } catch {} };
    es.onerror = () => {
      setStatus("reconectando");
      if (!pollTimer) pollTimer = setInterval(poll, 5000);   // enquanto o stream não volta, poll
    };
  }

  function connect(h) {
    handlers = h || {};
    poll().then(() => openStream());
    // se o navegador matou o stream de vez (readyState 2), reabre
    watchdog = setInterval(() => { if (!es || es.readyState === 2) openStream(); }, 6000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) { poll(); openStream(); } });
    window.addEventListener("online", () => { poll(); openStream(); });
    window.addEventListener("pageshow", () => { poll(); });
  }

  async function publish(obj, opts) {
    const q = opts && opts.noCache ? "?cache=no" : "";
    try {
      const r = await fetch(base + q, { method: "POST", body: JSON.stringify(obj) });
      return r.ok;
    } catch { return false; }
  }

  window.Sync = {
    connect,
    sendSlide: (n, src) => publish({ n, src, cid: CID, t: Date.now() }),
    sendAck:   (n)      => publish({ ack: n, src: "tela" }, { noCache: true }),
    sendHb:    ()       => publish({ hb: 1, src: "tela" }, { noCache: true }),
    status:    () => status,
    poll,
  };
})();
