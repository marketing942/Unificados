# CPPEM · Combos Unificados

Landing de venda dos dois combos de preparação:

| Combo | Concursos | Vagas autorizadas | Checkout |
|---|---|---|---|
| **I · Militar** | PMPE + CBMPE | 1.890 | `.../pay/operacao-unificados-militar-pernambuco` |
| **II · Civil e Penal** | PCPE + PPPE | 2.015 | `.../pay/operacao-unificados-civil-pernambuco` |

Página estática: `index.html` + `styles.css` + `script.js`, no mesmo sistema
visual da Operação Alvorada (Oxanium + Rajdhani, ouro `#AF9256` sobre preto
`#0A0A0B`, cantos chanfrados).

---

## ⚠️ Pendências antes de publicar

### Domínio e imagem de compartilhamento

- `<link rel="canonical">` e `og:url` estão em `https://combos.cppem.com.br/`.
  Confirme o domínio final — os dois precisam apontar para o **mesmo** endereço.
- Falta gerar `public/og-combos.jpg` em **1200×630**. Sem ele, o preview no
  WhatsApp e no Instagram sai sem imagem.

---

## Preço

**12x R$ 61 sem juros · R$ 637 à vista**, contra um total estimado de
R$ 5.038,80 se os itens fossem comprados soltos.

Os dois combos usam o mesmo preço e a mesma tabela de itens — o que muda entre
eles são as corporações, não os entregáveis.

O preço aparece em **quatro lugares**, e todos precisam andar juntos:

| Onde | O quê |
|---|---|
| `index.html` · `<div class="conta">` | a tabela item a item, o total estimado riscado e o valor grande |
| `index.html` · `.combo__precinho` ×2 | a linha curta ao lado de cada botão |
| `index.html` · JSON-LD no `<head>` | `offers.price` — o valor **à vista** (637) |
| `index.html` · `.final__note` e `.dock__info` | a nota do CTA final e a barra fixa do mobile |

No JSON-LD vai o valor à vista de propósito: o Google compara `price` com o que
aparece no checkout, e mandar o valor da parcela faria a marcação divergir da
página.

### O bloco `.conta`

A tabela é **uma só, fora dos cards**, logo abaixo dos dois. Ela era duplicada
dentro de cada card e isso colocava onze linhas idênticas lado a lado — o
visitante lia duas ofertas diferentes onde só existe uma.

É `<table>` de verdade, e não uma lista de divs: são dois eixos de dado
(produto × preço) com cabeçalho, e é o que faz um leitor de tela anunciar
"Produto: Método MDT, Valor de mercado: 12x R$ 28,90" em vez de despejar
fragmentos soltos.

Dentro de cada card sobrou só a linha curta `.combo__precinho`. Ela existe
porque o botão não pode ficar sem preço nenhum ao lado: no empilhamento do
mobile a tabela fica a duas telas de distância do primeiro CTA.

**Se um dia os combos tiverem preços diferentes**, o bloco `.conta` volta para
dentro de cada card — foi assim que ele nasceu, e o commit anterior tem a
versão duplicada.

### A lista de benefícios do card

Cinco itens, não dez. A `.conta` abre o pacote peça por peça logo abaixo; a
lista do card é o resumo. As duas listas têm a **mesma contagem** de propósito:
com os cards lado a lado, uma mais longa que a outra lê como "este combo
entrega mais", e não é o caso — o que muda entre eles são as corporações.

---

## Checkouts

As URLs de pagamento moram em **um lugar só**, no topo do `script.js`:

```js
checkouts: {
  militar: "https://checkout.cppem.com.br/pay/operacao-unificados-militar-pernambuco",
  civil:   "https://checkout.cppem.com.br/pay/operacao-unificados-civil-pernambuco"
}
```

As chaves casam com o `data-checkout` dos botões no HTML. Abrem na **mesma
aba**, que é o comportamento esperado de um fluxo de pagamento.

