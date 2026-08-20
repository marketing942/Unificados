#!/usr/bin/env python3
"""
Gera os brasões que a página consome, a partir dos arquivos em public/originais.

Produz dois conjuntos em public/:

    brasao-<sigla>.webp   o brasão recortado, usado no medalhão fundido
    marca-<sigla>.webp    o mesmo desenho em ouro monocromático, usado como
                          marca d'água de seção no styles.css

Por que existe
--------------
Os brasões chegaram como JPEG com fundo chapado (branco nos três; o da Polícia
Penal é a foto de um distintivo sobre uma base preta oval). JPEG não tem canal
alfa, então esses arquivos não servem para o medalhão fundido da hero: o
retângulo de fundo apareceria por cima do núcleo escuro.

Como o recorte funciona
-----------------------
NÃO é um "remover branco" global — isso furaria o desenho, que tem branco de
verdade dentro (os sabres do CBMPE, o algodão da PCPE). O que se faz é um
flood fill a partir das BORDAS: só o fundo conectado à moldura da imagem vira
transparente, e qualquer branco cercado por desenho fica intacto.

O da Polícia Penal leva uma segunda passada. Depois de tirar o branco, o fundo
já transparente é pintado de preto puro e um novo flood fill escoa dele para
dentro da base preta oval do distintivo, parando no dourado. Assim sobra só a
insígnia, e não uma bolha preta que sumiria no fundo escuro da página.

Uso
---
    python scripts/recortar-brasoes.py

Requer Pillow e numpy:  pip install pillow numpy
"""

import pathlib
import sys

try:
    import numpy as np
    from PIL import Image, ImageDraw, ImageOps
except ImportError:
    sys.exit("Faltam dependências. Instale com: pip install pillow numpy")

RAIZ = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = RAIZ / "public"
# Os arquivos de origem moram numa subpasta: eles não são consumidos pela
# página e não têm por que subir junto com os assets que o navegador baixa.
ORIGINAIS = PUBLIC / "originais"

# Lado máximo do arquivo gerado. O medalhão maior da página tem 244px e mostra
# o brasão a 72% disso — ~175px em CSS, ~525px num aparelho 3x. 600 cobre o
# retina com folga; guardar os 1875px do original do CBMPE seria meio mega de
# download para um desenho que nunca passa de um terço disso.
LADO_MAX = 600

# WebP com alfa em vez de PNG: os brasões são desenhos ricos em cor e em PNG os
# quatro somavam ~1,2 MB, com DOIS deles carregando na hero. Em q90 o conjunto
# cai para ~230 KB sem diferença visível no tamanho em que aparecem. É também o
# formato que os outros projetos do CPPEM já usam.
QUALIDADE = 90

# Cor sentinela do flood fill. Não precisa ser inédita na imagem: o que marca
# o fundo é a COMPARAÇÃO com o original (pixel que mudou = pixel preenchido),
# então um magenta que por acaso exista no desenho não é confundido com fundo.
SENTINELA = (255, 0, 255)

# Extremos da rampa da marca d'água. Batem com --gold-deep e --gold-light do
# styles.css: a marca precisa ser do mesmo ouro do resto.
OURO_ESCURO = (58, 46, 26)
OURO_CLARO = (222, 196, 140)

# ATENÇÃO ao significado do `thresh` do PIL: ele NÃO é por canal. O
# ImageDraw.floodfill compara com a SOMA das diferenças dos três canais, então
# a escala vai de 0 a 765, e um valor "60" equivale a apenas ~20 por canal. Foi
# o que fez a primeira tentativa (thresh 110 na base preta) mal encostar no
# oval do distintivo.
#
# origem, sigla, limiar do branco, limiar da base escura (0 = não tirar)
FONTES = [
    ("cbmpe.jpg", "cbmpe", 60, 0),
    ("pcpe.jpg", "pcpe", 40, 0),
    # 300, e não os 460 tentados antes: a partir de ~400 a passada alcança as
    # tarjas escuras "POLÍCIA" e "PENAL" por dentro do escudo e o parte em
    # pedaços soltos — aí o filtro de ilha guardava só a faixa do meio.
    ("PPPE.jpg", "pppe", 150, 300),
    # Este já vem com alfa; entra só para ser redimensionado e convertido,
    # e para a marca d'água sair do mesmo lugar que as outras.
    ("brasao-pmpe.png", "pmpe", 0, 0),
]


