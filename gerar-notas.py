#!/usr/bin/env python3
"""Gera notas.js a partir do roteiro.md (fonte da verdade) + fichinhas em tópicos.

Uso: python3 gerar-notas.py   (rodar de dentro da pasta apresentacao/)
Aborta se algum dos 14 slides não for encontrado no roteiro.
"""
import base64, json, re, sys, pathlib

ROTEIRO = pathlib.Path(__file__).resolve().parent.parent / "roteiro.md"
SAIDA = pathlib.Path(__file__).resolve().parent / "notas.js"

# ---------------------------------------------------------------------------
# Fichinhas: os "beats" de cada slide, pra ler de relance no celular.
# (A fala completa vem do roteiro.md — aqui é só o resumo em tópicos.)
# ---------------------------------------------------------------------------
FICHAS = {
 1: ["Bom dia, obrigado pelo tempo. Sou o Fabrício, moro em Brumado; vim com o Himas.",
     "~20 min: um caminho, do sofá do morador ao consultório do especialista.",
     "No fim, um pedido pequeno — não é contrato, não custa nada hoje."],
 2: ["A foto é de 2019. Mas anota a 1ª data: **2017** — sete anos de fila.",
     "2023: carimbo no cartão, 30 senhas pra 200+ pessoas.",
     "2024: Zera Fila provou que **Brumado consegue zerar** (15 mil consultas, 17 mil proc., R$ 6 mi).",
     "Rodapé: mutirão zera o estoque; o estoque enche de novo. Não muda o caminho.",
     "→ **passar a bola pro Himas** (a fila por dentro, a ideia de marcação online).",
     "Fecho: Policlínica atende 16 cidades, mas só recebe quem o município agendou. Porta = senha de papel, ~50/dia.",
     "Se ela falar número: perguntar de volta e **anotar** — Central/dia? TFD/dia? sistema atual?"],
 3: ["Semana passada em SP, evento de hospitais (AC Camargo, Santa Casa, InRad).",
     "CIO do AC Camargo: tecnologia não é o problema; a dificuldade é reescrever os processos.",
     "Outro: 'tiramos do papel e botamos na tela, mas continuamos passando pelas mesmas etapas'.",
     "Cima: WhatsApp, IA, app do governo já existem. Baixo: senha, madrugada, carimbo.",
     "A régua de tudo: **mudamos o processo, ou só digitalizamos o problema?**",
     "⚠️ Citação de palestra pública — sem relação com o Acolhe."],
 4: ["Por que agora — três motivos.",
     "1) Gestão: continuidade → entra **por cima** do que existe.",
     "2) Morador já está no WhatsApp. Ceará: falta **36% → 22% só com lembrete**.",
     "3) Calendário: **30/09** Anvisa — receituário controlado ganha versão eletrônica.",
     "**26/08 — daqui a 8 dias**: CFM sobre IA. Não proíbe: organiza (IA apoia, médico decide, uso registrado, paciente informado; cobra de quem contrata).",
     "Fecho: chega com ou sem a gente — a diferença é chegar organizada.",
     "⚠️ NÃO dizer 'absoluta' · NÃO '40% das vagas' (é falta 36→22, lembrete) · NÃO '100% eletrônica' (papel continua valendo)."],
 5: ["Antes de propor: o que vocês já têm — é muito.",
     "70 mil moradores · hospital referência p/ 20+ municípios, PS novo vindo.",
     "**Doze UBS reformadas e uma nova** · CAPS AD · LACEN · TFD ampliado · 13 especialidades (uro com cirurgia).",
     "Policlínica Regional a poucas quadras, 16 cidades.",
     "**Não falta serviço** — falta o fio que liga tudo na mão do morador.",
     "Entra por cima: nem e-SUS nem o da Policlínica são desligados.",
     "⚠️ Tela diz '13 UBS revitalizadas' → você diz 12 + 1 nova."],
 6: ["O slide que mais dói: o paciente que **já venceu** a fila.",
     "Médico pede exame → papel na mão → volta pra Central → fim da fila de novo.",
     "Direita (**a construir**): pedido cai direto na fila da Central, data volta pro celular. Sem 2ª viagem.",
     "Pro seu lado: hoje cada etapa é registro solto — ninguém segue o mesmo paciente do começo ao fim.",
     "Integrado: entrou → encaminhado → esperou X dias → compareceu/faltou. Espera real, taxa de falta, vagas recuperadas — número em vez de impressão.",
     "🔜 dizer: 'esse lado direito é o que a gente constrói junto; hoje não existe.'"],
 7: ["Slide técnico, rápido. Hoje: posto, exame e hospital em caixas separadas → paciente repete a história, exame refeito.",
     "Padrão aberto do Ministério: **FHIR** = 'idioma comum' pros sistemas conversarem.",
     "Frase mais honesta do deck: **sem dado organizado, IA não tem o que aprender**.",
     "Todo mundo quer falar de IA; ninguém quer arrumar o dado. É a parte chata que sustenta o resto — inclusive prestar contas.",
     "⚠️ É **RNDS** (Rede Nacional de Dados em Saúde), não 'RDS'. Não prometer integração com data — 'quando a porta técnica abrir, a gente conecta'."],
 8: ["Lado do morador: uma porta só. Entra com código no WhatsApp — ninguém decora senha.",
     "**Controle familiar**: uma conta cuida da mãe idosa e do filho — quem cuida da família costuma ser uma pessoa só.",
     "**Ser claro:** já roda = histórico, chat de triagem, mapa das unidades, plano de cuidado. A construir = check-in por QR, autorização de exame integrada.",
     "'Meu SUS Digital já não faz isso?' — agenda UBS, e bem. Não faz triagem antes, acompanhamento depois, nem conversa com o **seu** hospital.",
     "⚠️ A tela do celular é **ilustração do conceito** (está em inglês) — NUNCA 'print do nosso sistema'. NÃO repetir 'filas em 70%'."],
 9: ["O mapa — coração da apresentação. Sete paradas.",
     "Começa **em casa**: Maria manda mensagem ou **áudio** (pra quem não lê bem).",
     "Triagem faz as perguntas de enfermeira, classifica por cor (Manchester — o mesmo da sua enfermagem). Verde/azul → UBS; amarelo/vermelho → hospital.",
     "Recepção: **o cadastro já está lá**, ninguém redigita. Médico vê a história desde a mensagem. Plano de cuidado volta pro celular.",
     "Rodapé: o que a Maria digitou é o que a recepção vê e o médico abre. Uma jornada, um cadastro.",
     "✅ 'Isso **está construído**.' Não trouxe pra clicar de propósito — demonstração é com quem opera, na visita do comitê."],
 10: ["A resposta pra foto do começo. Três coisas.",
      "1) **Hora marcada** — igual à Receita Federal — pros serviços presenciais (cartão SUS, retirada de exame, cirurgia). Ninguém dorme na calçada.",
      "2) Pedido do médico **nasce digital**, cai na fila da Central com prioridade clínica. Sem papel, sem carimbo, sem 2ª viagem.",
      "3) Dia e hora no WhatsApp, lembrete, confirma/cancela com um toque — **vaga cancelada volta pra fila sozinha**. Ceará: falta 36→22 só com lembrete.",
      "Gestão: painel — fila por especialidade, espera real (do pedido à consulta), falta por unidade.",
      "🔜 **Bem direto: a construir, não pronto.** O fluxo é de vocês; o jeito errado é chegar com sistema fechado.",
      "⚠️ 'lembrete', não 'confirmação' · NÃO ler 'venda de lugares na fila' · 'quando?' → depois do levantamento, Fase 1, sem chute de prazo."],
 11: ["Parece pequeno; é o que mais economiza deslocamento — e pra zona rural, deslocamento é o custo mais caro.",
      "Exemplo: ressonância (8 h de jejum) + ultrassom de abdome (bexiga cheia, água 2 h antes).",
      "Marcado no balcão, na correria: vira duas viagens — ou exame perdido, preparado pro errado.",
      "Sistema conhece o preparo e monta: ressonância cedo, 2 h de hidratação, ultrassom em seguida. Mesma visita, mesma unidade.",
      "Reduz falta, remarcação e transporte — que aqui quer dizer TFD (próximo slide).",
      "🔜 'as regras de preparo são as dos serviços de vocês.'"],
 12: ["TFD: onde mais escutei detalhe, e onde a solução é mais direta — **cadastro, agenda e relatório**.",
      "Hoje: ~50 de manhã + 20-30 à tarde. Carro, ambulância, ônibus. Sistema 'agenda por cima, pra não fazer manual'.",
      "4 coisas que ele NÃO responde: quantos fazem quimio e quantas vezes/semana · custo do mês por destino · relatório pra bater com nota fiscal (à mão) · **relatório sai pela data do agendamento, não da viagem**.",
      "Proposta: cadastro paciente+acompanhante · veículos, empresas, cidades, casas de apoio · agenda **pela data da viagem** · **comprovante digital** pro ônibus · lembrete véspera · relatórios: custo por destino, por veículo, tratamento contínuo, fechamento por empresa × NF.",
      "→ **passar a bola pro Himas** (detalhe da operação).",
      "⚠️ **Antes que ela pergunte:** 'os números dessa tela são de exemplo — os de verdade vão ser os de vocês.'"],
 13: ["Lado de dentro — o mais construído. Ela é enfermeira: ir nos detalhes, **não correr**.",
      "Recepção puxa cadastro; Manchester em 5 cores; fila no painel de TV. Quem chega pelo WhatsApp já chega classificado.",
      "IA em 3 lugares, decide em nenhum: 1) escriba por voz (médico fala, revisa, assina) 2) hipóteses com **CID conferido contra a tabela do SUS** 3) sugere → médico revisa e salva. É o que o CFM (26/08) exige.",
      "**'E se a IA errar?'** Emergência não passa por ela: dor no peito, falta de ar, desmaio, sangramento, convulsão = **regra fixa**, **ligar 192** e pronto-socorro na hora.",
      "Prescrição já digital; Anvisa 30/09 — adequação **acompanhada** com o fornecedor. PS vai ser reconstruído: fluxo **nasce** digital.",
      "✅ 'É sistema que roda hoje — é a Fase 2.'",
      "⚠️ Tela diz 'vai direto à UPA' → você diz **192 / SAMU + pronto-socorro** · NÃO 'adequação nativa' · painel = dados de demonstração."],
 14: ["Como entra e o que vim pedir.",
      "**Fase 1: Central + TFD** (a construir junto). **Fase 2: hospital** (construído; enfermagem avalia; junto com o PS novo). **Fase 3: acolhimento digital** (WhatsApp + app).",
      "Fase 3 direito: não é canal aberto pra cidade inteira — é acompanhar **os grupos que vocês escolherem** (alta recente, crônico, gestante, oncológico do TFD). **Duas portas.** Quem abre a larga é a senhora.",
      "Ordem é de **prioridade, não de disponibilidade** — o pronto vai por último de propósito; pode antecipar.",
      "**Não vim fechar contrato — nada se compra hoje.** Pedido: **Comitê de Inteligência em Saúde de Brumado**, da Secretaria: coordenador que ela indicar + 1 da Central, 1 do TFD, 1 do hospital, 1 da atenção básica; eu como parceiro técnico. **Permanente.**",
      "Ciclo: ouvir quem opera → desenhar → trazer pra ela → **ela decide** → constrói → mede.",
      "Por quê: Einstein + Embrapii (março): estrutura primeiro, projetos depois, 5 anos. E é a única resposta honesta pra pergunta do começo.",
      "Fecho: a foto é de 2019. Quero a próxima foto da Central sem fila às 5 da manhã. Fico à disposição pro primeiro encontro.",
      "⚠️ Tela diz 'Triagem Digital' → **acolhimento digital, duas portas** · Himas no comitê? → o que combinaram antes."],
}

