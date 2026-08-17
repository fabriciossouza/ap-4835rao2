# Apresentação sincronizada — tablet na mão dela, celular na sua

**Endereços (GitHub Pages):** ver o fim deste arquivo (preenchido na publicação).

## Como funciona

- **`tela.html`** — abre no **tablet**. Mostra o slide em tela cheia. Toque em "iniciar" **antes** de entregar (isso liga tela cheia e impede a tela de apagar).
- **`controle.html`** — abre no **celular**. Botões ‹ › embaixo; o roteiro do slide atual no meio (fichinha em tópicos + "Fala completa" + "⚠️ Cuidado" + "Se ela perguntar" + "Na tela"); cronômetro em cima (toque nele pra iniciar; começa sozinho no primeiro "›"); chips **25 · 12 · 5 min** escolhem a versão — o "›" pula pros slides daquela versão; o botão ⋮⋮ abre a grade pra saltar.
- Os dois conversam por um "mural" público (ntfy.sh, tópico secreto em `config.js`). O celular escreve o número do slide; o tablet lê e responde "recebi" — no celular aparece **✓ tablet no N** e **tablet Xs** (há quantos segundos o tablet deu sinal de vida).

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
| Celular mostra "tablet ?" vermelho | o tablet não deu sinal há mais de 1 min: conferir 4G do tablet; se preciso, recarregar `tela.html` no tablet e tocar "iniciar" de novo (ele volta no slide certo). |
| "mural" âmbar/vermelho no celular | a internet do celular caiu; a página reconecta sozinha quando volta. Enquanto isso, **toque duplo** no tablet (metade direita avança, esquerda volta) — o celular acompanha quando reconectar. |
| Nada funciona | abrir o PDF `Apresentação para Secretaria de Saude v3.pdf` no tablet e passar à mão. O roteiro impresso está na pasta. |

## Regerar as notas do celular

O roteiro do celular vem do `../roteiro.md`. Se editar o roteiro: `python3 gerar-notas.py` (regrava `notas.js`), depois publicar de novo (`git add -A && git commit -m "notas" && git push`).

## Depois da reunião

Apagar o repositório público: `gh repo delete fabriciossouza/<repo> --yes` — o deck e o roteiro não precisam continuar na internet.
