# Apresentação sincronizada — tablet na mão dela, celular na sua

**Endereços (GitHub Pages):** ver o fim deste arquivo. Entrada rápida: **https://fabriciossouza.github.io/ap-4835rao2/**

## Como funciona

- **`tela.html`** — abre no **tablet**. Mostra o slide em tela cheia. Toque em "iniciar" **antes** de entregar (isso liga tela cheia e impede a tela de apagar).
- **`controle.html`** — abre no **celular**. Botões ‹ › embaixo; o roteiro do slide atual no meio (fichinha em tópicos + "Fala completa" + "⚠️ Cuidado" + "Se ela perguntar" + "Na tela"); cronômetro em cima (toque nele pra iniciar; começa sozinho no primeiro "›"); chips **25 · 12 · 5 min** escolhem a versão — o "›" pula pros slides daquela versão; o botão ⋮⋮ abre a grade pra saltar.
- Os dois conversam por um "mural" público (ntfy — **4 servidores**, tópico secreto em `config.js`). O celular escreve o número do slide **em todos os servidores ao mesmo tempo**; o tablet lê por qualquer um e responde "recebi" — no celular aparece **✓ tablet no N** e **tablet Xs** (há quantos segundos o tablet deu sinal de vida). Os 4 pontinhos ao lado de "mural" são os servidores (verde = ouvindo; cinza = em quarentena por 90 s depois de um 429; âmbar = reconectando).
- **Se o tablet não confirmar em 4 s, o celular reenvia sozinho** (de novo aos 10 s e 20 s). Passando de 10 s sem confirmação, aparece uma **faixa vermelha** no topo: *"tablet ainda no X — você está no Y"* com o botão **📡 reenviar**. Enquanto isso, olhe o tablet: se ele estiver certo, ignore; se não, toque duplo nele (metade direita avança) ou toque em reenviar.
- O tablet **escuta desde que a página abre** (não precisa tocar "iniciar" pra receber — o toque só liga tela cheia e o "não apagar"). Se o 4G derrubar a conexão em silêncio, ele percebe em ~100 s e reconecta; e a cada 10 s consulta um dos servidores por garantia — atraso máximo de ~10 s mesmo no pior caso.

## Preparar os aparelhos (noite anterior)

**Os dois:** carregar 100 %; **4G ligado** (não confiar no wi-fi da Secretaria); Não Perturbe; brilho alto; abrir o endereço no Chrome e deixar a aba aberta.

**Tablet (Android):**
1. Configurações → Tela → **Tempo limite da tela: 30 min** (cinto de segurança; a página já pede pra não apagar).
2. Configurações → Segurança → **Fixação de app** (ou "Fixar tela") → ativar.
3. Abrir `tela.html` no Chrome → tocar **"toque para iniciar"** → fica em tela cheia.
4. Botão "Recentes" → ícone do Chrome em cima da miniatura → **Fixar**. Agora ela não sai da página nem apertando "início". *(Pra soltar: segurar Voltar + Recentes juntos.)*
5. Só então entregar.

**Celular (Android):** abrir `controle.html`, tocar uma vez na página (libera o "não apagar"), escolher a versão (25/12/5) e conferir que aparece **✓ tablet no 1** e o pontinho do mural verde.

## Se algo falhar

| Sintoma | O que fazer |
|---|---|
| Celular mostra "tablet ?" vermelho | o tablet não deu sinal há mais de 1 min (normal logo depois de abrir a página — some no primeiro "›"). Se persistir com faixa vermelha: conferir 4G do tablet; se preciso, recarregar `tela.html` no tablet e tocar "iniciar" de novo (ele volta no slide certo). |
| **Faixa vermelha** "tablet ainda no X" | o celular já está reenviando sozinho. Olhe o tablet: certo → ignore (a faixa some quando o "recebi" chegar); errado → toque duplo nele ou 📡 reenviar. |
| Pontinho do ntfy.sh cinza em casa | **cota diária por IP do ntfy.sh (250 mensagens, zera às 21h)** — em casa, Mac + tablet + celular dividem o mesmo IP. Os outros 3 servidores carregam; no 4G da Secretaria cada aparelho tem o seu IP. **No ensaio, não metralhar o botão** (60 requisições de rajada por IP em cada servidor). |
| "mural" âmbar/vermelho no celular | a internet do celular caiu; a página reconecta sozinha quando volta. Enquanto isso, **toque duplo** no tablet (metade direita avança, esquerda volta) — o celular acompanha quando reconectar. |
| Nada funciona | abrir o PDF `Apresentação para Secretaria de Saude v3.pdf` no tablet e passar à mão. O roteiro impresso está na pasta. |

## Regerar as notas do celular

O roteiro do celular vem do `../files/roteiro.md`. Se editar o roteiro: `python3 gerar-notas.py` (regrava `notas.js`), depois publicar de novo (`git add -A && git commit -m "notas" && git push`).

## Depois da reunião

Apagar o repositório público: `gh repo delete fabriciossouza/<repo> --yes` — o deck e o roteiro não precisam continuar na internet.

---

## Endereços publicados (17/08/2026)

- **Entrada (dois botões):** https://fabriciossouza.github.io/ap-4835rao2/
- **Tablet:** https://fabriciossouza.github.io/ap-4835rao2/tela.html
- **Celular:** https://fabriciossouza.github.io/ap-4835rao2/controle.html

Repositório: `fabriciossouza/ap-4835rao2` (público, temporário — apagar depois da reunião).
Testado em 17/08 pelo endereço público: troca de slide confirmada pelo tablet em ~260 ms.
**Atualizado em 18/08 (noite, `?v=5`):** mural reescrito depois de o tablet "não acompanhar" no ensaio — publica nos 4 servidores em paralelo, detecta conexão morta (keepalive), reconexão com espera crescente e quarentena (sem tempestade de requisições), poll de segurança a cada 10 s, reenvio até confirmar + faixa vermelha no celular, tablet escuta desde o carregamento.
**Atualizado em 18/08 (tarde):** slide 9 novo (infográfico "A Jornada do Paciente em Brumado"), roteiro pra quarta 19/08, `?v=4` nos scripts e nas imagens — **recarregar as duas páginas nos aparelhos** (o Pages guarda cache por 10 min).
