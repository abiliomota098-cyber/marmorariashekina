// ============================================================
//  PRODUÇÃO — quadro de etapas + desenho técnico das peças
//  Desenhos ficam em obra.producao = { folhas: [{ nome, formas }], fotos, obs }
//  Todas as coordenadas do desenho são em centímetros.
// ============================================================
const ETAPAS = Object.keys(STATUS_OBRA);

function garantirProducao(o) {
  o.producao ??= { folhas: [], fotos: [], obs: '' };
  if (!o.producao.folhas.length) o.producao.folhas.push({ id: uid(), nome: 'Folha 1', formas: [] });
  return o.producao;
}
const temDesenho = o => !!o.producao && (o.producao.folhas.some(f => f.formas.length) || o.producao.fotos.length > 0);
const fmtCm = v => String(Math.round(v * 10) / 10).replace('.', ',');
const r1 = v => Math.round(v * 10) / 10;

function medidasTexto(it) {
  const c = +it.comprimento * 100, l = +it.largura * 100, q = +it.quantidade || 1;
  const acab = (it.acabamento ? ` · ${acabTexto(it)}: ${fmtCm(+it.acabMetros * 100)} cm` : '') + (it.cuba ? ` · ${cubaTexto(it)}` : '');
  if (it.unidade === 'm2') return `${fmtCm(c)} × ${fmtCm(l)} cm${q > 1 ? ` · ${q} peças` : ''}${acab}`;
  if (it.unidade === 'ml') return `${fmtCm(c)} cm linear${q > 1 ? ` · ${q}x` : ''}${acab}`;
  return `${q} un${acab}`;
}

// ---------- quadro (kanban) ----------
function renderProducao() {
  const obras = db.orcamentos.filter(o => o.status === 'vendido');
  const etapas = ETAPAS.filter(e => e !== 'instalado' || $('#prod-instaladas').checked);
  $('#kanban').style.setProperty('--cols', etapas.length);
  $('#kanban').innerHTML = etapas.map(et => {
    const lista = obras.filter(o => o.venda.statusObra === et)
      .sort((a, b) => (a.venda.previsaoEntrega || '9999').localeCompare(b.venda.previsaoEntrega || '9999'));
    return `<section class="kan-col kan-${et}">
      <h3>${STATUS_OBRA[et]} <span>${lista.length}</span></h3>
      ${lista.map(cardProducao).join('') || '<p class="kan-vazio">Nenhuma obra</p>'}
    </section>`;
  }).join('');
}

function cardProducao(o) {
  const i = ETAPAS.indexOf(o.venda.statusObra);
  const materiais = [...new Set(o.itens.map(it => it.material).filter(Boolean))].join(', ');
  const atrasada = o.venda.previsaoEntrega && o.venda.previsaoEntrega < hoje() && o.venda.statusObra !== 'instalado';
  const nFotos = o.producao?.fotos.length || 0;
  return `<article class="kan-card" data-id="${o.id}">
    <strong>#${o.numero} · ${esc(o.cliente.nome)}</strong>
    ${materiais ? `<p class="kan-mat">${esc(materiais)}</p>` : ''}
    <p class="kan-info">Entrega: ${fmtData(o.venda.previsaoEntrega)} ${atrasada ? '<span class="badge b-atraso">atrasada</span>' : ''}</p>
    <p class="kan-info">${temDesenho(o) ? '<span class="ok">✓ Desenho</span>' : '<span class="tag-warn">Sem desenho</span>'}${nFotos ? ` · ${nFotos} foto(s)` : ''}</p>
    <div class="kan-acoes">
      <button class="btn-sm" data-acao="desenho">Desenho</button>
      <button class="btn-sm" data-acao="ordem">Ordem de produção</button>
      ${linkMapa(o.cliente) ? `<a class="btn-sm" href="${esc(linkMapa(o.cliente))}" target="_blank" rel="noopener" title="${esc(o.cliente.endereco)}">📍 Mapa</a>` : ''}
      <span class="kan-mover">
        ${i > 0 ? '<button class="btn-sm" data-acao="voltar" title="Voltar etapa">◀</button>' : ''}
        ${i < ETAPAS.length - 1 ? `<button class="btn-sm btn-ok" data-acao="avancar" title="Mover para: ${STATUS_OBRA[ETAPAS[i + 1]]}">▶</button>` : ''}
      </span>
    </div>
  </article>`;
}

$('#kanban').addEventListener('click', async e => {
  const btn = e.target.closest('[data-acao]');
  if (!btn) return;
  const o = buscarOrc(btn.closest('.kan-card').dataset.id);
  const i = ETAPAS.indexOf(o.venda.statusObra);
  switch (btn.dataset.acao) {
    case 'desenho': abrirDesenho(o); break;
    case 'ordem': imprimirOrdem(o); break;
    case 'avancar':
      if (o.venda.statusObra === 'desenho' && !temDesenho(o) &&
          !await confirmar('Ela ainda não tem desenho. Enviar para o corte mesmo assim?', { titulo: `Obra #${o.numero} sem desenho`, ok: 'Enviar para o corte' })) return;
      o.venda.statusObra = ETAPAS[i + 1];
      salvar(); renderProducao();
      toast(`Obra #${o.numero}: ${STATUS_OBRA[o.venda.statusObra]}`);
      break;
    case 'voltar':
      o.venda.statusObra = ETAPAS[i - 1];
      salvar(); renderProducao();
      break;
  }
});
$('#prod-instaladas').addEventListener('change', renderProducao);

// ============================================================
//  DESENHO TÉCNICO
// ============================================================
const AZUL = '#2e5b8a';
let sfx = ''; // sufixo dos ids do SVG (evita conflito quando há vários desenhos na página)

const defsSvg = () => `<defs>
  <marker id="seta${sfx}" viewBox="0 0 10 10" refX="10" refY="5" markerUnits="userSpaceOnUse" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${AZUL}"/></marker>
  <pattern id="hach${sfx}" width="2.2" height="2.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="2.2" stroke="#a07c1c" stroke-width="0.35"/></pattern>
  <pattern id="grade${sfx}" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="#ebe6de" stroke-width="0.3"/></pattern>
  <pattern id="grade50${sfx}" width="50" height="50" patternUnits="userSpaceOnUse"><rect width="50" height="50" fill="url(#grade${sfx})"/><path d="M50 0H0V50" fill="none" stroke="#d6cfc4" stroke-width="0.5"/></pattern>
</defs>`;

