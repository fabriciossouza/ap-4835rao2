// Configuração compartilhada pelas duas páginas (tela.html e controle.html).
window.CFG = {
  topic: "acolhe-brumado-ta186y3ot9g6",   // "mural" no ntfy.sh — só as duas páginas conhecem
  total: 14,         // slides
  ntfy: "https://ntfy.sh",
  // vários murais: escuta todos, publica no primeiro que aceitar (fallback se um bloquear por cota)
  servers: ["https://ntfy.sh", "https://ntfy.envs.net", "https://ntfy.adminforge.de", "https://ntfy.mzte.de"],
};
