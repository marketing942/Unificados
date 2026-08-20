/* =========================================================
   CPPEM · COMBOS UNIFICADOS — script

   Página de VENDA DIRETA: não há formulário de captura aqui, então não existe
   emissor de Lead neste arquivo. Os cliques de compra empurram um evento
   próprio (`clique_checkout`) para o dataLayer — é telemetria de botão, não
   conversão, e por isso não conflita com a regra de Lead do painel usada nas
   landings de captura.
   ========================================================= */
(function () {
  "use strict";

  /* =========================================================
     CONFIG — os únicos valores que mudam quando a oferta muda
     ========================================================= */
  var CONFIG = {

    /* ─── CHECKOUTS ────────────────────────────────────────
       URLs de pagamento dos dois combos. As chaves casam com o atributo
       data-checkout dos botões no index.html.

       Se alguma URL for esvaziada, o botão correspondente NÃO fica morto: ele
       volta a apontar para o WhatsApp com a mensagem daquele combo. É a rede
       de segurança para o intervalo entre despublicar um checkout e publicar
       o próximo — um CTA que leva a lugar nenhum queima tráfego pago. */
    checkouts: {
      militar: "https://checkout.cppem.com.br/pay/operacao-unificados-militar-pernambuco",  // PMPE + CBMPE
      civil:   "https://checkout.cppem.com.br/pay/operacao-unificados-civil-pernambuco"     // PCPE + PPPE
    },

    /* WhatsApp de atendimento. Mora só aqui: o href do botão flutuante no HTML
       é apenas um destino de segurança para o caso de o JS não rodar. */
    whatsapp: "558173105354",

    pagina: "Combos Unificados"
  };

  /* ---------- ano do rodapé ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* =========================================================
     BRASÕES AUSENTES → SIGLA NO LUGAR

     public/ tem hoje só o brasao-pmpe.png. Os outros três (cbmpe, pcpe, pppe)
     ainda não existem, e um <img> quebrado dentro do medalhão estragaria a
     peça central da página.

     Duas verificações, e as duas são necessárias: o listener de `error` pega
     as imagens que ainda estão carregando, e a checagem de
     `complete && naturalWidth === 0` pega as que JÁ falharam antes deste
     script rodar (ele está no fim do <body>, então isso acontece sempre que a
     imagem responde rápido com 404).

     Quando os PNGs forem adicionados à pasta, nada aqui precisa mudar — as
     imagens simplesmente carregam e a sigla nunca aparece.
     ========================================================= */
  function marcarFallback(img) {
    var alvo = img.closest(".fusao__lado") || img.closest(".vaga__crest");
    if (alvo) alvo.classList.add("is-fallback");
  }

  Array.prototype.forEach.call(
    document.querySelectorAll(".fusao__lado img, .vaga__crest img"),
    function (img) {
      img.addEventListener("error", function () { marcarFallback(img); });
      if (img.complete && img.naturalWidth === 0) marcarFallback(img);
    }
  );

  /* =========================================================
     WHATSAPP — um número, montado num lugar só

     Vale para o botão flutuante e para qualquer link com [data-wa] no meio do
     texto. A mensagem de cada um vem do próprio data-msg, então o atendimento
     já recebe o contexto de onde a pessoa clicou.
     ========================================================= */
  function urlWhats(msg) {
    return "https://wa.me/" + CONFIG.whatsapp +
           (msg ? "?text=" + encodeURIComponent(msg) : "");
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-wa]"), function (el) {
    el.href = urlWhats(el.getAttribute("data-msg") || "");
    el.target = "_blank";
    el.rel = "noopener";
  });

  /* =========================================================
     CHECKOUTS DOS COMBOS
     ========================================================= */
  Array.prototype.forEach.call(document.querySelectorAll("[data-checkout]"), function (btn) {
    var chave   = btn.getAttribute("data-checkout");
    var produto = btn.getAttribute("data-produto") || "";
    var url     = CONFIG.checkouts[chave] || "";

    if (url) {
      /* checkout de verdade: mesma aba, que é o comportamento esperado de um
         fluxo de pagamento */
      btn.href = url;
      btn.removeAttribute("target");
    } else {
      /* ainda sem checkout: o botão vira atendimento, já dizendo qual combo */
      btn.href = urlWhats("Olá! Tenho interesse no " + produto + ". Como faço para garantir minha vaga?");
      btn.target = "_blank";
      btn.rel = "noopener";
    }

    btn.addEventListener("click", function () {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "clique_checkout",
        pagina: CONFIG.pagina,
        produto: produto,
        destino: url ? "checkout" : "whatsapp"
      });
    });
  });

  /* =========================================================
     HEADER STICKY + BARRA DE PROGRESSO + PARALLAX + DOCK
     ========================================================= */
  var header   = document.getElementById("header");
  var progress = document.getElementById("progress");
  var heroBg   = document.getElementById("heroBg");
  var dock     = document.getElementById("dock");
  var ticking  = false;

  function render() {
    var y = window.scrollY;
    if (header) header.classList.toggle("is-stuck", y > 40);

    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    }

    /* A barra fixa do mobile só entra depois da hero — antes disso o próprio
       CTA da dobra já está na tela e ela só atrapalharia. */
    if (dock) dock.classList.toggle("is-on", y > window.innerHeight * 0.85);

    if (!reduced && heroBg && y < window.innerHeight * 1.2) {
      heroBg.style.transform = "translateY(" + (y * 0.16) + "px)";
    }
    ticking = false;
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(render); }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  render();

  /* =========================================================
     REVEAL AO ROLAR (com escalonamento)

     .ficha__item ficou de fora de propósito: a ficha mora na hero e já entra
     pela animação .anim d5 — dois fade-ins no mesmo bloco brigariam.
     ========================================================= */
  var alvos = document.querySelectorAll(
    ".section__head, .card, .vaga, .soma, .combo, .duo__col, " +
    ".faq__item, .medal, .final__inner"
  );
  Array.prototype.forEach.call(alvos, function (el) { el.classList.add("reveal"); });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      var i = 0;
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.style.transitionDelay = (i++ * 80) + "ms";
        e.target.classList.add("is-visible");
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -60px" });
    Array.prototype.forEach.call(alvos, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(alvos, function (el) { el.classList.add("is-visible"); });
  }

  /* =========================================================
     CONTAGEM DOS NÚMEROS DE VAGA

     Só anima o que é número PURO no formato pt-BR ("1.320", "570"). Os
     campos com texto — "700 a 1.320", "+43%", "Em breve", "14K+" — não casam
     com a expressão e ficam parados, que é o certo: animar "+43%" partindo de
     zero contaria uma história errada por meio segundo.
     ========================================================= */
  function formatar(n) {
    return n.toLocaleString("pt-BR");
  }

  function contar(el) {
    var bruto = el.textContent.trim();
    if (!/^\d{1,3}(\.\d{3})*$/.test(bruto)) return;   // não é número puro
    var destino = parseInt(bruto.replace(/\./g, ""), 10);
    if (!destino) return;

    if (reduced) { el.textContent = formatar(destino); return; }

    var dur = 1100, ini = null;
    el.textContent = "0";

    function passo(ts) {
      if (ini === null) ini = ts;
      var p = Math.min((ts - ini) / dur, 1);
      /* easeOutCubic: chega devagar no número final, como um contador de
         painel travando — subir linear parece cronômetro. */
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = formatar(Math.round(destino * e));
      if (p < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  }

  var numeros = document.querySelectorAll(
    ".vaga__num, .combo__vagas b, .soma__parcela b, .soma__total b"
  );

  if ("IntersectionObserver" in window) {
    var ioNum = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        contar(e.target);
        ioNum.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    Array.prototype.forEach.call(numeros, function (el) { ioNum.observe(el); });
  }

  /* ---------- brilho seguindo o cursor nos cards ---------- */
  Array.prototype.forEach.call(document.querySelectorAll(".card"), function (card) {
    card.addEventListener("mousemove", function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
      card.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
    });
  });

  /* =========================================================
     BRASAS — atmosfera da página inteira

     Cada brasa é um <i> com quatro variáveis CSS (posição, tamanho, cor,
     ritmo). A animação em si mora no styles.css e só mexe em transform e
     opacity, que o compositor resolve sozinho — nenhuma delas causa layout.

     Duas faixas de cor: a maioria em ouro, uma minoria em brasa quente. Todas
     do mesmo tom deixava a camada chapada; alternando, ela ganha a variação
     de temperatura que uma fagulha de verdade tem.
     ========================================================= */
  var brasas = document.getElementById("brasas");
  if (brasas && !reduced) {
    var TONS = [
      "rgba(201,174,122,.9)",   // ouro claro
      "rgba(175,146,86,.85)",   // ouro
      "rgba(196,112,63,.85)"    // brasa quente
    ];

    for (var b = 0; b < 22; b++) {
      var br = document.createElement("i");
      br.className = "brasa";
      br.style.setProperty("--x", (Math.random() * 100).toFixed(2) + "%");
      br.style.setProperty("--s", (2 + Math.random() * 3).toFixed(1) + "px");
      /* o tom quente entra em cerca de um terço delas */
      br.style.setProperty("--cor", TONS[Math.random() < .34 ? 2 : (Math.random() < .5 ? 0 : 1)]);
      br.style.setProperty("--op", (.35 + Math.random() * .45).toFixed(2));
      br.style.setProperty("--dur", (13 + Math.random() * 13).toFixed(1) + "s");
      /* atraso negativo: as brasas já entram no meio do próprio ciclo, então a
         camada aparece povoada no primeiro segundo em vez de começar vazia e
         levar meio minuto para encher. */
      br.style.setProperty("--atraso", "-" + (Math.random() * 26).toFixed(1) + "s");
      brasas.appendChild(br);
    }
  }

  /* ---------- faíscas douradas na hero ---------- */
  var sparks = document.getElementById("sparks");
  if (sparks && !reduced) {
    for (var s = 0; s < 16; s++) {
      var i = document.createElement("i");
      i.className = "spark";
      i.style.left = (Math.random() * 100) + "%";
      i.style.bottom = (Math.random() * 40) + "%";
      i.style.animationDuration = (7 + Math.random() * 7) + "s";
      i.style.animationDelay = (Math.random() * 8) + "s";
      sparks.appendChild(i);
    }
  }

})();