function cota(x1, y1, x2, y2, valor) {
  let a = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
  if (a >= 90) a -= 180;
  if (a < -90) a += 180;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${AZUL}" stroke-width="0.4" marker-start="url(#seta${sfx})" marker-end="url(#seta${sfx})"/>` +
    `<text x="${mx}" y="${my}" transform="rotate(${a} ${mx} ${my}) translate(0 -1.8)" font-size="6.5" font-weight="700" text-anchor="middle" fill="${AZUL}">${fmtCm(valor)}</text>`;
}

function svgForma(f) {
  switch (f.t) {
    case 'peca': {
      const { x, y, w, h } = f;
      const o = afastamentos(f), legenda = legendaBordas(f);
      const ct = 10 + o.fundo, ce = 10 + o.esq, base = y + h + o.frente; // cotas afastadas das saias e espelhos
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fillPedra(f)}" stroke="#1d1b19" stroke-width="0.8"/>` +
        bordasAcabamento(f) + desenharEspelhos(f) +
        `<path d="M${x} ${y - o.fundo - 3}V${y - ct - 3}M${x + w} ${y - o.fundo - 3}V${y - ct - 3}M${x - o.esq - 3} ${y}H${x - ce - 3}M${x - o.esq - 3} ${y + h}H${x - ce - 3}" stroke="${AZUL}" stroke-width="0.3"/>` +
        cota(x, y - ct, x + w, y - ct, w) + cota(x - ce, y + h, x - ce, y, h) +
        (rotuloPeca(f) ? `<text x="${x}" y="${base + 8}" font-size="5.5" font-weight="700" fill="#5b554e">${esc(rotuloPeca(f))}</text>` : '') +
        (legenda ? `<text x="${x}" y="${base + (rotuloPeca(f) ? 15 : 8)}" font-size="5" font-weight="700" fill="#a07c1c">${esc(legenda)}</text>` : '') +
        (temEsquadria(f) ? detalheEsquadria(f, x, base + (rotuloPeca(f) ? 15 : 8) + 5) : '');
    }
    case 'recorte':
      return `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="#fff" stroke="#b3412f" stroke-width="0.6" stroke-dasharray="3 2"/>` +
        `<text x="${f.x + f.w / 2}" y="${f.y + f.h / 2}" font-size="${Math.min(6, Math.max(3, f.h / 4))}" text-anchor="middle" dominant-baseline="middle" fill="#b3412f">${f.rotulo ? esc(f.rotulo) + ' ' : ''}${fmtCm(f.w)}×${fmtCm(f.h)}</text>`;
    case 'linha': {
      const len = Math.hypot(f.x2 - f.x1, f.y2 - f.y1);
      return `<line x1="${f.x1}" y1="${f.y1}" x2="${f.x2}" y2="${f.y2}" stroke="#1d1b19" stroke-width="0.8" stroke-linecap="round"/>` +
        (len >= 15 ? textoAoLongo(f, len) : '');
    }
    case 'cota':
      return cota(f.x1, f.y1, f.x2, f.y2, Math.hypot(f.x2 - f.x1, f.y2 - f.y1));
    case 'circulo':
      return `<circle cx="${f.cx}" cy="${f.cy}" r="${f.r}" fill="#fff" stroke="#b3412f" stroke-width="0.6"/>` +
        `<text x="${f.cx + f.r + 2}" y="${f.cy - f.r}" font-size="5" fill="#b3412f">Ø${fmtCm(f.r * 2)}</text>`;
    case 'texto':
      return `<text x="${f.x}" y="${f.y}" font-size="7" fill="#1d1b19">${esc(f.texto)}</text>`;
    case 'livre':
      return `<polyline points="${f.pts.join(' ')}" fill="none" stroke="#1d1b19" stroke-width="0.7" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return '';
}
// borda dourada grossa nos lados com acabamento (vista de cima: frente = embaixo, fundo = em cima)
// acabamento de cada lado da peça: { frente: 'Boleado', esq: 'Meia esquadria', ... }
function bordasDe(f) {
  if (f.bordas) return f.bordas;
  if (f.acab) return Object.fromEntries(f.acab.lados.map(l => [l, f.acab.nome])); // formato antigo
  return {};
}
// largura da saia (meia esquadria) desenhada para fora de cada lado
function saiasDe(f) {
  const b = bordasDe(f), alt = +f.saia || 4;
  return Object.fromEntries(Object.keys(LADOS).map(l => [l, ehEsquadria(b[l]) ? alt : 0]));
}
const temEsquadria = f => Object.values(bordasDe(f)).some(ehEsquadria);
let espDesenho = 2; // espessura da pedra (cm) da folha que está sendo desenhada
const DET_ESCALA = 5; // detalhe do corte desenhado 5x maior
const alturaDetalhe = f => (+f.saia || 4) * DET_ESCALA + 14;

// detalhe ampliado do corte: tampo e saia unidos em 45°
function detalheEsquadria(f, x0, y0) {
  const k = DET_ESCALA, t = espDesenho, s = Math.max(+f.saia || 4, t + 0.5), L = 9;
  const P = (x, y) => `${x0 + x * k},${y0 + 5 + y * k}`;
  const tampo = [P(0, 0), P(L, 0), P(L - t, t), P(0, t)].join(' ');
  const saia = [P(L, 0), P(L, s), P(L - t, s), P(L - t, t)].join(' ');
  const [jx1, jy1] = P(L, 0).split(',').map(Number), [jx2, jy2] = P(L - t, t).split(',').map(Number);
  const [sx, sy0] = P(L, 0).split(',').map(Number), sy1 = y0 + 5 + s * k;
  return `<text x="${x0}" y="${y0 + 2}" font-size="4.5" font-weight="700" fill="#5b554e">Detalhe da meia esquadria (ampliado ${k}x)</text>` +
    `<polygon points="${tampo}" fill="#f1ece2" stroke="#1d1b19" stroke-width="0.4"/>` +
    `<polygon points="${saia}" fill="#f3e6c4" stroke="#1d1b19" stroke-width="0.4"/>` +
    `<line x1="${jx1}" y1="${jy1}" x2="${jx2}" y2="${jy2}" stroke="#b3412f" stroke-width="0.7"/>` +
    `<text x="${jx2 - 2}" y="${jy2 + 6}" font-size="5" font-weight="700" fill="#b3412f" text-anchor="end">corte 45°</text>` +
    `<path d="M${sx + 1.5} ${sy0}H${sx + 5}M${sx + 1.5} ${sy1}H${sx + 5}" stroke="${AZUL}" stroke-width="0.25"/>` +
    cota(sx + 4, sy1, sx + 4, sy0, s) +
    `<text x="${x0 + 1.5}" y="${y0 + 5 + t * k / 2 + 1.6}" font-size="4.5" fill="#5b554e">tampo ${fmtCm(t)} cm</text>`;
}

function legendaBordas(f) {
  const porNome = {};
  Object.entries(bordasDe(f)).forEach(([lado, nome]) => (porNome[nome] ??= []).push(LADOS[lado].nome));
  const porAltura = {};
  Object.entries(f.espelhos || {}).forEach(([lado, alt]) => (porAltura[alt] ??= []).push(LADOS[lado].nome));
  return [
    ...Object.entries(porNome).map(([nome, lados]) =>
      `${nome}${ehEsquadria(nome) ? ` (saia ${fmtCm(+f.saia || 4)} cm)` : ''}: ${lados.join(' + ')}`),
    ...Object.entries(porAltura).map(([alt, lados]) => `Espelho ${fmtCm(+alt)} cm: ${lados.join(' + ')}`),
  ].join(' · ');
}

// ---------- espelhos (peça vertical na parede: frontão/rodabanca) ----------
// quanto cada lado ocupa para fora da peça no desenho (saia + espelho rebatidos)
function afastamentos(f) {
  const s = saiasDe(f), e = f.espelhos || {};
  return Object.fromEntries(Object.keys(LADOS).map(l => [l, s[l] + (+e[l] || 0)]));
}
// espelho desenhado rebatido para fora do lado, com a dobra tracejada
function desenharEspelhos(f) {
  const { x, y, w, h } = f, s = saiasDe(f);
  return Object.entries(f.espelhos || {}).map(([l, alt]) => {
    alt = +alt;
    const [rx, ry, rw, rh] = {
      fundo: [x, y - s.fundo - alt, w, alt], frente: [x, y + h + s.frente, w, alt],
      esq: [x - s.esq - alt, y, alt, h], dir: [x + w + s.dir, y, alt, h],
    }[l];
    const [dx1, dy1, dx2, dy2] = { fundo: [rx, ry + rh, rx + rw, ry + rh], frente: [rx, ry, rx + rw, ry], esq: [rx + rw, ry, rx + rw, ry + rh], dir: [rx, ry, rx, ry + rh] }[l];
    const vertical = l === 'esq' || l === 'dir', cx = rx + rw / 2, cy = ry + rh / 2;
    const fs = Math.min(4.5, Math.max(2.5, alt * 0.4));
    return `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${fillPedra(f)}" stroke="#1d1b19" stroke-width="0.6"/>` +
      `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="#ffffff" fill-opacity="0.6"/>` +
      `<line x1="${dx1}" y1="${dy1}" x2="${dx2}" y2="${dy2}" stroke="${AZUL}" stroke-width="0.5" stroke-dasharray="2 1.5"/>` +
      `<text x="${cx}" y="${cy}" font-size="${fs}" font-weight="700" fill="${AZUL}" text-anchor="middle" dominant-baseline="middle"${vertical ? ` transform="rotate(-90 ${cx} ${cy})"` : ''}>ESPELHO ${fmtCm(alt)} cm</text>`;
  }).join('');
}