# Cronogramas (Apêndice A). Metas acumuladas em minutos por slide, por versão.
VERSOES = {
  "25": {"nome": "Cheia · 25 min", "slides": list(range(1, 15)),
         "meta": {1: 0.5, 2: 2.5, 3: 4, 4: 6, 5: 7.5, 6: 9, 7: 10, 8: 11.5, 9: 13.5, 10: 16, 11: 17.5, 12: 19.5, 13: 22, 14: 25}},
  "12": {"nome": "Enxuta · 12 min", "slides": [2, 3, 5, 9, 10, 12, 14],
         "meta": {2: 2, 3: 3, 5: 4, 9: 6, 10: 8.5, 12: 10, 14: 12}},
  "5":  {"nome": "Emergência · 5 min", "slides": [2, 10, 12, 14],
         "meta": {2: 1, 10: 2.5, 12: 3.5, 14: 5}},
}

# ---------------------------------------------------------------------------
def extrair_slides(texto: str) -> dict:
    """Separa o roteiro por '## SLIDE N — Título' e extrai os blocos de cada um."""
    partes = re.split(r"^## SLIDE (\d+) — (.+?)\s*$", texto, flags=re.M)
    # partes = [antes, n1, titulo1, corpo1, n2, titulo2, corpo2, ...]
    slides = {}
    for i in range(1, len(partes), 3):
        n = int(partes[i]); titulo = partes[i + 1].strip(); corpo = partes[i + 2]
        corpo = corpo.split("\n---", 1)[0]  # até o separador
        slides[n] = {"n": n, "titulo": titulo, **extrair_blocos(corpo)}
    return slides

