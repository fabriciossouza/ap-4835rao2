// Sincronização celular ⇄ tablet por ntfy (pub/sub por HTTP, sem conta), com VÁRIOS servidores.
// v5 (18/08, noite) — depois de o tablet "não acompanhar" no ensaio:
//   • publica em TODOS os servidores em paralelo (timeout 5 s por POST) — chega por qualquer um que esteja vivo no outro lado
//   • vigia de silêncio: o ntfy manda "keepalive" a cada ~45 s; stream calado >100 s é fechado e reaberto (socket morto pelo NAT do 4G)
//   • sem tempestade: reabertura com espera crescente (2→60 s) e quarentena de 90 s pra servidor que respondeu 429
//   • poll de segurança rotativo: a cada 10 s UM servidor é consultado (since=último) — 6 req/min no total, atraso máximo ~10 s se o SSE morreu calado
//   • replay do histórico aplica só o ÚLTIMO estado; depois disso toda mensagem nova é entregue (a página decide se muda/confirma)
//   • acks ficam no cache do servidor (poll também enxerga)
// Mensagens (JSON no corpo):
//   {"n":7,"src":"controle","cid":"x","t":ms}  → trocar pro slide 7 (t = identificador do toque; reenvio = t novo)
//   {"ack":7,"src":"tela","t":ms}               → tablet aplicou/confirmou o 7
(function () {
  const CFG = window.CFG;
  const SERVERS = CFG.servers || [CFG.ntfy];
  const TOPIC = CFG.topic;
  const SILENCIO_MAX = 100000, QUARENTENA = 90000, POLL_CADA = 10000, VIGIA_CADA = 5000, POST_TIMEOUT = 5000;
  const seen = new Set();
  const conns = {};                       // srv → {es, ok, ultimoEvento, falhas, reabrirEm, quarentenaAte}
  let handlers = {}, status = "off", vivosAnt = -1, ultimoTime = 0, replayFeito = false, rot = 0;
  const CID = Math.random().toString(36).slice(2, 8);   // identifica esta página (pra ignorar o próprio eco)
  const agora = () => Date.now();
  const log = (...a) => { try { console.log("[sync]", ...a); } catch {} };
  const since = () => ultimoTime ? String(Math.max(0, ultimoTime - 5)) : "12h";
  const comTimeout = ms => (typeof AbortSignal !== "undefined" && AbortSignal.timeout) ? AbortSignal.timeout(ms) : undefined;

  function conn(srv) { return conns[srv] || (conns[srv] = { es: null, ok: false, ultimoEvento: 0, falhas: 0, reabrirEm: 0, quarentenaAte: 0 }); }
  function estado(srv) { const c = conns[srv]; if (!c) return "off"; if (c.quarentenaAte > agora()) return "quarentena"; return c.ok ? "ok" : "reconectando"; }
  function quarentena(srv, motivo) { const c = conn(srv); c.quarentenaAte = agora() + QUARENTENA; fechar(srv); log(srv, "quarentena 90 s:", motivo); recompute(); }
  function recompute() {
    const vivos = SERVERS.filter(s => estado(s) === "ok").length;
    const s = vivos ? "ok" : (Object.keys(conns).length ? "reconectando" : "off");
    if (s !== status || vivos !== vivosAnt) { status = s; vivosAnt = vivos; handlers.onStatus && handlers.onStatus(s, vivos, SERVERS.length); }
  }

  // --- entrega ---
  function handle(msg, srv, replay) {   // msg = objeto do ntfy {id, time, event, message}
    if (!msg || msg.event !== "message" || !msg.message) return null;
    let p; try { p = JSON.parse(msg.message); } catch { return null; }
    const key = srv + ":" + msg.id;      // a mesma publicação existe em cada servidor com id diferente → dedupe por servidor+id;
    if (seen.has(key)) return null;      // cópias em servidores diferentes chegam com o mesmo "t" → quem decide é a página (uid)
    seen.add(key); if (seen.size > 2000) seen.delete(seen.values().next().value);
    if ((msg.time || 0) > ultimoTime) ultimoTime = msg.time;
    const idade = agora() / 1000 - (msg.time || 0);
    const uid = p.t || msg.id;
    if (typeof p.n === "number") {
      if (p.cid === CID) return { tipo: "eco" };
      if (!replay) handlers.onState && handlers.onState(p.n, p.src, { replay: false, uid, idade });
      return { tipo: "n", n: p.n, src: p.src, uid, time: msg.time || 0 };
    }
    if (typeof p.ack === "number") {
      if (!replay && idade < 60) handlers.onAck && handlers.onAck(p.ack, idade);
      return { tipo: "ack", n: p.ack, time: msg.time || 0, idade };
    }
    return null;
  }

  async function poll(srv, motivo) {
    const c = conn(srv);
    if (c.quarentenaAte > agora()) return false;
    try {
      const r = await fetch(srv + "/" + TOPIC + "/json?poll=1&since=" + since(), { cache: "no-store", signal: comTimeout(8000) });
      if (r.status === 429) { quarentena(srv, "429 no poll"); return false; }
      if (!r.ok) return false;
      const txt = await r.text();
      const msgs = txt.split("\n").filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
                      .sort((a, b) => (a.time || 0) - (b.time || 0));
      let novas = 0; msgs.forEach(m => { if (handle(m, srv, false)) novas++; });
      if (novas) log("poll", srv, motivo || "", "→", novas, "nova(s)");
      return true;
    } catch (e) { return false; }
  }

  // --- streams (SSE) ---
  function fechar(srv) { const c = conn(srv); if (c.es) { try { c.es.close(); } catch {} } c.es = null; c.ok = false; }
  function abrir(srv) {
    const c = conn(srv);
    if (c.quarentenaAte > agora()) return;
    fechar(srv); c.reabrirEm = 0; recompute();
    let es;
    try { es = new EventSource(srv + "/" + TOPIC + "/sse?since=" + since()); } catch { c.falhas++; agendar(srv); return; }
    c.es = es; c.ultimoEvento = agora();
    const marca = () => { c.ultimoEvento = agora(); if (!c.ok) { c.ok = true; c.falhas = 0; recompute(); } };
    es.onopen = marca;
    es.addEventListener("keepalive", marca);   // ntfy manda a cada ~45 s — é o "estou vivo" do servidor
    es.addEventListener("open", marca);        // evento "open" do próprio ntfy (primeiro da stream)
    es.onmessage = e => { marca(); try { handle(JSON.parse(e.data), srv, false); } catch {} };
    es.onerror = () => {                       // 429/5xx → readyState 2 (fechou de vez); queda de rede → o navegador tenta sozinho (readyState 0)
      c.ok = false; recompute();
      if (es.readyState === 2) { c.falhas++; agendar(srv); }
    };
  }
  function agendar(srv) {                      // reabertura com espera crescente: 2, 4, 8, 16, 32, 60, 60… s
    const c = conn(srv);
    const espera = Math.min(60000, 2000 * Math.pow(2, Math.max(0, c.falhas - 1)));
    c.reabrirEm = agora() + espera; log(srv, "fechou; reabre em", Math.round(espera / 1000), "s (falha", c.falhas + ")");
  }
  function vigia() {                            // roda a cada 5 s
    const t = agora();
    SERVERS.forEach(srv => {
      const c = conn(srv);
      if (c.quarentenaAte && c.quarentenaAte <= t && !c.es) { c.quarentenaAte = 0; c.falhas = 0; abrir(srv); return; }
      if (c.quarentenaAte > t) return;
      if (!c.es) { if (!c.reabrirEm || c.reabrirEm <= t) abrir(srv); return; }
      if (c.es.readyState === 2) { if (!c.reabrirEm) { c.falhas++; agendar(srv); } else if (c.reabrirEm <= t) abrir(srv); return; }
      if (c.es.readyState === 1 && t - c.ultimoEvento > SILENCIO_MAX) { log(srv, "calado há", Math.round((t - c.ultimoEvento) / 1000), "s → reabrindo"); c.falhas = 0; abrir(srv); poll(srv, "pós-silêncio"); }
    });
    recompute();
  }
  function pollRotativo() {                     // a cada 10 s, um servidor por vez (todos têm cópia de tudo)
    for (let i = 0; i < SERVERS.length; i++) {
      const srv = SERVERS[rot++ % SERVERS.length];
      if (estado(srv) !== "quarentena") { poll(srv, "rotativo"); return; }
    }
  }
  function acordar(motivo) {                    // rede/visibilidade mudou: reseta esperas e consulta todo mundo
    log("acordar:", motivo);
    SERVERS.forEach(srv => { const c = conn(srv); c.falhas = 0; c.reabrirEm = 0; if (c.quarentenaAte <= agora()) { poll(srv, motivo); if (!c.es || c.es.readyState === 2) abrir(srv); } });   // só reabre o que fechou (0 = ainda conectando: deixa)
  }

  // --- conexão inicial: histórico de todos os servidores → aplica só o último estado ---
  async function connect(h) {
    handlers = h || {};
    const tudo = [];
    await Promise.all(SERVERS.map(async srv => {
      try {
        const r = await fetch(srv + "/" + TOPIC + "/json?poll=1&since=12h", { cache: "no-store", signal: comTimeout(8000) });
        if (r.status === 429) { quarentena(srv, "429 no histórico"); return; }
        if (!r.ok) return;
        (await r.text()).split("\n").filter(Boolean).forEach(l => { try { const m = JSON.parse(l); const x = handle(m, srv, true); if (x) tudo.push(x); } catch {} });
      } catch {}
    }));
    const ultimoN = tudo.filter(x => x.tipo === "n").sort((a, b) => b.time - a.time)[0];
    if (ultimoN) handlers.onState && handlers.onState(ultimoN.n, ultimoN.src, { replay: true, uid: ultimoN.uid, idade: agora() / 1000 - ultimoN.time });
    const ultimoAck = tudo.filter(x => x.tipo === "ack" && x.idade < 60).sort((a, b) => b.time - a.time)[0];
    if (ultimoAck) handlers.onAck && handlers.onAck(ultimoAck.n, ultimoAck.idade);
    replayFeito = true;
    SERVERS.forEach(abrir);
    setInterval(vigia, VIGIA_CADA);
    setInterval(pollRotativo, POLL_CADA);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) acordar("visível"); });
    window.addEventListener("online", () => acordar("online"));
    window.addEventListener("pageshow", () => acordar("pageshow"));
    recompute();
  }

  // --- publicação: todos os servidores em paralelo; sucesso = pelo menos um aceitou ---
  async function publish(obj) {
    const t = agora();
    let alvos = SERVERS.filter(s => conn(s).quarentenaAte <= t);
    if (!alvos.length) alvos = SERVERS;    // todos em quarentena: tenta assim mesmo
    const rs = await Promise.allSettled(alvos.map(async srv => {
      const r = await fetch(srv + "/" + TOPIC, { method: "POST", body: JSON.stringify(obj), signal: comTimeout(POST_TIMEOUT) });
      if (r.status === 429) { quarentena(srv, "429 no POST"); throw new Error("429"); }
      if (!r.ok) throw new Error("HTTP " + r.status);
      return srv;
    }));
    const okSrvs = rs.filter(r => r.status === "fulfilled").map(r => r.value);
    handlers.onPublish && handlers.onPublish(okSrvs, alvos.length);
    if (!okSrvs.length) log("publicação falhou em todos:", rs.map(r => r.reason && r.reason.message));
    return okSrvs.length;
  }

  window.Sync = {
    connect,
    sendSlide: (n, src, t) => publish({ n, src, cid: CID, t: t || agora() }),
    sendAck:   (n)         => publish({ ack: n, src: "tela", t: agora() }),
    sendHb:    ()          => Promise.resolve(0),   // desligado de propósito (cota diária por IP)
    status:    () => status,
    servers:   () => Object.fromEntries(SERVERS.map(s => [s, estado(s)])),
    vivos:     () => SERVERS.filter(s => estado(s) === "ok").length,
    poll:      motivo => acordar(motivo || "manual"),
    cid:       CID,
  };
})();