// boleado etc.: borda dourada grossa · meia esquadria: saia rebatida para fora com corte a 45° nos cantos
// (vista de cima: frente = embaixo, fundo = em cima)
function bordasAcabamento(f) {
  const { x, y, w, h } = f, b = bordasDe(f), s = saiasDe(f);
  return Object.keys(LADOS).filter(l => b[l]).map(l => {
    if (s[l]) {
      const pts = {
        frente: [[x, y + h], [x + w, y + h], [x + w + s.dir, y + h + s.frente], [x - s.esq, y + h + s.frente]],
        fundo: [[x, y], [x + w, y], [x + w + s.dir, y - s.fundo], [x - s.esq, y - s.fundo]],
        esq: [[x, y], [x, y + h], [x - s.esq, y + h + s.frente], [x - s.esq, y - s.fundo]],
        dir: [[x + w, y], [x + w, y + h], [x + w + s.dir, y + h + s.frente], [x + w + s.dir, y - s.fundo]],
      }[l];
      return `<polygon points="${pts.join(' ')}" fill="#f3e6c4"/><polygon points="${pts.join(' ')}" fill="url(#hach${sfx})" stroke="#a07c1c" stroke-width="0.45" stroke-linejoin="miter"/>`;
    }
    const [x1, y1, x2, y2] = { frente: [x, y + h, x + w, y + h], fundo: [x, y, x + w, y], esq: [x, y, x, y + h], dir: [x + w, y, x + w, y + h] }[l];
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#c49a2c" stroke-width="2.4" stroke-linecap="round"/>`;
  }).join('');
}

// medida discreta ao lado de uma linha (útil para peças em L)
function textoAoLongo(f, len) {
  let a = Math.atan2(f.y2 - f.y1, f.x2 - f.x1) * 180 / Math.PI;
  if (a >= 90) a -= 180;
  if (a < -90) a += 180;
  const mx = (f.x1 + f.x2) / 2, my = (f.y1 + f.y2) / 2;
  return `<text x="${mx}" y="${my}" transform="rotate(${a} ${mx} ${my}) translate(0 -2)" font-size="5" text-anchor="middle" fill="#5b554e">${fmtCm(len)}</text>`;
}

// área clicável maior para linhas finas
function hitForma(f) {
  if (f.t === 'linha' || f.t === 'cota') return `<line class="hit" x1="${f.x1}" y1="${f.y1}" x2="${f.x2}" y2="${f.y2}"/>`;
  if (f.t === 'livre') return `<polyline class="hit" points="${f.pts.join(' ')}"/>`;
  if (f.t === 'circulo') return `<circle class="hit" cx="${f.cx}" cy="${f.cy}" r="${f.r}"/>`;
  return '';
}