def bloco(corpo: str, rotulo_regex: str) -> str:
    """Pega o texto de um bloco '**Rótulo:** ...' até o próximo '**Algo:**' ou fim."""
    m = re.search(r"^\*\*" + rotulo_regex + r"[^*]*\*\*:?\s*(.*?)(?=^\*\*[^*\n]+:\*\*|^\*\*\[|^\*\*Fabrício fecha|\Z)", corpo, flags=re.M | re.S)
    return m.group(1).strip() if m else ""

def extrair_blocos(corpo: str) -> dict:
    tela = bloco(corpo, r"Na tela")
    msg = bloco(corpo, r"Mensagem-chave")
    etiq = bloco(corpo, r"✅/🔜")
    # "O que dizer (X min...)": tempo entre parênteses + tudo até o próximo bloco em negrito
    m = re.search(r"^\*\*O que dizer \((.+?)\)[^*]*\*\*(.*?)(?=^\*\*(?:⚠️|Se ela|\[Himas)|^\*\*Fabrício fecha|\Z)", corpo, flags=re.M | re.S)
    tempo, fala = (m.group(1).strip(), m.group(2)) if m else ("", "")
    # slide 2 tem "[Himas complementa]" e "Fabrício fecha:" no meio da fala — juntar tudo
    m2 = re.search(r"^\*\*O que dizer[^\n]*\n(.*?)(?=^\*\*⚠️|^\*\*Se ela|\Z)", corpo, flags=re.M | re.S)
    if m2: fala = m2.group(1)
    fala = "\n".join(l[2:] if l.startswith("> ") else ("" if l.strip() == ">" else l) for l in fala.strip().splitlines()).strip()
    cuidado = bloco(corpo, r"⚠️ Cuidado neste slide")
    pergunta = ""
    mp = re.search(r"^\*\*Se ela perguntar([^*]*)\*\*:?\s*(.*?)(?=^\*\*|\Z)", corpo, flags=re.M | re.S)
    if mp: pergunta = ("**Se ela perguntar" + mp.group(1) + "** " + mp.group(2)).strip()
    return {"tela": tela, "mensagem": msg.strip("*_ "), "etiqueta": etiq, "tempo": tempo,
            "fala": fala, "cuidado": cuidado, "pergunta": pergunta}