**Rede de segurança:** se alguma URL for esvaziada, aquele botão *não* fica
morto — volta a apontar para o WhatsApp já dizendo qual combo a pessoa quis. É
para cobrir o intervalo entre despublicar um checkout e publicar o próximo, sem
queimar tráfego pago com um CTA que não leva a lugar nenhum.

---

## Brasões

Os quatro estão prontos, em `public/brasao-<sigla>.webp`, todos **com fundo
transparente**.

### Como foram gerados

Os originais chegaram como JPEG com fundo chapado e vivem em
**`public/originais/`** — eles não são baixados por ninguém, ficam ali só como
fonte. Quem os converte é:

```bash
python scripts/recortar-brasoes.py     # requer: pip install pillow numpy
```

O script produz, para cada sigla, dois arquivos em `public/`:

- `brasao-<sigla>.webp` — o brasão recortado, usado no medalhão fundido
- `marca-<sigla>.webp` — o mesmo desenho em ouro monocromático, usado como
  marca d'água de seção pelo `styles.css`

**Não é um "remover branco" global** — isso furaria o desenho, que tem branco
de verdade dentro (os sabres do CBMPE, o algodão da PCPE). É um flood fill a
partir das bordas: só o fundo conectado à moldura da imagem vira transparente.

O da Polícia Penal é o caso difícil: é a foto de um distintivo sobre uma base
preta oval. Leva uma segunda passada que escoa do fundo para dentro da base
escura e para no dourado, e um filtro de conectividade que descarta o anel de
pixels intermediários que sobrava na fronteira JPEG entre o branco e o preto.
Os comentários no script explicam por que cada limiar é o que é — sobretudo
por que o limiar da base **não** pode passar de ~400 (a partir dali a passada
alcança as tarjas "POLÍCIA"/"PENAL" por dentro do escudo e o parte em pedaços).

### Trocar um brasão

Solte o novo arquivo em `public/originais/`, ajuste a linha correspondente em
`FONTES` no script e rode-o de novo. Confira o resultado: flood fill é sensível
ao limiar, e um brasão novo pode pedir outro valor.

Se algum arquivo deixar de carregar, a página **não** mostra imagem quebrada: o
`script.js` detecta a falha e troca aquela metade pela sigla da corporação, no
mesmo lugar e com o mesmo peso.

### Por que WebP

Em PNG os quatro brasões somavam ~1,2 MB, com **dois deles carregando na
hero**. Em WebP q90 o conjunto cai para ~230 KB sem diferença visível no
tamanho em que aparecem. É também o formato que os outros projetos do CPPEM já
usam.

---

## Como o brasão fundido funciona

É a peça central da página (`.fusao` no `styles.css`) e não existe nos outros
projetos do CPPEM: um medalhão hexagonal partido por uma costura diagonal de
ouro, com metade de um brasão de cada lado.

Quatro detalhes que **não** são estilo pessoal e quebram se mexidos sem cuidado:

1. **O corte diagonal depende do `clip-path` do pai.** `.fusao__core` tem
   `clip-path` hexagonal, e `clip-path` recorta também os descendentes — é isso
   que deixa cada `.fusao__lado` usar o seu próprio corte diagonal sem precisar
   de máscara composta. A tentativa com duas máscaras sobrepostas serrilhava as
   bordas do aro.

2. **Brasão e sigla são ancorados com `left`/`right`, nunca com `transform`.**
   Em `transform`, a porcentagem é da largura *do próprio elemento*. Como os
   quatro brasões têm proporções bem diferentes (o CBMPE é um círculo, os
   outros são escudos verticais), o mesmo valor deslocava cada um de um tanto
   — e nas siglas o deslocamento era de poucos pixels, deixando as duas em cima
   da costura e saindo cortadas ("CBMPE" virava "MPE").