def semear(largura, altura):
    """Pontos de partida do flood fill: os quatro cantos e o meio de cada lado.

    Só os cantos não bastam — se o desenho encostar num deles, aquele canto
    vira semente dentro do desenho e o fill sairia comendo a arte."""
    w, h = largura - 1, altura - 1
    return [
        (0, 0), (w, 0), (0, h), (w, h),
        (w // 2, 0), (w // 2, h), (0, h // 2), (w, h // 2),
    ]


def preencher_das_bordas(im, thresh):
    """Devolve máscara booleana do fundo conectado às bordas."""
    trabalho = im.copy()
    for ponto in semear(*im.size):
        ImageDraw.floodfill(trabalho, ponto, SENTINELA, thresh=thresh)
    return np.any(np.asarray(trabalho) != np.asarray(im), axis=-1)


def maior_ilha(opaco):
    """Mantém só o maior pedaço contíguo de desenho, descartando ilhas soltas.

    Existe por causa da segunda passada do distintivo da Polícia Penal. Entre o
    branco do fundo e o preto da base há uma fronteira de pixels intermediários
    (borrão de JPEG) que não é clara o bastante para a passada do branco nem
    escura o bastante para a do preto — e sobrava como um anel fino de fantasma
    em volta da insígnia.

    Fechar essa faixa aumentando os limiares não serve: o limiar do preto
    precisaria chegar perto do brilho do dourado e passaria a comer a própria
    insígnia. Como o anel é um pedaço SOLTO, descartá-lo por conectividade é
    exato — não depende de acertar limiar nenhum."""
    marca = Image.fromarray(np.where(opaco, 255, 0).astype(np.uint8), "L")
    visto = np.zeros(opaco.shape, dtype=bool)
    melhor, melhor_tam = None, 0

    ys, xs = np.nonzero(opaco)
    for y, x in zip(ys, xs):
        if visto[y, x]:
            continue
        # 128 é só um carimbo de "já visitado": fica entre 0 e 255, então não
        # se confunde nem com fundo nem com desenho ainda não varrido.
        tinta = marca.copy()
        ImageDraw.floodfill(tinta, (int(x), int(y)), 128, thresh=0)
        ilha = np.asarray(tinta) == 128
        visto |= ilha
        tam = int(ilha.sum())
        if tam > melhor_tam:
            melhor, melhor_tam = ilha, tam

    return melhor if melhor is not None else opaco


def recortar_fundo(origem, thresh, thresh_base):
    """Abre o arquivo e devolve RGBA já sem fundo."""
    bruta = Image.open(origem)

    # Arquivo que já chega com alfa não passa por flood fill nenhum: recortar
    # de novo só teria como resultado comer borda boa.
    if bruta.mode in ("RGBA", "LA") or "transparency" in bruta.info:
        return bruta.convert("RGBA")

    im = bruta.convert("RGB")
    fundo = preencher_das_bordas(im, thresh)

    if thresh_base:
        # Segunda passada: o fundo já identificado vira preto puro, e um novo
        # fill escoa dele para dentro da base escura do distintivo, parando no
        # dourado da insígnia.
        arr = np.asarray(im).copy()
        arr[fundo] = 0
        fundo |= preencher_das_bordas(Image.fromarray(arr, "RGB"), thresh_base)
        fundo = ~maior_ilha(~fundo)

    alfa = np.where(fundo, 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([np.asarray(im), alfa]), "RGBA")


def marca_dagua(im):
    """Remapeia a luminância para uma rampa de ouro, preservando o alfa.

    Os brasões oficiais são coloridos (azul, vermelho, verde). Usá-los direto
    como marca d'água de seção jogava manchas de cor no fundo — a única coisa
    fora da paleta na página inteira."""
    alfa = im.getchannel("A")
    lum = ImageOps.grayscale(im.convert("RGB"))
    saida = ImageOps.colorize(lum, black=OURO_ESCURO, white=OURO_CLARO).convert("RGBA")
    saida.putalpha(alfa)
    return saida


def encolher(im):
    if max(im.size) <= LADO_MAX:
        return im
    k = LADO_MAX / max(im.size)
    return im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)


def gravar(im, nome):
    destino = PUBLIC / nome
    im.save(destino, "WEBP", quality=QUALIDADE, method=6)
    return destino.stat().st_size // 1024


def processar(nome_origem, sigla, thresh, thresh_base):
    origem = ORIGINAIS / nome_origem
    if not origem.exists():
        print(f"  ! {origem.relative_to(RAIZ)} não encontrado — pulando")
        return

    im = recortar_fundo(origem, thresh, thresh_base)

    caixa = im.getbbox()             # corta a margem transparente que sobrou
    if caixa:
        im = im.crop(caixa)
    im = encolher(im)

    kb_brasao = gravar(im, f"brasao-{sigla}.webp")
    kb_marca = gravar(marca_dagua(im), f"marca-{sigla}.webp")

    print(f"  {nome_origem:18s} -> brasao-{sigla}.webp  "
          f"{im.size[0]}x{im.size[1]}  {kb_brasao} KB   "
          f"(+ marca-{sigla}.webp {kb_marca} KB)")


def main():
    if not ORIGINAIS.exists():
        sys.exit(f"Pasta não encontrada: {ORIGINAIS}")

    print("Gerando brasões:")
    for args in FONTES:
        processar(*args)
    print("\nConfira o resultado antes de publicar — flood fill é sensível ao\n"
          "limiar, e um brasão novo pode pedir outro valor.")


if __name__ == "__main__":
    main()