def main():
    texto = ROTEIRO.read_text(encoding="utf-8")
    slides = extrair_slides(texto)
    faltando = [n for n in range(1, 15) if n not in slides]
    if faltando:
        sys.exit(f"ERRO: slides não encontrados no roteiro: {faltando}")
    for n in range(1, 15):
        s = slides[n]
        if not s["fala"]:
            sys.exit(f"ERRO: slide {n} sem bloco 'O que dizer'")
        s["ficha"] = FICHAS[n]
    dados = {"slides": [slides[n] for n in range(1, 15)], "versoes": VERSOES,
             "gerado_de": "roteiro.md"}
    js = json.dumps(dados, ensure_ascii=False)
    b64 = base64.b64encode(js.encode("utf-8")).decode("ascii")
    SAIDA.write_text("// gerado por gerar-notas.py a partir de roteiro.md — não editar à mão\n"
                     "window.NOTAS_B64 = " + json.dumps(b64) + ";\n", encoding="utf-8")
    tam = sum(len(s["fala"]) for s in dados["slides"])
    print(f"ok: 14 slides, {tam} caracteres de fala, {SAIDA.stat().st_size // 1024} KB → {SAIDA.name}")
    for s in dados["slides"]:
        print(f"  {s['n']:>2} · {s['titulo'][:48]:<48} · fala {len(s['fala']):>4} · tempo '{s['tempo']}' · cuidado {'sim' if s['cuidado'] else '—'} · pergunta {'sim' if s['pergunta'] else '—'}")

if __name__ == "__main__":
    main()
