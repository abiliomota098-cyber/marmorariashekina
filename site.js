// ============================================================
//  SITE PÚBLICO — Marmoraria Shekina
//  Só a apresentação: não contém orçamentos, produção nem financeiro.
//  Para mudar telefones/endereço, edite o CONFIG abaixo.
// ============================================================
const CONFIG = {
  nome: 'Marmoraria Shekina',
  slogan: 'Mármores, granitos e quartzos sob medida para a sua casa, com medição, produção e instalação.',
  telefones: ['(22) 99702-9011', '(22) 99213-9181'],
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
      <div class="pedra-img">
        <img src="img/pedras/${p.id}.jpg" alt="" loading="lazy" decoding="async" width="400" height="300">
        <img src="fotos/${p.id}.jpg" alt="${esc(p.nome)}" loading="lazy" decoding="async" onerror="this.remove()">
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

// ---------- início ----------
// as texturas de mármore são imagens prontas (pasta img/), geradas a partir de catalogo.js
$$('[data-scroll]').forEach(b => b.addEventListener('click', () => document.getElementById(b.dataset.scroll).scrollIntoView({ behavior: 'smooth' })));
aplicarConfig();
renderCatalogo();