3. **O hexágono tem bico curto (18%/82%, não 25%/75%).** A faixa de largura
   cheia é o que limita o tamanho do brasão; com o bico de um hexágono regular,
   o topo do desenho caía na parte que afunila e a própria moldura decepava o
   "POLÍCIA" dos escudos.

4. **A caixa do brasão é quadrada (62%×62%) com `object-fit: contain`.** É o
   que equaliza as quatro proporções: cada um entra no mesmo quadrado e sobra
   sempre em torno de 60% dele visível de um lado da costura.

O tamanho da sigla e da faísca usa `cqw` (`container-type: inline-size` no
`.fusao`) porque o medalhão aparece em três escalas — hero, card de combo e CTA
final — e em `px` fixo cabia na hero e estourava a cunha no card.

---

## As brasas

A camada `.brasas` (gerada pelo `script.js`) sobe fagulhas pela viewport inteira,
em qualquer altura da página. As faíscas da hero morriam na primeira dobra e o
resto da página ficava seco — preto chapado, sem nada acontecendo entre uma
seção e outra.

Três decisões que importam:

- **`position: fixed`**, não absolute: as brasas não rolam junto, elas sobem
  *através* do conteúdo, como se a página estivesse sobre um braseiro.
- **`z-index: 205`** — acima das seções (que vivem em 2) e logo abaixo do grão
  do body (210). Embaixo não adiantaria: as seções pintam fundo opaco por cima
  e as brasas sumiriam. Navbar, dock e o botão do WhatsApp ficam acima delas,
  para nenhuma faísca passar na frente de um controle.
- **Atraso negativo** em cada brasa, para a camada já nascer povoada em vez de
  levar meio minuto para encher.

A animação só mexe em `transform` e `opacity`, então o compositor resolve
sozinho e nada disso causa layout. Com `prefers-reduced-motion`, o script
simplesmente não cria nenhuma.

O fundo das seções também ganhou dois clarões diagonais muito fracos (quente
pelo alto à direita, dourado embaixo à esquerda). São largos e fracos de
propósito: não se enxerga o degradê, enxerga-se que o fundo tem profundidade.

---

## Testar localmente

O `mask-image` da logo no cabeçalho **não funciona em `file://`** — o Chrome
bloqueia máscaras que apontam para outro arquivo local, e a logo some. Não é
bug: em produção (HTTP) funciona, como nos demais projetos. Para conferir
localmente, sirva por HTTP:

```bash
python -m http.server 8777
# http://localhost:8777/
```

---

## Números das vagas

Todos vêm das autorizações publicadas no Diário Oficial do Estado de
Pernambuco em **julho de 2026**:

| Concurso | Vagas | Distribuição |
|---|---|---|
| PMPE  | 1.320 | 1.250 Soldados · 70 Oficiais |
| CBMPE | 570   | 510 Soldados · 60 Oficiais |
| PCPE  | 1.315 | 1.200 Agentes · 70 Escrivães · 45 Delegados |
| PPPE  | 700   | 700 Policiais Penais |
| **Total** | **3.905** | |

Previsão: editais ainda em 2026, provas no 1º trimestre de 2027, bancas em
contratação.

**Esses números vão mudar quando os editais saírem.** Quando isso acontecer,
procure por `3.905`, `1.890`, `2.015`, `1.320`, `570`, `1.315` e `700` no
`index.html` — eles aparecem na navbar, na hero, na faixa corrida, na seção de
vagas, nos cards de combo, no comparativo, no CTA final e na barra fixa do
mobile.

## Tracking

Container GTM `GTM-PJ379FLQ`, via `sgtm.cppem.com.br` — o mesmo das outras
landings.

Como esta é uma página de **venda direta** e não tem formulário de captura,
**não existe emissor de Lead aqui**. Os cliques de compra empurram um evento
próprio (`clique_checkout`) para o `dataLayer`, com `produto` e `destino`
(`checkout` ou `whatsapp`). É telemetria de botão, não conversão — não conflita
com a regra de Lead do painel usada nas landings de captura.