function pontosForma(f) {
  switch (f.t) {
    case 'peca': {
      const o = afastamentos(f), linhas = (rotuloPeca(f) ? 1 : 0) + (legendaBordas(f) ? 1 : 0);
      return [[f.x - o.esq, f.y - o.fundo],
        [Math.max(f.x + f.w + o.dir, temEsquadria(f) ? f.x + 50 : 0), f.y + f.h + o.frente + linhas * 7.5 + (temEsquadria(f) ? alturaDetalhe(f) : 0)]];
    }
    case 'recorte': return [[f.x, f.y], [f.x + f.w, f.y + f.h]];
    case 'linha': case 'cota': return [[f.x1, f.y1], [f.x2, f.y2]];
    case 'circulo': return [[f.cx - f.r, f.cy - f.r], [f.cx + f.r, f.cy + f.r]];
    case 'texto': return [[f.x, f.y - 7], [f.x + f.texto.length * 4, f.y]];
    case 'livre': return f.pts;
  }
  return [];
}

// tamanho da folha em cm; no editor tem um mínimo de 6 x 4 m para ter espaço para desenhar
function limitesFolha(formas, minimo = true) {
  let w = minimo ? 600 : 100, h = minimo ? 400 : 50;
  formas.forEach(f => pontosForma(f).forEach(([x, y]) => { w = Math.max(w, x + 40); h = Math.max(h, y + 40); }));
  return { w: Math.ceil(w / 50) * 50, h: Math.ceil(h / 50) * 50 };
}

// desenho final (sem grade), usado na impressão e na imagem PNG
function svgCompleto(folha, titulo = '') {
  sfx = '-' + uid();
  espDesenho = +folha.espessura || 2;
  texUsadas = new Set();
  const { w, h } = limitesFolha(folha.formas, false);
  const topo = titulo ? 22 : 0, x0 = -20, y0 = -20 - topo, W = w + 20, H = h + 20 + topo;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${W} ${H}" width="${W * 3}" height="${H * 3}" font-family="Arial, Helvetica, sans-serif">${defsSvg()}` +
    `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="#fff"/>` +
    (titulo ? `<text x="${x0 + 8}" y="${y0 + 13}" font-size="8" font-weight="700">${esc(titulo)}</text><text x="${x0 + W - 8}" y="${y0 + 13}" font-size="5.5" text-anchor="end" fill="#5b554e">medidas em cm</text>` : '') +
    folha.formas.map(svgForma).join('') + defsTexturas() + '</svg>';
  sfx = '';
  return svg;
}

// ---------- pedra (cor/textura) de cada peça ----------
let texUsadas = new Set();
const cacheTexSvg = {};
const pedraDaPeca = f => (f.material && typeof pedraDoNome === 'function' ? pedraDoNome(f.material) : null);
// foto real da pedra (fotos/<id>.jpg) quando existe; senão a textura ilustrativa.
// A foto vira imagem embutida (data URL) para funcionar também no PNG exportado e no 3D.
const fotosPedra = {};
function urlTexturaPedra(pedra) {
  return fotosPedra[pedra.id] || (cacheTexSvg[pedra.id] ??= texturaPedra(pedra.tex, CATALOGO.indexOf(pedra) * 13 + 1).slice(5, -2));
}
// fotos/lista.json é gerado pelo publicar.ps1 com as fotos existentes (id -> versão)
async function carregarFotosPedras() {
  let lista;
  try { lista = await (await fetch('fotos/lista.json', { cache: 'no-store' })).json(); } catch { return; }
  await Promise.all(Object.entries(lista || {}).map(([id, versao]) => new Promise(ok => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 400; c.height = 300; // mesmo tamanho da textura ilustrativa (escala 70 × 52 cm)
      const k = Math.max(400 / img.width, 300 / img.height), w = img.width * k, h = img.height * k;
      c.getContext('2d').drawImage(img, (400 - w) / 2, (300 - h) / 2, w, h);
      fotosPedra[id] = c.toDataURL('image/jpeg', 0.85);
      ok();
    };
    img.onerror = ok;
    img.src = `fotos/${id}.jpg?v=${encodeURIComponent(versao)}`;
  })));
  if ($('#dlg-desenho').open) { mostrarAmostraPedra(); renderDesenho(); }
}
carregarFotosPedras();
function fillPedra(f) {
  const pedra = pedraDaPeca(f);
  if (!pedra) return '#f1ece2';
  texUsadas.add(pedra.id);
  return `url(#pd-${pedra.id}${sfx})`;
}
// padrões de textura das pedras usadas no desenho (mesma escala do 3D: 70 × 52 cm)
function defsTexturas() {
  return `<defs>${[...texUsadas].map(id => {
    const pedra = CATALOGO.find(c => c.id === id);
    return `<pattern id="pd-${id}${sfx}" patternUnits="userSpaceOnUse" width="70" height="52"><image href="${urlTexturaPedra(pedra)}" width="70" height="52" preserveAspectRatio="none"/></pattern>`;
  }).join('')}</defs>`;
}
// nome da peça + pedra (peças antigas já trazem a pedra no próprio nome)
function rotuloPeca(f) {
  if (!f.material || chaveNome(f.rotulo).includes(chaveNome(f.material))) return f.rotulo || '';
  return [f.rotulo, f.material].filter(Boolean).join(' — ');
}

// lista de pedras para escolher no desenho: tabela de preços + catálogo
function opcoesPedra() {
  const naTabela = new Set(db.precos.map(p => chaveNome(p.nome)));
  return [...db.precos.filter(p => p.unidade === 'm2').map(p => p.nome),
    ...CATALOGO.filter(c => !naTabela.has(chaveNome(c.nome))).map(c => c.nome)];
}
function mostrarAmostraPedra() {
  const pedra = typeof pedraDoNome === 'function' ? pedraDoNome($('#des-pedra').value) : null;
  const amostra = $('#des-pedra-cor');
  amostra.style.backgroundImage = pedra ? `url("${urlTexturaPedra(pedra)}")` : 'none';
  amostra.style.backgroundColor = pedra ? pedra.tex.base : '#f1ece2';
}

// ---------- estado do editor ----------
const des = { obra: null, folha: 0, ferr: 'peca', pilha: [], rascunho: null, arrasto: null, vb: { w: 600, h: 400 } };
const folhaAtual = () => des.obra.producao.folhas[des.folha];
const formas = () => folhaAtual().formas;
const svgDes = $('#des-svg');

