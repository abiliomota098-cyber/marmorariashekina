// ============================================================
//  SITE PÚBLICO — Marmoraria Shekina
//  Só a apresentação: não contém orçamentos, produção nem financeiro.
//  Para mudar telefones/endereço, edite o CONFIG abaixo.
// ============================================================
const CONFIG = {
  nome: 'Marmoraria Shekina',
  slogan: 'Mármores, granitos e quartzos sob medida para a sua casa, com medição, produção e instalação.',
  telefones: ['(22) 99702-9011', '(22) 99213-9181', '(22) 98137-7416'],
  email: '',
  endereco: 'BR-101, km 206, nº 925 — Condomínio Industrial — Casimiro de Abreu/RJ',
  cnpj: 'CNPJ 05.422.151/0001-51',
  ie: 'Insc. Estadual 77.488.901',
  // busca usada no botão "Como chegar"
  mapa: 'Marmoraria Shekina, BR-101 km 206, Casimiro de Abreu - RJ',
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const linkWhats = (tel, msg = 'Olá! Gostaria de solicitar um orçamento.') =>
  `https://wa.me/55${tel.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;

function aplicarConfig() {
  $$('[data-cfg]').forEach(el => (el.textContent = CONFIG[el.dataset.cfg]));
  $('#contato-email').hidden = !CONFIG.email;
  $$('[data-whatsapp]').forEach(a => (a.href = linkWhats(CONFIG.telefones[0])));
  $('#lista-whats').innerHTML = CONFIG.telefones
    .map(t => `<a href="${linkWhats(t)}" target="_blank" rel="noopener">${esc(t)}</a>`).join('');
  $('#link-mapa').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONFIG.mapa)}`;
}

// ---------- catálogo ----------
let filtroCatalogo = '';
function renderCatalogo() {
  const tipos = Object.entries(TIPOS_PEDRA);
  $('#cat-filtros').innerHTML = [['', { t: 'Todas' }], ...tipos].map(([k, v]) => {
    const qtd = CATALOGO.filter(p => !k || p.tipo === k).length;
    return `<button class="chip ${filtroCatalogo === k ? 'ativo' : ''}" data-tipo="${k}">${v.t} <small>${qtd}</small></button>`;
  }).join('');
  $('#cat-info').textContent = filtroCatalogo ? TIPOS_PEDRA[filtroCatalogo].info : '';
  $('#cat-info').hidden = !filtroCatalogo;
  $('#catalogo').innerHTML = CATALOGO.map((p, i) => ({ p, i })).filter(({ p }) => !filtroCatalogo || p.tipo === filtroCatalogo).map(({ p, i }) => `
    <article class="pedra">
      <div class="pedra-img" style="background-image:${texturaPedra(p.tex, i * 13 + 1)}">
        <img src="fotos/${p.id}.jpg" alt="${esc(p.nome)}" loading="lazy" onerror="this.remove()">
        <span class="pedra-tipo">${TIPOS_PEDRA[p.tipo].s}</span>
      </div>
      <div class="pedra-info">
        <h3>${esc(p.nome)}</h3>
        <p class="tons">${esc(p.tons)}</p>
        <p class="desc">${esc(p.desc)}</p>
        <div class="usos">${p.uso.map(u => `<span>${esc(u)}</span>`).join('')}</div>
        <div class="pedra-rodape">
          <span class="faixa f${p.preco}">${FAIXA_PRECO[p.preco]}</span>
          <a href="${linkWhats(CONFIG.telefones[0], `Olá! Gostaria de um orçamento com a pedra ${p.nome}.`)}" target="_blank" rel="noopener">Pedir orçamento →</a>
        </div>
      </div>
    </article>`).join('');
}
$('#cat-filtros').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  filtroCatalogo = chip.dataset.tipo;
  renderCatalogo();
});

// ---------- fundo marmorizado ----------
function rasterizarMarmore(svgUrl, aplicar) {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    let url;
    try { url = c.toDataURL('image/jpeg', 0.88); } catch { url = img.src; }
    aplicar(url);
  };
  img.src = svgUrl;
}

// ---------- início ----------
$$('[data-scroll]').forEach(b => b.addEventListener('click', () => document.getElementById(b.dataset.scroll).scrollIntoView({ behavior: 'smooth' })));
aplicarConfig();
$('.hero').style.backgroundImage =
  'radial-gradient(ellipse 34% 60% at 72% 50%, rgba(0,0,0,.75), transparent 75%),' +
  'linear-gradient(90deg, rgba(0,0,0,.6), rgba(0,0,0,.15) 55%, rgba(0,0,0,.3)),' + marmoreHero();
renderCatalogo();
rasterizarMarmore(marmoreFundo(), url => { document.body.style.backgroundImage = `url("${url}")`; });
rasterizarMarmore(marmoreHero().slice(5, -2), url => {
  $('.topbar').style.backgroundImage = `linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,.45)), url("${url}")`;
});
