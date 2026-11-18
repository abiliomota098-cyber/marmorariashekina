// ============================================================
//  SERVIÇOS — cards clicáveis com ideias de projeto (site público e sistema)
//  Usa CONFIG, CATALOGO, $, $$, esc e linkWhats de site.js / app.js.
//  O sistema (pasta sistema/) define BASE_OBRAS = '../obras/' e IMG_PEDRA antes deste arquivo.
// ============================================================
const BASE_OBRAS = window.BASE_OBRAS || 'obras/';
const IMG_PEDRA = window.IMG_PEDRA || (id => `img/pedras/${id}.jpg`);
// ---------- serviços (cards clicáveis com ideias de projeto) ----------
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
let ideiasServ = {};   // id do serviço -> lista de fotos
fetch(BASE_OBRAS + 'lista.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : {}).then(l => { ideiasServ = l || {}; renderServicos(); }).catch(() => {});

function renderServicos() {
  $('#servicos-cards').innerHTML = SERVICOS.map(s => {
    const n = (ideiasServ[s.id] || []).length;
    // capa: 1ª foto de obra; sem fotos, a textura da pedra típica do serviço
    const capa = `<img class="card-capa" src="${n ? `${BASE_OBRAS}${s.id}/${ideiasServ[s.id][0]}-p.jpg` : `${IMG_PEDRA(s.capa)}`}" alt="" loading="lazy">`;
    return `<button type="button" class="card card-servico" data-servico="${s.id}">
      ${capa}<span class="card-corpo"><strong class="card-titulo">${esc(s.t)}</strong><span class="card-txt">${esc(s.p)}</span>
      <span class="card-mais">${n ? `Ver ${n} ideia${n > 1 ? 's' : ''} de projeto` : 'Ver detalhes'} →</span></span>
    </button>`;
  }).join('');
}
function abrirServico(id) {
  const s = SERVICOS.find(x => x.id === id);
  const fotos = ideiasServ[id] || [];
  const pedras = CATALOGO.filter(p => p.uso.some(u => s.usos.includes(u))).slice(0, 8);
  $('#servico-conteudo').innerHTML = `
    <h2>${esc(s.t)}</h2>
    <p class="serv-sub">${esc(s.p)}</p>
    <ul class="serv-itens">${s.itens.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
    <h3>Ideias para o seu projeto</h3>${fotos.length ? '<p class="serv-aviso">Imagens ilustrativas — fazemos o seu projeto sob medida, na pedra que você escolher.</p>' : ''}
    ${fotos.length
      ? `<div class="galeria">${fotos.map((f, i) => `<button type="button" data-foto="${i}"><img src="${BASE_OBRAS}${id}/${f}-p.jpg" alt="${esc(s.t)} — ideia ${i + 1} (imagem ilustrativa)" loading="lazy"></button>`).join('')}</div>`
      : `<p class="serv-vazio">Em breve vamos mostrar aqui ideias e fotos de projetos de ${esc(s.t.toLowerCase())}. Quer ver trabalhos já feitos? Peça pelo WhatsApp que enviamos.</p>`}
    ${pedras.length ? `<h3>Pedras mais usadas</h3>
    <div class="serv-pedras">${pedras.map(p => `<figure><img src="${IMG_PEDRA(p.id)}" alt="" loading="lazy"><figcaption>${esc(p.nome)}</figcaption></figure>`).join('')}</div>
    <button type="button" class="link-catalogo" data-ir-catalogo>Ver o catálogo completo →</button>` : ''}
    <a class="btn btn-gold" href="${linkWhats(CONFIG.telefones[0], `Olá! Gostaria de um orçamento de ${s.t.toLowerCase()}.`)}" target="_blank" rel="noopener">Pedir orçamento de ${esc(s.t.toLowerCase())}</a>`;
  $('#servico-conteudo').dataset.servico = id;
  $('#servico-dialogo').showModal();
  $('#servico-dialogo').scrollTop = 0;
}
// visualizador de fotos (ampliar, anterior/próxima, deslizar no celular)
let zoomServ = { id: '', i: 0 };
function mostrarFotoServ(i) {
  const fotos = ideiasServ[zoomServ.id] || [];
  zoomServ.i = (i + fotos.length) % fotos.length;
  $('#foto-img').src = `${BASE_OBRAS}${zoomServ.id}/${fotos[zoomServ.i]}.jpg`;
  $('#foto-cont').textContent = `${zoomServ.i + 1} / ${fotos.length}`;
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
  if (f) { zoomServ.id = $('#servico-conteudo').dataset.servico; mostrarFotoServ(+f.dataset.foto); $('#foto-dialogo').showModal(); }
});
$('#foto-dialogo').addEventListener('click', e => {
  const nav = e.target.closest('.foto-nav');
  if (nav) return mostrarFotoServ(zoomServ.i + +nav.dataset.passo);
  if (e.target === e.currentTarget || e.target.closest('[data-fechar]') || e.target.id === 'foto-palco') e.currentTarget.close();
});
document.addEventListener('keydown', e => {
  if (!$('#foto-dialogo').open) return;
  if (e.key === 'ArrowRight') mostrarFotoServ(zoomServ.i + 1);
  if (e.key === 'ArrowLeft') mostrarFotoServ(zoomServ.i - 1);
});
let toqueX = null;
$('#foto-dialogo').addEventListener('touchstart', e => (toqueX = e.touches[0].clientX), { passive: true });
$('#foto-dialogo').addEventListener('touchend', e => {
  if (toqueX === null) return;
  const dx = e.changedTouches[0].clientX - toqueX; toqueX = null;
  if (Math.abs(dx) > 50 && (ideiasServ[zoomServ.id] || []).length > 1) mostrarFotoServ(zoomServ.i + (dx < 0 ? 1 : -1));
});

renderServicos();
