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
  // (código de localização do Google = ponto exato da marmoraria)
  mapa: 'GRF3+PG Casimiro de Abreu, RJ',
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

// ---------- serviços (cards clicáveis com fotos das obras) ----------
// As fotos ficam em marmoraria\obras\<id>\ (ex.: obras\cozinhas\foto1.jpg).
// O publicar.ps1 reduz as fotos e gera obras/lista.json sozinho.
const SERVICOS = [
  { id: 'cozinhas', capa: 'preto-sao-gabriel', t: 'Cozinhas', p: 'Bancadas, ilhas, frontões e cubas esculpidas sob medida.',
    itens: ['Bancadas de pia e cooktop', 'Ilhas e penínsulas', 'Frontões e saias', 'Cubas esculpidas e embutidas'], usos: ['Cozinha', 'Ilha'] },
  { id: 'banheiros', capa: 'calacatta', t: 'Banheiros', p: 'Lavatórios, nichos, saias e cubas integradas.',
    itens: ['Bancadas de lavatório', 'Cubas esculpidas na pedra', 'Nichos de box', 'Soleiras e rodapés de box'], usos: ['Banheiro', 'Lavabo', 'Cuba esculpida'] },
  { id: 'escadas', capa: 'travertino-romano', t: 'Escadas e pisos', p: 'Degraus, espelhos, rodapés e pisos em pedra natural.',
    itens: ['Degraus e espelhos', 'Pisos internos e externos', 'Rodapés', 'Acabamento antiderrapante'], usos: ['Escada', 'Piso'] },
  { id: 'soleiras', capa: 'branco-itaunas', t: 'Soleiras e peitoris', p: 'Acabamentos para portas e janelas com caimento correto.',
    itens: ['Soleiras de porta', 'Peitoris com pingadeira', 'Baguetes e filetes', 'Caimento para escoar a água'], usos: ['Soleira', 'Peitoril'] },
  { id: 'gourmet', capa: 'preto-via-lactea', t: 'Áreas gourmet', p: 'Bancadas externas, churrasqueiras e mesas.',
    itens: ['Bancadas de churrasqueira', 'Bancadas externas', 'Mesas e balcões', 'Bares'], usos: ['Área gourmet', 'Churrasqueira', 'Bar', 'Mesa', 'Área externa'] },
  { id: 'especiais', capa: 'taj-mahal', t: 'Projetos especiais', p: 'Lareiras, revestimentos de parede e peças personalizadas.',
    itens: ['Lareiras', 'Revestimento de paredes', 'Fachadas', 'Peças sob encomenda'], usos: ['Lareira', 'Parede', 'Revestimento', 'Fachada'] },
];
let obras = {};   // id do serviço -> lista de fotos
fetch('obras/lista.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : {}).then(l => { obras = l || {}; renderServicos(); }).catch(() => {});

function renderServicos() {
  $('#servicos-cards').innerHTML = SERVICOS.map(s => {
    const n = (obras[s.id] || []).length;
    // capa: 1ª foto de obra; sem fotos, a textura da pedra típica do serviço
    const capa = `<img class="card-capa" src="${n ? `obras/${s.id}/${obras[s.id][0]}-p.jpg` : `img/pedras/${s.capa}.jpg`}" alt="" loading="lazy">`;
    return `<button type="button" class="card card-servico" data-servico="${s.id}">
      ${capa}<span class="card-corpo"><strong class="card-titulo">${esc(s.t)}</strong><span class="card-txt">${esc(s.p)}</span>
      <span class="card-mais">${n ? `Ver ${n} ideia${n > 1 ? 's' : ''} de projeto` : 'Ver detalhes'} →</span></span>
    </button>`;
  }).join('');
}
function abrirServico(id) {
  const s = SERVICOS.find(x => x.id === id);
  const fotos = obras[id] || [];
  const pedras = CATALOGO.filter(p => p.uso.some(u => s.usos.includes(u))).slice(0, 8);
  $('#servico-conteudo').innerHTML = `
    <h2>${esc(s.t)}</h2>
    <p class="serv-sub">${esc(s.p)}</p>
    <ul class="serv-itens">${s.itens.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
    <h3>Ideias para o seu projeto</h3>${fotos.length ? '<p class="serv-aviso">Imagens ilustrativas — fazemos o seu projeto sob medida, na pedra que você escolher.</p>' : ''}
    ${fotos.length
      ? `<div class="galeria">${fotos.map((f, i) => `<button type="button" data-foto="${i}"><img src="obras/${id}/${f}-p.jpg" alt="${esc(s.t)} — ideia ${i + 1} (imagem ilustrativa)" loading="lazy"></button>`).join('')}</div>`
      : `<p class="serv-vazio">Em breve vamos mostrar aqui ideias e fotos de projetos de ${esc(s.t.toLowerCase())}. Quer ver trabalhos já feitos? Peça pelo WhatsApp que enviamos.</p>`}
    ${pedras.length ? `<h3>Pedras mais usadas</h3>
    <div class="serv-pedras">${pedras.map(p => `<figure><img src="img/pedras/${p.id}.jpg" alt="" loading="lazy"><figcaption>${esc(p.nome)}</figcaption></figure>`).join('')}</div>
    <button type="button" class="link-catalogo" data-ir-catalogo>Ver o catálogo completo →</button>` : ''}
    <a class="btn btn-gold" href="${linkWhats(CONFIG.telefones[0], `Olá! Gostaria de um orçamento de ${s.t.toLowerCase()}.`)}" target="_blank" rel="noopener">Pedir orçamento de ${esc(s.t.toLowerCase())}</a>`;
  $('#servico-conteudo').dataset.servico = id;
  $('#servico-dialogo').showModal();
  $('#servico-dialogo').scrollTop = 0;
}
// visualizador de fotos (ampliar, anterior/próxima, deslizar no celular)
let zoom = { id: '', i: 0 };
function mostrarFoto(i) {
  const fotos = obras[zoom.id] || [];
  zoom.i = (i + fotos.length) % fotos.length;
  $('#foto-img').src = `obras/${zoom.id}/${fotos[zoom.i]}.jpg`;
  $('#foto-cont').textContent = `${zoom.i + 1} / ${fotos.length}`;
  $$('#foto-dialogo .foto-nav').forEach(b => (b.hidden = fotos.length < 2));
}
$('#servicos-cards').addEventListener('click', e => {
  const c = e.target.closest('[data-servico]');
  if (c) abrirServico(c.dataset.servico);
});
$('#servico-dialogo').addEventListener('click', e => {
  if (e.target === e.currentTarget || e.target.closest('[data-fechar]')) return e.currentTarget.close();
  if (e.target.closest('[data-ir-catalogo]')) { e.currentTarget.close(); return document.getElementById('materiais').scrollIntoView({ behavior: 'smooth' }); }
  const f = e.target.closest('[data-foto]');
  if (f) { zoom.id = $('#servico-conteudo').dataset.servico; mostrarFoto(+f.dataset.foto); $('#foto-dialogo').showModal(); }
});
$('#foto-dialogo').addEventListener('click', e => {
  const nav = e.target.closest('.foto-nav');
  if (nav) return mostrarFoto(zoom.i + +nav.dataset.passo);
  if (e.target === e.currentTarget || e.target.closest('[data-fechar]') || e.target.id === 'foto-palco') e.currentTarget.close();
});
document.addEventListener('keydown', e => {
  if (!$('#foto-dialogo').open) return;
  if (e.key === 'ArrowRight') mostrarFoto(zoom.i + 1);
  if (e.key === 'ArrowLeft') mostrarFoto(zoom.i - 1);
});
let toqueX = null;
$('#foto-dialogo').addEventListener('touchstart', e => (toqueX = e.touches[0].clientX), { passive: true });
$('#foto-dialogo').addEventListener('touchend', e => {
  if (toqueX === null) return;
  const dx = e.changedTouches[0].clientX - toqueX; toqueX = null;
  if (Math.abs(dx) > 50 && (obras[zoom.id] || []).length > 1) mostrarFoto(zoom.i + (dx < 0 ? 1 : -1));
});

// ---------- início ----------
// as texturas de mármore são imagens prontas (pasta img/), geradas a partir de catalogo.js
$$('[data-scroll]').forEach(b => b.addEventListener('click', () => document.getElementById(b.dataset.scroll).scrollIntoView({ behavior: 'smooth' })));
aplicarConfig();
renderServicos();
renderCatalogo();