const DICAS = {
  mover: 'Arraste para mover (a peça leva junto os recortes de dentro). Duplo clique para editar medidas ou texto.',
  peca: 'Arraste para desenhar uma peça. As cotas aparecem sozinhas — duplo clique (ferramenta Mover) para digitar a medida exata.',
  recorte: 'Arraste dentro da peça para marcar um recorte (cuba, cooktop, tomada...).',
  linha: 'Arraste para desenhar uma linha. Ela trava sozinha na horizontal/vertical.',
  cota: 'Arraste para criar uma cota com a medida.',
  circulo: 'Clique no centro e arraste: furo de torneira, cuba redonda, ralo...',
  texto: 'Clique onde quer escrever (ex.: "borda boleada", "saia 4 cm", "parede").',
  livre: 'Desenho à mão livre.',
  borracha: 'Clique numa forma para apagá-la.',
  borda: 'Escolha o acabamento (e a altura da saia, se for meia esquadria) e clique perto do lado da peça. Clique de novo para tirar.',
  pedra: 'Escolha a pedra no topo e clique numa peça para aplicar. Peças novas já usam a pedra escolhida.',
  espelho: 'Defina a altura e clique perto do lado da peça onde vai o espelho (normalmente o fundo, na parede). Clique de novo para tirar.',
};
const atualizarCampoSaia = () => { $('#des-saia-wrap').hidden = !ehEsquadria($('#des-borda-tipo').value); };

// lado de peça mais próximo do clique (até 12 cm de distância)
function bordaMaisProxima(p) {
  const dist = (x1, y1, x2, y2) => {
    const dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((p.x - x1) * dx + (p.y - y1) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(p.x - (x1 + t * dx), p.y - (y1 + t * dy));
  };
  let melhor = null;
  formas().forEach(f => {
    if (f.t !== 'peca') return;
    const { x, y, w, h } = f;
    Object.entries({ frente: [x, y + h, x + w, y + h], fundo: [x, y, x + w, y], esq: [x, y, x, y + h], dir: [x + w, y, x + w, y + h] })
      .forEach(([lado, seg]) => {
        const d = dist(...seg);
        if (d < 12 && (!melhor || d < melhor.d)) melhor = { f, lado, d };
      });
  });
  return melhor;
}
const statusDes = t => ($('#des-status').textContent = t);

function abrirDesenho(o) {
  des.obra = o; des.folha = 0; des.pilha = [];
  garantirProducao(o);
  $('#des-titulo').textContent = `Desenho — Obra #${o.numero} · ${o.cliente.nome}`;
  $('#des-obs').value = o.producao.obs;
  $('#des-pecas').innerHTML = o.itens.map(it =>
    `<li><strong>${esc(it.descricao) || 'Item'}</strong>${it.material ? `<span>${esc(it.material)}</span>` : ''}<small>${medidasTexto(it)}</small></li>`).join('');
  $('#des-borda-tipo').innerHTML = db.precos.filter(p => p.unidade === 'ml').map(p => `<option>${esc(p.nome)}</option>`).join('') +
    '<option value="">Sem acabamento</option>';
  atualizarCampoSaia();
  const pedraInicial = o.itens.find(it => it.unidade === 'm2' && it.material)?.material || opcoesPedra()[0];
  const pedras = opcoesPedra();
  if (pedraInicial && !pedras.some(n => chaveNome(n) === chaveNome(pedraInicial))) pedras.unshift(pedraInicial);
  $('#des-pedra').innerHTML = pedras.map(n => `<option ${chaveNome(n) === chaveNome(pedraInicial) ? 'selected' : ''}>${esc(n)}</option>`).join('');
  mostrarAmostraPedra();
  renderFotos(); renderFolhas(); escolherFerramenta(des.ferr); renderDesenho();
  $('#dlg-desenho').showModal();
}
$('#dlg-desenho').addEventListener('close', () => { if ($('#producao').hidden === false) renderProducao(); });

function escolherFerramenta(f) {
  des.ferr = f;
  $$('#des-ferramentas [data-ferr]').forEach(b => b.classList.toggle('ativo', b.dataset.ferr === f));
  svgDes.dataset.ferr = f;
  statusDes(DICAS[f]);
}

function renderFolhas() {
  const fs = des.obra.producao.folhas;
  $('#des-folhas').innerHTML = fs.map((f, i) =>
    `<button class="folha-tab ${i === des.folha ? 'ativo' : ''}" data-i="${i}" title="Duplo clique para renomear">${esc(f.nome)}</button>`).join('') +
    '<button class="folha-tab nova" data-nova>+ Folha</button>' +
    (fs.length > 1 ? '<button class="folha-tab excluir" data-excluir>Excluir folha</button>' : '');
}

function renderDesenho() {
  if (!des.rascunho && !des.arrasto) {
    des.vb = limitesFolha(formas());
    svgDes.setAttribute('viewBox', `-30 -30 ${des.vb.w + 30} ${des.vb.h + 30}`);
  }
  const { w, h } = des.vb;
  espDesenho = +folhaAtual().espessura || 2;
  texUsadas = new Set();
  svgDes.innerHTML = defsSvg() +
    `<rect x="-30" y="-30" width="${w + 30}" height="${h + 30}" fill="#fff"/><rect width="${w}" height="${h}" fill="url(#grade50)"/>` +
    formas().map((f, i) => `<g class="forma" data-i="${i}">${svgForma(f)}${hitForma(f)}</g>`).join('') +
    (des.rascunho ? `<g class="rascunho">${svgForma(normalizar(des.rascunho))}</g>` : '') +
    defsTexturas();
}

function guardar() {
  des.pilha.push(JSON.stringify(formas()));
  if (des.pilha.length > 60) des.pilha.shift();
}
function desfazer() {
  if (!des.pilha.length) return;
  folhaAtual().formas = JSON.parse(des.pilha.pop());
  salvar(); renderDesenho();
}
const aplicar = () => { salvar(); renderDesenho(); };

// ---------- interação com o mouse/dedo ----------
function pontoSvg(e) {
  const p = svgDes.createSVGPoint();
  p.x = e.clientX; p.y = e.clientY;
  return p.matrixTransform(svgDes.getScreenCTM().inverse());
}
const snap = v => { const g = $('#des-snap').checked ? 5 : 1; return Math.round(v / g) * g; };

function normalizar(r) {
  if (r.t === 'peca' || r.t === 'recorte')
    return { t: r.t, x: Math.min(r.x0, r.x1), y: Math.min(r.y0, r.y1), w: Math.abs(r.x1 - r.x0), h: Math.abs(r.y1 - r.y0) };
  return r;
}

function moverForma(f, dx, dy) {
  switch (f.t) {
    case 'peca': case 'recorte': case 'texto': f.x += dx; f.y += dy; break;
    case 'linha': case 'cota': f.x1 += dx; f.x2 += dx; f.y1 += dy; f.y2 += dy; break;
    case 'circulo': f.cx += dx; f.cy += dy; break;
    case 'livre': f.pts = f.pts.map(([x, y]) => [x + dx, y + dy]); break;
  }
}

// formas que estão inteiramente dentro de uma peça (andam junto com ela)
function contidas(idx) {
  const p = formas()[idx];
  if (p.t !== 'peca') return [];
  return formas().map((f, i) => i).filter(i => i !== idx && formas()[i].t !== 'peca' &&
    pontosForma(formas()[i]).every(([x, y]) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h));
}

svgDes.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  const p = pontoSvg(e), s = { x: snap(p.x), y: snap(p.y) };
  const alvo = e.target.closest('[data-i]'), idx = alvo ? +alvo.dataset.i : -1;
  switch (des.ferr) {
    case 'borracha':
      if (idx >= 0) { guardar(); formas().splice(idx, 1); aplicar(); }
      return;
    case 'borda': {
      const alvoBorda = bordaMaisProxima(p);
      if (!alvoBorda) return statusDes('Clique mais perto do lado de uma peça.');
      const { f, lado } = alvoBorda, tipo = $('#des-borda-tipo').value, saia = +$('#des-saia').value || 4;
      guardar();
      const b = f.bordas = { ...bordasDe(f) };
      delete f.acab;
      // mesmo acabamento e mesma saia = clique para tirar; saia diferente = só atualiza a altura
      const igual = b[lado] === tipo && (!ehEsquadria(tipo) || +f.saia === saia);
      if (!tipo || igual) delete b[lado]; else b[lado] = tipo;
      if (ehEsquadria(tipo) && !igual) f.saia = saia;
      aplicar();
      return;
    }
    case 'espelho': {
      const alvoLado = bordaMaisProxima(p);
      if (!alvoLado) return statusDes('Clique mais perto do lado de uma peça.');
      const { f, lado } = alvoLado, alt = +$('#des-espelho-alt').value || 10;
      guardar();
      const e = f.espelhos = { ...(f.espelhos || {}) };
      // mesma altura = clique para tirar; altura diferente = atualiza
      if (+e[lado] === alt) delete e[lado]; else e[lado] = alt;
      aplicar();
      return;
    }
    case 'pedra': {
      const ehPeca = idx >= 0 && formas()[idx].t === 'peca';
      const f = ehPeca ? formas()[idx] : formas().find(g => g.t === 'peca' && p.x >= g.x && p.x <= g.x + g.w && p.y >= g.y && p.y <= g.y + g.h);
      if (!f) return statusDes('Clique em cima de uma peça para aplicar a pedra.');
      guardar();
      // tira a pedra antiga do nome (peças antigas tinham "Descrição — Pedra")
      if (f.material && f.rotulo) f.rotulo = f.rotulo.replace(new RegExp(`\\s*—\\s*${f.material.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), '');
      f.material = $('#des-pedra').value;
      aplicar();
      return;
    }
    case 'texto': {
      perguntar('Texto', '', { titulo: 'Adicionar texto', ok: 'Adicionar' }).then(t => {
        if (t && t.trim()) { guardar(); formas().push({ t: 'texto', x: s.x, y: s.y, texto: t.trim() }); aplicar(); }
      });
      return;
    }
    case 'mover': {
      if (idx < 0) return;
      const grupo = [idx, ...contidas(idx)];
      des.arrasto = { ini: s, grupo, orig: grupo.map(i => structuredClone(formas()[i])), antes: JSON.stringify(formas()), mudou: false };
      break;
    }
    case 'livre': des.rascunho = { t: 'livre', pts: [[r1(p.x), r1(p.y)]] }; break;
    case 'peca': case 'recorte': des.rascunho = { t: des.ferr, x0: s.x, y0: s.y, x1: s.x, y1: s.y }; break;
    case 'linha': case 'cota': des.rascunho = { t: des.ferr, x1: s.x, y1: s.y, x2: s.x, y2: s.y }; break;
    case 'circulo': des.rascunho = { t: 'circulo', cx: s.x, cy: s.y, r: 0 }; break;
  }
  svgDes.setPointerCapture(e.pointerId);
});

svgDes.addEventListener('pointermove', e => {
  if (!des.rascunho && !des.arrasto) return;
  const p = pontoSvg(e), s = { x: snap(p.x), y: snap(p.y) };
  const r = des.rascunho;
  if (des.arrasto) {
    const a = des.arrasto, dx = s.x - a.ini.x, dy = s.y - a.ini.y;
    a.grupo.forEach((i, k) => { const f = structuredClone(a.orig[k]); moverForma(f, dx, dy); formas()[i] = f; });
    a.mudou = a.mudou || dx !== 0 || dy !== 0;
  } else if (r.t === 'livre') {
    const [lx, ly] = r.pts.at(-1);
    if (Math.hypot(p.x - lx, p.y - ly) > 1.5) r.pts.push([r1(p.x), r1(p.y)]);
  } else if (r.t === 'peca' || r.t === 'recorte') {
    r.x1 = s.x; r.y1 = s.y;
    const n = normalizar(r);
    statusDes(`${r.t === 'peca' ? 'Peça' : 'Recorte'}: ${fmtCm(n.w)} × ${fmtCm(n.h)} cm`);
  } else if (r.t === 'linha' || r.t === 'cota') {
    let { x, y } = s;
    const dx = x - r.x1, dy = y - r.y1;
    if (Math.abs(dy) < Math.abs(dx) * 0.1) y = r.y1;
    else if (Math.abs(dx) < Math.abs(dy) * 0.1) x = r.x1;
    r.x2 = x; r.y2 = y;
    statusDes(`Comprimento: ${fmtCm(Math.hypot(r.x2 - r.x1, r.y2 - r.y1))} cm`);
  } else if (r.t === 'circulo') {
    r.r = Math.round(Math.hypot(p.x - r.cx, p.y - r.cy) * 2) / 2;
    statusDes(`Diâmetro: ${fmtCm(r.r * 2)} cm`);
  }
  renderDesenho();
});

function terminarArrasto() {
  if (des.arrasto) {
    if (des.arrasto.mudou) { des.pilha.push(des.arrasto.antes); salvar(); }
    des.arrasto = null;
    renderDesenho();
    return;
  }
  const r = des.rascunho;
  if (!r) return;
  des.rascunho = null;
  const f = normalizar(r);
  const valido =
    f.t === 'peca' || f.t === 'recorte' ? f.w >= 1 && f.h >= 1 :
    f.t === 'circulo' ? f.r >= 0.5 :
    f.t === 'livre' ? f.pts.length > 1 :
    Math.hypot(f.x2 - f.x1, f.y2 - f.y1) >= 1;
  if (valido) {
    if (f.t === 'peca') f.material = $('#des-pedra').value;
    guardar(); formas().push(f); salvar();
  }
  statusDes(DICAS[des.ferr]);
  renderDesenho();
}
svgDes.addEventListener('pointerup', terminarArrasto);
svgDes.addEventListener('pointercancel', terminarArrasto);

// duplo clique (ferramenta Mover): digitar medidas exatas
svgDes.addEventListener('dblclick', async e => {
  if (des.ferr !== 'mover') return;
  const alvo = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-i]');
  if (!alvo) return;
  const f = formas()[+alvo.dataset.i];
  const num = v => parseFloat(String(v ?? '').replace(',', '.'));
  if (f.t === 'peca' || f.t === 'recorte') {
    const tituloForma = f.t === 'peca' ? 'Editar peça' : 'Editar recorte';
    const m = await perguntar('Medidas em cm (comprimento x largura)', `${fmtCm(f.w)} x ${fmtCm(f.h)}`, { titulo: tituloForma, ok: 'Próximo' });
    if (m === null) return;
    const [w, h] = m.split(/[x×*]/i).map(num);
    if (!(w > 0 && h > 0)) return avisar('Use o formato: 180 x 60', { titulo: 'Medidas inválidas' });
    guardar(); f.w = w; f.h = h;
    const nome = await perguntar(f.t === 'peca' ? 'Nome da peça (opcional)' : 'Tipo do recorte (ex.: Cuba, Cooktop) — opcional', f.rotulo || '', { titulo: tituloForma, ok: 'Salvar' });
    if (nome !== null) f.rotulo = nome.trim();
    if (f.t === 'peca' && Object.values(bordasDe(f)).some(ehEsquadria)) {
      const saia = num(await perguntar('Altura da saia da meia esquadria (cm)', fmtCm(+f.saia || 4), { titulo: tituloForma, ok: 'Salvar' }));
      if (saia > 0) f.saia = saia;
    }
  } else if (f.t === 'texto') {
    const t = await perguntar('Texto', f.texto, { titulo: 'Editar texto', ok: 'Salvar' });
    if (!t) return;
    guardar(); f.texto = t;
  } else if (f.t === 'circulo') {
    const d = num(await perguntar('Diâmetro em cm', fmtCm(f.r * 2), { titulo: 'Editar círculo', ok: 'Salvar' }));
    if (!(d > 0)) return;
    guardar(); f.r = d / 2;
  } else if (f.t === 'linha' || f.t === 'cota') {
    const len = Math.hypot(f.x2 - f.x1, f.y2 - f.y1);
    const v = num(await perguntar('Comprimento em cm', fmtCm(len), { titulo: f.t === 'cota' ? 'Editar cota' : 'Editar linha', ok: 'Salvar' }));
    if (!(v > 0)) return;
    guardar(); f.x2 = r1(f.x1 + (f.x2 - f.x1) * v / len); f.y2 = r1(f.y1 + (f.y2 - f.y1) * v / len);
  } else return;
  aplicar();
});

// ---------- barra de ferramentas ----------
$('#des-borda-tipo').addEventListener('change', () => { atualizarCampoSaia(); escolherFerramenta('borda'); });
$('#des-saia').addEventListener('focus', () => escolherFerramenta('borda'));
$('#des-espelho-alt').addEventListener('focus', () => escolherFerramenta('espelho'));
$('#des-pedra').addEventListener('change', () => { mostrarAmostraPedra(); escolherFerramenta('pedra'); });
$('#des-ferramentas').addEventListener('click', async e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.ferr) return escolherFerramenta(b.dataset.ferr);
  switch (b.dataset.cmd) {
    case 'desfazer': desfazer(); break;
    case 'limpar':
      if (formas().length && await confirmar('Todo o desenho desta folha será apagado. Dá para desfazer com Ctrl+Z.', { titulo: `Apagar tudo da "${folhaAtual().nome}"?`, ok: 'Apagar tudo', perigo: true })) { guardar(); folhaAtual().formas = []; aplicar(); }
      break;
    case 'gerar': gerarPecas(); break;
  }
});
document.addEventListener('keydown', e => {
  if ($('#dlg-desenho').open && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
    e.preventDefault(); desfazer();
  }
});

// cria automaticamente as peças cobradas por m² no orçamento
async function gerarPecas() {
  const itens = des.obra.itens.filter(it => it.unidade === 'm2' && +it.comprimento > 0 && +it.largura > 0);
  if (!itens.length) return avisar('O orçamento não tem itens cobrados por m² com comprimento e largura.', { titulo: 'Nenhuma peça para criar' });
  if (formas().length && !await confirmar('As peças do orçamento serão adicionadas abaixo do que já está nesta folha.', { titulo: 'Adicionar peças do orçamento?', ok: 'Adicionar' })) return;
  guardar();
  const fundo = formas().reduce((m, f) => Math.max(m, ...pontosForma(f).map(p => p[1])), 0);
  let x = 30, y = formas().length ? fundo + 45 : 30, alturaLinha = 0;
  itens.forEach(it => {
    const w = r1(+it.comprimento * 100), h = r1(+it.largura * 100);
    const bordas = it.acabamento ? Object.fromEntries((it.acabLados || []).map(l => [l, it.acabamento])) : {};
    const saia = ehEsquadria(it.acabamento) ? +it.acabSaia || 4 : 0;
    for (let q = 0; q < Math.max(1, Math.floor(+it.quantidade || 1)); q++) {
      const nova = { t: 'peca', x, y, w, h, rotulo: it.descricao || '', material: it.material || $('#des-pedra').value, bordas: { ...bordas }, ...(saia ? { saia } : {}) };
      // espaço da saia e das cotas à esquerda/em cima
      const margem = () => { const s = saiasDe(nova); nova.x += s.esq; nova.y += s.fundo; };
      if (x > 30 && x + w > 570) { x = 30; y += alturaLinha + 45; alturaLinha = 0; nova.x = x; nova.y = y; }
      margem();
      formas().push(nova);
      const [, [maxX, maxY]] = pontosForma(nova);
      x = maxX + 40;
      alturaLinha = Math.max(alturaLinha, maxY - y);
    }
  });
  aplicar();
  toast('Peças criadas a partir do orçamento. Use "Recorte" para marcar cubas e cooktops.');
}

// ---------- folhas ----------
$('#des-folhas').addEventListener('click', async e => {
  const b = e.target.closest('button');
  if (!b) return;
  const fs = des.obra.producao.folhas;
  if (b.dataset.nova !== undefined) {
    fs.push({ id: uid(), nome: `Folha ${fs.length + 1}`, formas: [] });
    des.folha = fs.length - 1;
  } else if (b.dataset.excluir !== undefined) {
    if (!await confirmar('A folha e todo o desenho dela serão apagados.', { titulo: `Excluir a "${folhaAtual().nome}"?`, ok: 'Excluir folha', perigo: true })) return;
    fs.splice(des.folha, 1);
    des.folha = Math.max(0, des.folha - 1);
  } else des.folha = +b.dataset.i;
  des.pilha = [];
  salvar(); renderFolhas(); renderDesenho();
});
$('#des-folhas').addEventListener('dblclick', async e => {
  if (!e.target.closest('[data-i]')) return;
  const n = await perguntar('Nome da folha (ex.: Cozinha, Banheiro social)', folhaAtual().nome, { titulo: 'Renomear folha', ok: 'Salvar' });
  if (n && n.trim()) { folhaAtual().nome = n.trim(); salvar(); renderFolhas(); }
});

// ---------- observações e fotos ----------
$('#des-obs').addEventListener('input', e => { des.obra.producao.obs = e.target.value; salvar(); });

function reduzirImagem(file, max, qualidade) {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      ok(c.toDataURL('image/jpeg', qualidade));
    };
    img.onerror = erro;
    img.src = URL.createObjectURL(file);
  });
}

$('#des-foto').addEventListener('change', async e => {
  const fotos = des.obra.producao.fotos;
  for (const file of e.target.files) {
    try {
      fotos.push({ id: uid(), nome: file.name, src: await reduzirImagem(file, 1400, 0.75) });
      salvar();
    } catch {
      fotos.pop();
      avisar('Não foi possível anexar esta foto. Tente uma imagem menor.', { titulo: 'Erro ao anexar foto' });
      break;
    }
  }
  e.target.value = '';
  renderFotos();
});

function renderFotos() {
  $('#des-fotos').innerHTML = des.obra.producao.fotos.map(f =>
    `<figure data-id="${f.id}"><img src="${f.src}" alt="${esc(f.nome)}"><button class="rm" title="Remover foto">×</button></figure>`).join('') ||
    '<p class="des-vazio">Anexe aqui um croqui feito à mão ou foto do local.</p>';
}
$('#des-fotos').addEventListener('click', async e => {
  if (!e.target.classList.contains('rm') || !await confirmar('', { titulo: 'Remover esta foto?', ok: 'Remover', perigo: true })) return;
  const p = des.obra.producao;
  p.fotos = p.fotos.filter(f => f.id !== e.target.closest('figure').dataset.id);
  salvar(); renderFotos();
});

// ---------- exportar ----------
$('#des-png').addEventListener('click', () => {
  const f = folhaAtual(), o = des.obra;
  if (!f.formas.length) return avisar('Desenhe algo nesta folha antes de exportar.', { titulo: 'Esta folha está vazia' });
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = `obra-${o.numero}-${f.nome.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
    a.click();
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgCompleto(f, `Obra #${o.numero} · ${o.cliente.nome} · ${f.nome}`));
});
$('#des-imprimir').addEventListener('click', () => imprimirOrdem(des.obra));

function imprimirOrdem(o) {
  const p = garantirProducao(o);
  const folhas = p.folhas.filter(f => f.formas.length);
  $('#print-area').innerHTML = `
    <div class="pr-head">
      <div class="pr-empresa"><img src="logo-s.png" alt=""><div><h1>${esc(CONFIG.nome)}</h1><p>ORDEM DE PRODUÇÃO</p></div></div>
      <div style="text-align:right"><h1>Obra #${o.numero}</h1><p>Venda: ${fmtData(o.venda.data)}</p><p><strong>Entrega: ${fmtData(o.venda.previsaoEntrega)}</strong></p></div>
    </div>
    <div class="pr-cliente">
      <p><strong>Cliente:</strong> ${esc(o.cliente.nome)}${o.cliente.telefone ? ` · ${esc(o.cliente.telefone)}` : ''}</p>
      ${o.cliente.endereco ? `<p><strong>Endereço da obra:</strong> ${esc(o.cliente.endereco)}</p>` : ''}
    </div>
    <table>
      <thead><tr><th class="num">Qtd.</th><th>Peça / serviço</th><th>Material (orçamento)</th><th>Medidas</th></tr></thead>
      <tbody>${o.itens.map(it => `<tr><td class="num"><strong>${+it.quantidade || 1}</strong></td><td>${esc(it.descricao)}</td><td>${esc(it.material)}</td><td>${medidasTexto(it)}</td></tr>`).join('')}</tbody>
    </table>
    ${p.obs ? `<div class="pr-obs"><strong>Observações para produção:</strong><br>${esc(p.obs).replace(/\n/g, '<br>')}</div>` : ''}
    ${folhas.map(f => `<div class="pr-folha"><h3>${esc(f.nome)} <small>— medidas em cm</small></h3>${svgCompleto(f)}</div>`).join('')}
    ${!folhas.length && !p.fotos.length ? '<p class="pr-obs">Sem desenho anexado.</p>' : ''}
    ${p.fotos.length ? `<div class="pr-fotos">${p.fotos.map(f => `<img src="${f.src}" alt="">`).join('')}</div>` : ''}
    <div class="pr-assin"><div>Desenho conferido por</div><div>Responsável pela produção</div></div>`;
  window.print();
}
