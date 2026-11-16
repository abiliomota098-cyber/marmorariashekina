// ============================================================
//  CONFIGURAÇÃO DA EMPRESA — edite aqui os dados da marmoraria
// ============================================================
const CONFIG = {
  nome: 'Marmoraria Shekina',
  slogan: 'Mármores, granitos e quartzos sob medida para a sua casa, com medição, produção e instalação.',
  // o primeiro número é usado nos botões "Solicitar orçamento"
  telefones: ['(22) 99702-9011', '(22) 99213-9181'],
  email: '', // deixe vazio para não exibir
  endereco: 'BR-101, km 206, nº 925 — Condomínio Industrial — Casimiro de Abreu/RJ',
  cnpj: 'CNPJ 05.422.151/0001-51',
  ie: 'Insc. Estadual 77.488.901',
  validadePadraoDias: 15,
  // busca usada no botão "Buscar no mapa" do Contato
  // (código de localização do Google = ponto exato da marmoraria)
  mapa: 'GRF3+PG Casimiro de Abreu, RJ',
};

// Tabela de preços inicial. Depois de aberta, os preços são alterados pelo sistema
// em Orçamentos → "Tabela de preços" (esta lista só é usada na primeira vez).
// unidade: m2 = por m² · ml = por metro linear · un = por unidade
const PRECOS_PADRAO = [
  { nome: 'Preto São Gabriel Escovado', unidade: 'm2', preco: 600 },
  { nome: 'Preto São Gabriel', unidade: 'm2', preco: 550 },
  { nome: 'Branco Itaúnas', unidade: 'm2', preco: 550 },
  { nome: 'Verde Ubatuba', unidade: 'm2', preco: 430 },
  { nome: 'Ocre Itabira', unidade: 'm2', preco: 330 },
  { nome: 'Quartzo Branco', unidade: 'm2', preco: 1500 },
  { nome: 'Bege Bahia', unidade: 'm2', preco: 550 },
  { nome: 'Maracujá', unidade: 'm2', preco: 500 },
  { nome: 'Branco Ceará', unidade: 'm2', preco: 800 },
  { nome: 'Branco Dallas', unidade: 'm2', preco: 430 },
  { nome: 'Branco Estelar', unidade: 'm2', preco: 1500 },
  { nome: 'Branco Prime', unidade: 'm2', preco: 700 },
  { nome: 'Lâmina', unidade: 'm2', preco: 1500 },
  { nome: 'Meia esquadria', unidade: 'ml', preco: 60 },
  { nome: 'Boleado', unidade: 'ml', preco: 90 },
  { nome: 'Acabamento comum', unidade: 'ml', preco: 0 },
  { nome: 'Cuba nº 1', unidade: 'un', preco: 200 },
  { nome: 'Cuba nº 2', unidade: 'un', preco: 240 },
];

const STORAGE_KEY = 'marmoraria.dados.v1';

const STATUS = {
  pendente: { t: 'Em aberto', c: 'b-aberto' },
  vendido: { t: 'Vendido', c: 'b-vendido' },
  recusado: { t: 'Recusado', c: 'b-recusado' },
};
// etapas da obra, na ordem do quadro da aba Produção
const STATUS_OBRA = {
  desenho: 'Aguardando desenho',
  corte: 'Em corte',
  acabamento: 'Acabamento',
  pronto: 'Pronto p/ instalação',
  instalado: 'Instalado',
};
const UNIDADES = { m2: 'm²', ml: 'm linear', un: 'unidade' };

// ---------- utilitários ----------
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = v => brl.format(v || 0);
const fmtNum = v => (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtData = iso => (iso ? iso.split('-').reverse().join('/') : '—');
const round2 = v => Math.round((v + Number.EPSILON) * 100) / 100;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const hoje = () => toISO(new Date());
function addDias(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return toISO(new Date(y, m - 1, d + n));
}
function addMeses(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const ultimoDia = new Date(y, m - 1 + n + 1, 0).getDate();
  return toISO(new Date(y, m - 1 + n, Math.min(d, ultimoDia)));
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ---------- dados ----------
// os dados ficam no Supabase e são carregados depois do login (acesso.js);
// STORAGE_KEY só é usado para importar dados da versão antiga, que ficavam no navegador
let db = migrar({ seq: 0, orcamentos: [] });
// converte etapas da versão anterior para as etapas atuais
function migrar(d) {
  const antigas = { producao: 'desenho', instalacao: 'pronto', concluida: 'instalado' };
  d.orcamentos.forEach(o => { if (o.venda && antigas[o.venda.statusObra]) o.venda.statusObra = antigas[o.venda.statusObra]; });
  if (!Array.isArray(d.precos)) d.precos = structuredClone(PRECOS_PADRAO);
  // acabamento comum (sem valor) entra uma única vez nas tabelas já salvas
  if (!d.acabComum) {
    if (!d.precos.some(p => /^acabamento comum$/i.test(String(p.nome || '').trim()))) d.precos.push({ nome: 'Acabamento comum', unidade: 'ml', preco: 0 });
    d.acabComum = true;
  }
  // cubas nº 1 e nº 2 entram uma única vez nas tabelas já salvas
  if (!d.cubas) {
    [[1, 200], [2, 240]].forEach(([n, preco]) => {
      const re = new RegExp(`^cuba\\s*n?[º°o.]?\\s*${n}$`, 'i');
      if (!d.precos.some(p => re.test(String(p.nome || '').trim()))) d.precos.push({ nome: `Cuba nº ${n}`, unidade: 'un', preco });
    });
    d.cubas = true;
  }
  return d;
}

// compara nomes ignorando acentos, maiúsculas e espaços extras
const chaveNome = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const buscarPreco = nome => db.precos.find(p => chaveNome(p.nome) === chaveNome(nome));
function salvar() {
  agendarSalvar(); // envia para a nuvem (acesso.js)
}
const buscarOrc = id => db.orcamentos.find(o => o.id === id);

// ---------- cálculos ----------
function medidaItem(it) {
  const c = +it.comprimento || 0, l = +it.largura || 0, q = +it.quantidade || 0;
  if (it.unidade === 'm2') return c * l * q;
  if (it.unidade === 'ml') return c * q;
  return q;
}
// acabamento da peça (ex.: Boleado) cobrado por metro linear, somado ao total do item
const valorAcabamento = it => (it.acabamento ? (+it.acabMetros || 0) * (+it.acabPreco || 0) : 0);
// cuba (nº 1, nº 2…) cobrada por unidade, somada ao total do item
const valorCuba = it => (it.cuba ? (+it.cubaQtd || 0) * (+it.cubaPreco || 0) : 0);
const cubaTexto = it => `${+it.cubaQtd > 1 ? `${it.cubaQtd}× ` : ''}${it.cuba}`;
const totalItem = it => round2(medidaItem(it) * (+it.preco || 0) + valorAcabamento(it) + valorCuba(it));
// lados da peça que recebem acabamento (frente/fundo = comprimento, laterais = largura)
const LADOS = {
  frente: { curto: 'Frente', nome: 'frente' },
  fundo: { curto: 'Fundo', nome: 'fundo' },
  esq: { curto: 'Esq.', nome: 'lateral esquerda' },
  dir: { curto: 'Dir.', nome: 'lateral direita' },
};
const metrosAcabPadrao = it => {
  const c = +it.comprimento || 0, l = it.unidade === 'm2' ? +it.largura || 0 : 0;
  const total = (it.acabLados || []).reduce((s, k) => s + (k === 'frente' || k === 'fundo' ? c : l), 0);
  return round2(total * (+it.quantidade || 1)) || '';
};
const ladosTexto = it => (it.acabLados?.length ? ` (${it.acabLados.map(k => LADOS[k].nome).join(' + ')})` : '');
// meia esquadria: a borda recebe uma saia colada em 45° (altura em cm)
const ehEsquadria = nome => /esquadria/i.test(nome || '');
const acabTexto = it => `${it.acabamento}${ladosTexto(it)}${ehEsquadria(it.acabamento) ? ` — saia ${String(+it.acabSaia || 4).replace('.', ',')} cm` : ''}`;
const subtotal = o => round2(o.itens.reduce((s, it) => s + totalItem(it), 0));
const totalOrc = o => Math.max(0, round2(subtotal(o) - (+o.desconto || 0)));
// valor para pagamento à vista, com o "Desconto à vista (%)" do orçamento
const pctAvista = o => Math.min(100, Math.max(0, +o.descAvista || 0));
const totalAvista = o => round2(totalOrc(o) * (1 - pctAvista(o) / 100));
const fmtPct = v => String(+v).replace('.', ',') + '%';
const recebido = o => round2(o.venda.parcelas.filter(p => p.pago).reduce((s, p) => s + p.valor, 0));

// ============================================================
//  NAVEGAÇÃO
// ============================================================
const ABAS = ['apresentacao', 'orcamentos', 'producao', 'financeiro'];

function mostrarAba() {
  let aba = ABAS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'apresentacao';
  // abas internas só para usuários autorizados (acesso.js)
  // ainda conferindo se já havia sessão aberta: mostra a apresentação e espera
  if (aba !== 'apresentacao' && !acessoIniciado) aba = 'apresentacao';
  else if (aba !== 'apresentacao' && !usuarioAtual()) {
    pedirLogin(aba);
    // em file:// o replaceState pode ser bloqueado; não é essencial
    try { history.replaceState(null, '', '#apresentacao'); } catch {}
    aba = 'apresentacao';
  }
  $$('.view').forEach(v => (v.hidden = v.id !== aba));
  $$('.tabs a').forEach(a => a.classList.toggle('ativo', a.dataset.tab === aba));
  if (aba === 'orcamentos') renderOrcamentos();
  if (aba === 'producao') renderProducao();
  if (aba === 'financeiro') renderFinanceiro();
  window.scrollTo(0, 0);
}

const linkWhats = (tel, msg = 'Olá! Gostaria de solicitar um orçamento.') =>
  `https://wa.me/55${tel.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;

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

function aplicarConfig() {
  $$('[data-cfg]').forEach(el => (el.textContent = CONFIG[el.dataset.cfg]));
  $('#contato-email').hidden = !CONFIG.email;
  $('#link-mapa-empresa').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONFIG.mapa)}`;
  $$('[data-whatsapp]').forEach(a => (a.href = linkWhats(CONFIG.telefones[0])));
  $('#lista-whats').innerHTML = CONFIG.telefones
    .map(t => `<a href="${linkWhats(t)}" target="_blank" rel="noopener">${esc(t)}</a>`).join('');
  document.title = CONFIG.nome;
}

// ============================================================
//  ORÇAMENTOS — LISTA
// ============================================================
function renderOrcamentos() {
  const lista = db.orcamentos;
  const abertos = lista.filter(o => o.status === 'pendente');
  const vendidos = lista.filter(o => o.status === 'vendido');
  const fechados = vendidos.length + lista.filter(o => o.status === 'recusado').length;
  const conversao = fechados ? Math.round((vendidos.length / fechados) * 100) : 0;

  $('#orc-kpis').innerHTML = `
    <div class="kpi"><span>Orçamentos</span><strong>${lista.length}</strong></div>
    <div class="kpi"><span>Em aberto</span><strong>${abertos.length}</strong><small>${fmt(abertos.reduce((s, o) => s + totalOrc(o), 0))}</small></div>
    <div class="kpi positivo"><span>Vendidos</span><strong>${vendidos.length}</strong><small>${fmt(vendidos.reduce((s, o) => s + o.venda.valorTotal, 0))}</small></div>
    <div class="kpi"><span>Taxa de conversão</span><strong>${conversao}%</strong><small>vendidos ÷ (vendidos + recusados)</small></div>`;

  const busca = $('#busca').value.trim().toLowerCase();
  const st = $('#filtro-status').value;
  const filtrados = lista
    .filter(o => !st || o.status === st)
    .filter(o => !busca || o.cliente.nome.toLowerCase().includes(busca) || String(o.numero) === busca.replace('#', ''))
    .sort((a, b) => b.numero - a.numero);

  $('#orc-body').innerHTML = filtrados.length
    ? filtrados.map(linhaOrc).join('')
    : `<tr><td colspan="7" class="vazio">${lista.length ? 'Nenhum orçamento encontrado.' : 'Nenhum orçamento ainda. Clique em “+ Novo orçamento”.'}</td></tr>`;
}

function linhaOrc(o) {
  const expirado = o.status === 'pendente' && o.validade && o.validade < hoje();
  let acoes = '';
  if (o.status === 'pendente') {
    acoes = `<button class="btn-sm" data-acao="editar">Editar</button>
      <button class="btn-sm" data-acao="imprimir">Imprimir</button>
      <button class="btn-sm" data-acao="recusar">Recusar</button>
      <button class="btn-sm btn-ok" data-acao="vender">Confirmar venda</button>`;
  } else if (o.status === 'recusado') {
    acoes = `<button class="btn-sm" data-acao="reabrir">Reabrir</button>
      <button class="btn-sm" data-acao="imprimir">Imprimir</button>`;
  } else {
    acoes = `<button class="btn-sm" data-acao="imprimir">Imprimir</button>
      <button class="btn-sm" data-acao="ver-fin">Ver no financeiro</button>`;
  }
  acoes += `<button class="btn-sm" data-acao="duplicar">Duplicar</button>`;
  if (o.status !== 'vendido') acoes += `<button class="btn-sm btn-danger" data-acao="excluir">Excluir</button>`;

  return `<tr data-id="${o.id}">
    <td>#${o.numero}</td>
    <td><strong>${esc(o.cliente.nome)}</strong><small>${esc(o.cliente.telefone)}</small></td>
    <td>${fmtData(o.data)}</td>
    <td>${fmtData(o.validade)}${expirado ? ' <span class="tag-warn">expirado</span>' : ''}</td>    <td class="num">${fmt(o.status === 'vendido' ? o.venda.valorTotal : totalOrc(o))}</td>
    <td><span class="badge ${STATUS[o.status].c}">${STATUS[o.status].t}</span></td>
    <td><div class="acoes">${acoes}</div></td>
  </tr>`;
}

$('#orc-body').addEventListener('click', async e => {
  const btn = e.target.closest('[data-acao]');
  if (!btn) return;
  const o = buscarOrc(btn.closest('tr').dataset.id);
  switch (btn.dataset.acao) {
    case 'editar': abrirOrcamento(o); break;
    case 'imprimir': imprimirOrcamento(o); break;
    case 'vender': abrirVenda(o); break;
    case 'recusar':
      if (await confirmar('O orçamento sai de "Em aberto" e pode ser reaberto depois.', { titulo: `Marcar o orçamento #${o.numero} como recusado?`, ok: 'Marcar como recusado' })) { o.status = 'recusado'; salvar(); renderOrcamentos(); }
      break;
    case 'reabrir': o.status = 'pendente'; salvar(); renderOrcamentos(); break;
    case 'duplicar': {
      const copia = structuredClone(o);
      delete copia.venda;
      Object.assign(copia, { id: null, numero: null, status: 'pendente', data: hoje(), validade: addDias(hoje(), CONFIG.validadePadraoDias) });
      abrirOrcamento(copia);
      break;
    }
    case 'excluir':
      if (await confirmar('Essa ação não pode ser desfeita.', { titulo: `Excluir o orçamento #${o.numero}?`, ok: 'Excluir', perigo: true })) {
        db.orcamentos = db.orcamentos.filter(x => x !== o);
        salvar(); renderOrcamentos();
      }
      break;
    case 'ver-fin': location.hash = 'financeiro'; abrirObra(o); break;
  }
});
$('#busca').addEventListener('input', renderOrcamentos);
$('#filtro-status').addEventListener('change', renderOrcamentos);

// ============================================================
//  ORÇAMENTOS — FORMULÁRIO
// ============================================================
let editando = null;

const itemVazio = () => ({ descricao: '', material: '', unidade: 'm2', comprimento: '', largura: '', quantidade: 1, preco: '' });

function novoOrcamento() {
  return {
    id: null, numero: null, status: 'pendente',
    data: hoje(), validade: addDias(hoje(), CONFIG.validadePadraoDias),
    cliente: { nome: '', telefone: '', email: '', endereco: '' },
    itens: [itemVazio()], desconto: 0, prazoEntrega: '', observacoes: '',
  };
}

function abrirOrcamento(o) {
  editando = o ? structuredClone(o) : novoOrcamento();
  $('#orc-titulo').textContent = editando.numero ? `Editar orçamento #${editando.numero}` : 'Novo orçamento';
  $('#c-nome').value = editando.cliente.nome;
  $('#c-telefone').value = editando.cliente.telefone;
  $('#c-email').value = editando.cliente.email;
  preencherEndereco(editando.cliente);
  $('#o-data').value = editando.data;
  $('#o-validade').value = editando.validade;
  $('#o-prazo').value = editando.prazoEntrega;
  $('#o-desconto').value = editando.desconto || '';
  $('#o-desc-avista').value = editando.descAvista || '';
  $('#o-obs').value = editando.observacoes;
  renderItens();
  $('#dlg-orc').showModal();
}

function renderItens() {
  $('#itens-body').innerHTML = editando.itens.map((it, i) => `
    <tr data-i="${i}">
      <td><input data-f="quantidade" type="number" min="0" step="1" value="${esc(it.quantidade)}" title="Quantidade de peças com o mesmo tamanho"></td>
      <td><input data-f="descricao" data-lista="dl-descricoes" autocomplete="off" value="${esc(it.descricao)}" placeholder="Ex.: Bancada de cozinha"></td>
      <td><input data-f="material" data-lista="dl-materiais" autocomplete="off" value="${esc(it.material)}" placeholder="Ex.: Granito São Gabriel"></td>
      <td><select data-f="unidade">${Object.entries(UNIDADES).map(([k, v]) => `<option value="${k}" ${it.unidade === k ? 'selected' : ''}>${v}</option>`).join('')}</select></td>
      <td><input data-f="comprimento" type="number" min="0" step="0.01" value="${esc(it.comprimento)}" ${it.unidade === 'un' ? 'disabled' : ''}></td>
      <td><input data-f="largura" type="number" min="0" step="0.01" value="${esc(it.largura)}" ${it.unidade !== 'm2' ? 'disabled' : ''}></td>
      <td class="acab">
        <select data-f="acabamento">${opcoesAcabamento(it.acabamento)}</select>
        ${it.acabamento ? `<div class="acab-lados">${Object.entries(LADOS).map(([k, v]) => `
          <label title="${v.nome}"><input type="checkbox" data-f="acabLado" value="${k}" ${(it.acabLados || []).includes(k) ? 'checked' : ''}
            ${(k === 'esq' || k === 'dir') && it.unidade !== 'm2' ? 'disabled' : ''}>${v.curto}</label>`).join('')}
        </div>
        <div class="acab-det">
          <input data-f="acabMetros" type="number" min="0" step="0.01" value="${esc(it.acabMetros)}" title="Metros lineares de acabamento"><span>m × R$</span>
          <input data-f="acabPreco" type="number" min="0" step="0.01" value="${esc(it.acabPreco)}" title="Preço por metro linear">
        </div>
        ${ehEsquadria(it.acabamento) ? `<div class="acab-det acab-saia"><span>Altura da saia</span>
          <input data-f="acabSaia" type="number" min="1" step="0.5" value="${esc(it.acabSaia || 4)}" title="Altura da saia em cm"><span>cm</span></div>` : ''}` : ''}
      </td>
      <td class="cuba">
        <select data-f="cuba">${opcoesCuba(it.cuba)}</select>
        ${it.cuba ? `<div class="acab-det">
          <input data-f="cubaQtd" type="number" min="1" step="1" value="${esc(it.cubaQtd || 1)}" title="Quantidade de cubas"><span>× R$</span>
          <input data-f="cubaPreco" type="number" min="0" step="0.01" value="${esc(it.cubaPreco)}" title="Preço da cuba" placeholder="valor"
            class="${!(+it.cubaPreco > 0) ? 'falta-valor' : ''}">
        </div>` : ''}
      </td>
      <td><input data-f="preco" type="number" min="0" step="0.01" value="${esc(it.preco)}" placeholder="R$"></td>
      <td class="num medida"></td>
      <td class="num tot"></td>
      <td><button type="button" class="rm" title="Remover item">×</button></td>
    </tr>`).join('');
  atualizarTotais();
}

const CUBA_ESCULPIDA = 'Cuba esculpida';
// cubas = itens da tabela de preços cujo nome começa com "Cuba"
function opcoesCuba(atual) {
  const nomes = db.precos.filter(p => /^cuba/i.test(p.nome)).map(p => p.nome);
  // cuba esculpida: sempre disponível, valor digitado em cada orçamento
  if (!nomes.some(n => chaveNome(n) === chaveNome(CUBA_ESCULPIDA))) nomes.push(CUBA_ESCULPIDA);
  if (atual && !nomes.some(n => chaveNome(n) === chaveNome(atual))) nomes.push(atual);
  return '<option value="">Sem cuba</option>' +
    nomes.map(n => `<option ${chaveNome(n) === chaveNome(atual) ? 'selected' : ''}>${esc(n)}</option>`).join('');
}

// acabamentos = itens da tabela de preços cobrados por metro linear
function opcoesAcabamento(atual) {
  const nomes = db.precos.filter(p => p.unidade === 'ml').map(p => p.nome);
  if (atual && !nomes.some(n => chaveNome(n) === chaveNome(atual))) nomes.push(atual);
  return '<option value="">Sem acabamento</option>' +
    nomes.map(n => `<option ${chaveNome(n) === chaveNome(atual) ? 'selected' : ''}>${esc(n)}</option>`).join('');
}

function atualizarTotais() {
  $$('#itens-body tr').forEach(tr => {
    const it = editando.itens[tr.dataset.i];
    tr.querySelector('.medida').innerHTML = (it.unidade === 'un' ? `${medidaItem(it)} un` : `${fmtNum(medidaItem(it))} ${it.unidade === 'm2' ? 'm²' : 'm'}`) +
      (it.acabamento ? `<small>+ ${fmtNum(+it.acabMetros)} m ${esc(it.acabamento.toLowerCase())}</small>` : '') +
      (it.cuba ? `<small>+ ${esc(cubaTexto(it).toLowerCase())}</small>` : '');
    tr.querySelector('.tot').textContent = fmt(totalItem(it));
  });
  $('#t-sub').textContent = fmt(subtotal(editando));
  $('#t-desc').textContent = fmt(+editando.desconto || 0);
  $('#t-total').textContent = fmt(totalOrc(editando));
  $('#t-avista-wrap').hidden = !pctAvista(editando);
  $('#t-avista').textContent = `${fmt(totalAvista(editando))} (−${fmtPct(pctAvista(editando))})`;
}

$('#itens-body').addEventListener('input', e => {
  const f = e.target.dataset.f;
  if (!f) return;
  const tr = e.target.closest('tr'), i = +tr.dataset.i, it = editando.itens[i];

  // lados do acabamento: recalcula os metros pelos lados marcados
  if (f === 'acabLado') {
    const lados = new Set(it.acabLados || []);
    e.target.checked ? lados.add(e.target.value) : lados.delete(e.target.value);
    it.acabLados = Object.keys(LADOS).filter(k => lados.has(k));
    it.acabAuto = true;
    it.acabMetros = metrosAcabPadrao(it);
    tr.querySelector('[data-f="acabMetros"]').value = it.acabMetros;
    atualizarTotais();
    return;
  }

  it[f] = e.target.value;
  let rerender = f === 'unidade';

  // preço automático pela tabela (continua editável no campo Preço)
  const p = (f === 'material' || f === 'descricao') && buscarPreco(e.target.value);
  if (p && f === 'material' && p.unidade === 'm2' && it.unidade === 'm2') {
    it.preco = p.preco;
    tr.querySelector('[data-f="preco"]').value = p.preco;
  } else if (p && f === 'descricao' && p.unidade !== 'm2') {
    // acabamentos/serviços (ex.: Boleado, Meia esquadria) cobrados por metro linear
    it.preco = p.preco;
    rerender = it.unidade !== p.unidade;
    it.unidade = p.unidade;
    tr.querySelector('[data-f="preco"]').value = p.preco;
  }

  // acabamento: preço da tabela e metros = comprimento × quantidade (ambos editáveis)
  if (f === 'acabamento') {
    const pa = buscarPreco(it.acabamento);
    it.acabPreco = it.acabamento && pa ? pa.preco : '';
    if (!it.acabamento) { it.acabMetros = ''; it.acabAuto = false; it.acabLados = []; }
    else {
      if (!it.acabLados?.length) it.acabLados = ['frente'];
      if (ehEsquadria(it.acabamento) && !(+it.acabSaia > 0)) it.acabSaia = 4;
      if (!(+it.acabMetros > 0) || it.acabAuto !== false) { it.acabMetros = metrosAcabPadrao(it); it.acabAuto = true; }
    }
    rerender = true;
  }
  if (f === 'cuba') {
    const pc = buscarPreco(it.cuba);
    it.cubaPreco = it.cuba && pc ? pc.preco : '';
    it.cubaQtd = it.cuba ? (+it.cubaQtd || 1) : '';
    rerender = true;
  }
  if (f === 'cubaPreco') e.target.classList.toggle('falta-valor', !(+it.cubaPreco > 0));
  if (f === 'acabMetros') it.acabAuto = false;
  if ((f === 'comprimento' || f === 'largura' || f === 'quantidade') && it.acabamento && it.acabAuto) {
    it.acabMetros = metrosAcabPadrao(it);
    tr.querySelector('[data-f="acabMetros"]').value = it.acabMetros;
  }

  if (rerender) {
    renderItens();
    // escolheu meia esquadria: vai direto para a altura da saia; cuba sem preço (esculpida): vai para o valor
    const proximo = f === 'acabamento' && ehEsquadria(it.acabamento) ? 'acabSaia'
      : f === 'cuba' && it.cuba && !(+it.cubaPreco > 0) ? 'cubaPreco' : f;
    const campo = $(`#itens-body tr[data-i="${i}"] [data-f="${proximo}"]`);
    campo.focus();
    if (proximo === 'acabSaia') campo.select();
    if (campo.setSelectionRange && campo.type !== 'number') campo.setSelectionRange(campo.value.length, campo.value.length);
  } else atualizarTotais();
});
$('#itens-body').addEventListener('click', e => {
  if (!e.target.classList.contains('rm')) return;
  editando.itens.splice(+e.target.closest('tr').dataset.i, 1);
  if (!editando.itens.length) editando.itens.push(itemVazio());
  renderItens();
});
$('#btn-add-item').addEventListener('click', () => {
  const ultimo = editando.itens[editando.itens.length - 1];
  editando.itens.push({ ...itemVazio(), material: ultimo?.material || '' });
  renderItens();
  $$('#itens-body tr').at(-1).querySelector('[data-f="descricao"]').focus();
});
$('#o-desconto').addEventListener('input', e => { editando.desconto = +e.target.value || 0; atualizarTotais(); });
$('#o-desc-avista').addEventListener('input', e => { editando.descAvista = +e.target.value || 0; atualizarTotais(); });

// ---------- endereço da obra (detalhado) + mapa ----------
const CAMPOS_END = ['cep', 'rua', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'referencia', 'link'];
function preencherEndereco(cli) {
  // orçamentos antigos só tinham o endereço em uma linha: vai para o campo Rua
  const e = cli.end || { rua: cli.endereco || '' };
  CAMPOS_END.forEach(k => { $(`#e-${k}`).value = e[k] || ''; });
  $('#end-msg').textContent = '';
}
function lerEndereco() {
  const e = {};
  CAMPOS_END.forEach(k => { e[k] = $(`#e-${k}`).value.trim(); });
  e.uf = e.uf.toUpperCase();
  return e;
}
// texto em uma linha (usado na impressão, produção e financeiro)
function enderecoTexto(e, comReferencia = true) {
  if (!e) return '';
  const ruaNum = [e.rua, e.numero].filter(Boolean).join(', ');
  const cidade = [e.cidade, e.uf].filter(Boolean).join('/');
  const partes = [ruaNum, e.complemento, e.bairro, cidade, e.cep ? `CEP ${e.cep}` : ''].filter(Boolean);
  return partes.join(' — ') + (comReferencia && e.referencia ? ` (Ref.: ${e.referencia})` : '');
}
// link do mapa: usa a localização colada pelo cliente, senão pesquisa o endereço
function linkMapa(cli) {
  const e = cli.end;
  if (e?.link && /^https?:\/\//i.test(e.link)) return e.link;
  const busca = e ? enderecoTexto(e, false) : cli.endereco;
  return busca ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(busca)}` : '';
}
$('#btn-mapa').addEventListener('click', () => {
  const url = linkMapa({ end: lerEndereco() });
  if (!url) { $('#end-msg').textContent = 'Preencha o endereço ou cole o link da localização.'; return; }
  window.open(url, '_blank', 'noopener');
});
// CEP com 8 dígitos: preenche rua, bairro, cidade e UF (consulta ViaCEP)
$('#e-cep').addEventListener('input', async e => {
  const d = e.target.value.replace(/\D/g, '').slice(0, 8);
  e.target.value = d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  if (d.length !== 8) return;
  $('#end-msg').textContent = 'Buscando CEP…';
  try {
    const r = await (await fetch(`https://viacep.com.br/ws/${d}/json/`)).json();
    if (r.erro) { $('#end-msg').textContent = 'CEP não encontrado.'; return; }
    const set = (id, v) => { if (v) $(id).value = v; };
    set('#e-rua', r.logradouro); set('#e-bairro', r.bairro); set('#e-cidade', r.localidade); set('#e-uf', r.uf);
    $('#end-msg').textContent = 'Endereço preenchido pelo CEP.';
    if (!$('#e-numero').value) $('#e-numero').focus();
  } catch { $('#end-msg').textContent = 'Sem internet para buscar o CEP — preencha à mão.'; }
});

$('#form-orc').addEventListener('submit', e => {
  e.preventDefault();
  Object.assign(editando.cliente, {
    nome: $('#c-nome').value.trim(), telefone: $('#c-telefone').value.trim(),
    email: $('#c-email').value.trim(),
  });
  editando.cliente.end = lerEndereco();
  editando.cliente.endereco = enderecoTexto(editando.cliente.end);
  Object.assign(editando, {
    data: $('#o-data').value, validade: $('#o-validade').value, prazoEntrega: $('#o-prazo').value.trim(),
    desconto: +$('#o-desconto').value || 0, descAvista: +$('#o-desc-avista').value || 0, observacoes: $('#o-obs').value.trim(),
  });
  editando.itens = editando.itens.filter(it => it.descricao.trim() || totalItem(it) > 0);
  if (!editando.itens.length || subtotal(editando) <= 0) {
    if (!editando.itens.length) editando.itens.push(itemVazio());
    renderItens();
    avisar('Adicione pelo menos um item com medida e preço.', { titulo: 'Orçamento sem itens' });
    return;
  }
  const semValor = editando.itens.find(it => it.cuba && chaveNome(it.cuba) === chaveNome(CUBA_ESCULPIDA) && !(+it.cubaPreco > 0));
  if (semValor) {
    avisar(`Informe o valor da cuba esculpida em "${semValor.descricao || 'item'}".`, { titulo: 'Falta o valor da cuba' })
      .then(() => $(`#itens-body tr[data-i="${editando.itens.indexOf(semValor)}"] [data-f="cubaPreco"]`)?.focus());
    return;
  }
  if (editando.desconto > subtotal(editando)) { avisar('O desconto não pode ser maior que o subtotal.', { titulo: 'Desconto inválido' }); return; }
  if (editando.descAvista < 0 || editando.descAvista >= 100) { avisar('Use um valor entre 0 e 99%.', { titulo: 'Desconto à vista inválido' }); return; }

  if (editando.id) {
    const i = db.orcamentos.findIndex(o => o.id === editando.id);
    db.orcamentos[i] = editando;
  } else {
    editando.id = uid();
    editando.numero = ++db.seq;
    db.orcamentos.push(editando);
  }
  salvar();
  $('#dlg-orc').close();
  renderOrcamentos();
  toast(`Orçamento #${editando.numero} salvo.`);
});

$('#btn-novo').addEventListener('click', () => abrirOrcamento());

// ============================================================
//  TABELA DE PREÇOS
// ============================================================
let precosEdit = [];

function abrirPrecos() {
  precosEdit = structuredClone(db.precos);
  renderPrecos();
  $('#dlg-precos').showModal();
}

function renderPrecos() {
  $('#precos-body').innerHTML = precosEdit.map((p, i) => `
    <tr data-i="${i}">
      <td><input data-f="nome" value="${esc(p.nome)}" placeholder="Ex.: Granito Cinza Andorinha"></td>
      <td><select data-f="unidade">${Object.entries(UNIDADES).map(([k, v]) => `<option value="${k}" ${p.unidade === k ? 'selected' : ''}>por ${v}</option>`).join('')}</select></td>
      <td><input data-f="preco" type="number" min="0" step="0.01" value="${p.preco}"></td>
      <td><button type="button" class="rm" title="Remover">×</button></td>
    </tr>`).join('');
}

$('#precos-body').addEventListener('input', e => {
  const f = e.target.dataset.f;
  if (f) precosEdit[e.target.closest('tr').dataset.i][f] = f === 'preco' ? +e.target.value || 0 : e.target.value;
});
$('#precos-body').addEventListener('click', e => {
  if (!e.target.classList.contains('rm')) return;
  precosEdit.splice(+e.target.closest('tr').dataset.i, 1);
  renderPrecos();
});
$('#btn-add-preco').addEventListener('click', () => {
  precosEdit.push({ nome: '', unidade: 'm2', preco: 0 });
  renderPrecos();
  $$('#precos-body tr').at(-1).querySelector('input').focus();
});
$('#form-precos').addEventListener('submit', e => {
  e.preventDefault();
  db.precos = precosEdit.map(p => ({ ...p, nome: p.nome.trim() })).filter(p => p.nome);
  salvar();
  atualizarSugestoes();
  $('#dlg-precos').close();
  toast('Tabela de preços salva. Vale para os próximos itens de orçamento.');
});
$('#btn-precos').addEventListener('click', abrirPrecos);

// sugestões dos campos Material e Descrição: primeiro o que está na tabela de preços
const descricoesFixas = $('#dl-descricoes').innerHTML;
function atualizarSugestoes() {
  const opt = s => `<option>${esc(s)}</option>`;
  const naTabela = new Set(db.precos.map(p => chaveNome(p.nome)));
  $('#dl-materiais').innerHTML = db.precos.filter(p => p.unidade === 'm2').map(p => opt(p.nome)).join('') +
    CATALOGO.filter(c => !naTabela.has(chaveNome(c.nome))).map(c => opt(c.nome)).join('');
  $('#dl-descricoes').innerHTML = db.precos.filter(p => p.unidade !== 'm2').map(p => opt(p.nome)).join('') + descricoesFixas;
}

// ============================================================
//  CONFIRMAÇÃO DE VENDA
// ============================================================
let vendendo = null;

// total da venda: com o desconto à vista se essa opção estiver marcada
const totalVenda = () => ($('#v-avista-desc').checked ? totalAvista(vendendo) : totalOrc(vendendo));
function resumoVenda() {
  const o = vendendo, avista = $('#v-avista-desc').checked;
  $('#venda-resumo').innerHTML = `<div>Orçamento #${o.numero}<br><strong>${esc(o.cliente.nome)}</strong></div>
    <div style="text-align:right">Valor total${avista ? ` à vista (−${fmtPct(pctAvista(o))})` : ''}<br><strong>${fmt(totalVenda())}</strong>${avista ? `<br><small><s>${fmt(totalOrc(o))}</s></small>` : ''}</div>`;
}

function abrirVenda(o) {
  vendendo = o;
  const total = totalOrc(o);
  $('#v-avista-desc-wrap').hidden = !pctAvista(o);
  $('#v-avista-desc').checked = false;
  $('#v-avista-desc-txt').textContent = `Pagamento à vista com ${fmtPct(pctAvista(o))} de desconto — ${fmt(totalAvista(o))}`;
  resumoVenda();
  $('#v-data').value = hoje();
  $('#v-forma').value = 'PIX';
  $('#v-entrada').value = round2(total / 2);
  $('#v-entrada-paga').checked = true;
  $('#v-parcelas').value = 1;
  $('#v-venc').value = addMeses(hoje(), 1);
  $('#v-entrega').value = '';
  $('#v-ok').checked = false;
  $('#v-erro').textContent = '';
  previewVenda();
  $('#dlg-venda').showModal();
}

function gerarParcelas(total, entrada, n, primeiroVenc, dataVenda, entradaPaga) {
  const parcelas = [];
  if (entrada > 0) {
    parcelas.push({ id: uid(), descricao: entrada >= total ? 'À vista' : 'Entrada', vencimento: dataVenda, valor: round2(entrada), pago: entradaPaga, dataPagamento: entradaPaga ? dataVenda : null });
  }
  const saldo = round2(total - entrada);
  if (saldo > 0 && n > 0) {
    const base = Math.floor((saldo / n) * 100) / 100;
    for (let i = 0; i < n; i++) {
      const valor = i === n - 1 ? round2(saldo - base * (n - 1)) : base;
      parcelas.push({ id: uid(), descricao: `Parcela ${i + 1}/${n}`, vencimento: addMeses(primeiroVenc, i), valor, pago: false, dataPagamento: null });
    }
  }
  return parcelas;
}

function lerVenda() {
  const total = totalVenda();
  const entrada = round2(+$('#v-entrada').value || 0);
  const n = Math.max(0, Math.floor(+$('#v-parcelas').value || 0));
  const dataVenda = $('#v-data').value;
  const venc = $('#v-venc').value || addMeses(dataVenda || hoje(), 1);
  let erro = '';
  if (entrada > total) erro = 'A entrada não pode ser maior que o valor total.';
  else if (entrada < total && n === 0) erro = 'Informe em quantas parcelas o saldo será pago.';
  else if (!dataVenda) erro = 'Informe a data da venda.';
  return { total, entrada, n, dataVenda, venc, erro, parcelas: erro ? [] : gerarParcelas(total, entrada, n, venc, dataVenda, $('#v-entrada-paga').checked) };
}

function previewVenda() {
  const v = lerVenda();
  $('#v-erro').textContent = v.erro;
  $('#v-parcelas').disabled = $('#v-venc').disabled = v.entrada >= v.total;
  $('#v-preview').innerHTML = v.parcelas.length
    ? `<table>${v.parcelas.map(p => `<tr><td>${p.descricao} — vence ${fmtData(p.vencimento)}${p.pago ? ' <span class="badge b-vendido">recebida</span>' : ''}</td><td>${fmt(p.valor)}</td></tr>`).join('')}</table>`
    : '';
}

$('#form-venda').addEventListener('input', previewVenda);
$('#v-avista').addEventListener('click', () => {
  if (pctAvista(vendendo)) $('#v-avista-desc').checked = true;
  $('#v-entrada').value = totalVenda(); resumoVenda(); previewVenda();
});
// marcar/desmarcar o desconto à vista: entrada = valor à vista; desmarcar volta para metade
$('#v-avista-desc').addEventListener('change', e => {
  $('#v-entrada').value = e.target.checked ? totalAvista(vendendo) : round2(totalOrc(vendendo) / 2);
  resumoVenda(); previewVenda();
});

$('#form-venda').addEventListener('submit', e => {
  e.preventDefault();
  const v = lerVenda();
  if (v.erro) { $('#v-erro').textContent = v.erro; return; }
  vendendo.status = 'vendido';
  vendendo.venda = {
    data: v.dataVenda,
    formaPagamento: $('#v-forma').value + ($('#v-avista-desc').checked ? ` (à vista −${fmtPct(pctAvista(vendendo))})` : ''),
    previsaoEntrega: $('#v-entrega').value,
    statusObra: 'desenho',
    valorTotal: v.total,
    parcelas: v.parcelas,
  };
  salvar();
  $('#dlg-venda').close();
  renderOrcamentos();
  toast(`Venda confirmada! Obra #${vendendo.numero} enviada para Produção e Financeiro.`);
});

// ============================================================
//  FINANCEIRO
// ============================================================
const vendidos = () => db.orcamentos.filter(o => o.status === 'vendido');

function renderFinanceiro() {
  const mes = $('#fin-mes').value; // 'AAAA-MM' ou ''
  const noPeriodo = iso => !mes || (iso && iso.startsWith(mes));
  const obras = vendidos();
  const todasParcelas = obras.flatMap(o => o.venda.parcelas.map(p => ({ ...p, obra: o })));
  const h = hoje();

  const obrasPeriodo = obras.filter(o => noPeriodo(o.venda.data));
  const vendasPeriodo = obrasPeriodo.reduce((s, o) => s + o.venda.valorTotal, 0);
  const recebidoPeriodo = todasParcelas.filter(p => p.pago && noPeriodo(p.dataPagamento)).reduce((s, p) => s + p.valor, 0);
  const emAberto = todasParcelas.filter(p => !p.pago);
  const atrasadas = emAberto.filter(p => p.vencimento < h);
  const rotulo = mes ? 'no mês' : 'total';

  $('#fin-kpis').innerHTML = `
    <div class="kpi"><span>Vendas ${rotulo}</span><strong>${fmt(vendasPeriodo)}</strong><small>${obrasPeriodo.length} obra(s)</small></div>
    <div class="kpi positivo"><span>Recebido ${rotulo}</span><strong>${fmt(recebidoPeriodo)}</strong></div>
    <div class="kpi"><span>A receber (geral)</span><strong>${fmt(emAberto.reduce((s, p) => s + p.valor, 0))}</strong><small>${emAberto.length} parcela(s)</small></div>
    <div class="kpi ${atrasadas.length ? 'alerta' : ''}"><span>Em atraso</span><strong>${fmt(atrasadas.reduce((s, p) => s + p.valor, 0))}</strong><small>${atrasadas.length} parcela(s)</small></div>`;

  $('#fin-body').innerHTML = obrasPeriodo.length
    ? obrasPeriodo.sort((a, b) => b.venda.data.localeCompare(a.venda.data) || b.numero - a.numero).map(o => {
        const rec = recebido(o), pct = o.venda.valorTotal ? Math.round((rec / o.venda.valorTotal) * 100) : 100;
        return `<tr data-id="${o.id}">
          <td>#${o.numero}</td>
          <td><strong>${esc(o.cliente.nome)}</strong><small>${esc(o.venda.formaPagamento)}</small></td>
          <td>${fmtData(o.venda.data)}</td>
          <td>${fmtData(o.venda.previsaoEntrega)}</td>
          <td class="num">${fmt(o.venda.valorTotal)}</td>
          <td class="num">${fmt(rec)}<span class="mini-prog"><div style="width:${pct}%"></div></span></td>
          <td class="num">${fmt(o.venda.valorTotal - rec)}</td>
          <td><select class="status-obra">${Object.entries(STATUS_OBRA).map(([k, v]) => `<option value="${k}" ${o.venda.statusObra === k ? 'selected' : ''}>${v}</option>`).join('')}</select></td>
          <td><button class="btn-sm" data-acao="detalhes">Detalhes</button></td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="9" class="vazio">Nenhuma obra vendida ${mes ? 'neste mês' : 'ainda'}. As obras aparecem aqui após “Confirmar venda” no orçamento.</td></tr>`;

  const receber = emAberto.sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  $('#receber-body').innerHTML = receber.length
    ? receber.map(p => `<tr class="${p.vencimento < h ? 'atrasado' : ''}" data-id="${p.obra.id}" data-p="${p.id}">
        <td>${fmtData(p.vencimento)}${p.vencimento < h ? ' <span class="badge b-atraso">atrasada</span>' : ''}</td>
        <td>#${p.obra.numero} · ${esc(p.obra.cliente.nome)}</td>
        <td>${p.descricao}</td>
        <td class="num">${fmt(p.valor)}</td>
        <td><div class="acoes"><button class="btn-sm btn-ok" data-acao="receber">Marcar recebida</button></div></td>
      </tr>`).join('')
    : `<tr><td colspan="5" class="vazio">Nenhuma parcela em aberto.</td></tr>`;
}

function marcarParcela(o, pid, pago) {
  const p = o.venda.parcelas.find(x => x.id === pid);
  p.pago = pago;
  p.dataPagamento = pago ? hoje() : null;
  salvar();
}

$('#fin-body').addEventListener('change', e => {
  if (!e.target.classList.contains('status-obra')) return;
  buscarOrc(e.target.closest('tr').dataset.id).venda.statusObra = e.target.value;
  salvar();
  toast('Status da obra atualizado.');
});
$('#fin-body').addEventListener('click', e => {
  if (e.target.dataset.acao === 'detalhes') abrirObra(buscarOrc(e.target.closest('tr').dataset.id));
});
$('#receber-body').addEventListener('click', e => {
  if (e.target.dataset.acao !== 'receber') return;
  const tr = e.target.closest('tr');
  marcarParcela(buscarOrc(tr.dataset.id), tr.dataset.p, true);
  renderFinanceiro();
  toast('Parcela marcada como recebida.');
});
$('#fin-mes').addEventListener('change', renderFinanceiro);
$('#fin-limpar').addEventListener('click', () => { $('#fin-mes').value = ''; renderFinanceiro(); });

// ---------- detalhes da obra ----------
let obraAberta = null;

function abrirObra(o) {
  obraAberta = o;
  renderObra();
  if (!$('#dlg-obra').open) $('#dlg-obra').showModal();
}

function renderObra() {
  const o = obraAberta, v = o.venda, rec = recebido(o);
  const pct = v.valorTotal ? Math.round((rec / v.valorTotal) * 100) : 100;
  $('#obra-titulo').textContent = `Obra #${o.numero} — ${o.cliente.nome}`;
  $('#obra-body').innerHTML = `
    <div class="obra-info">
      <div><span>Data da venda</span>${fmtData(v.data)}</div>
      <div><span>Forma de pagamento</span>${esc(v.formaPagamento)}</div>
      <div><span>Previsão de entrega</span>${fmtData(v.previsaoEntrega)}</div>
      <div><span>Status da obra</span>${STATUS_OBRA[v.statusObra]}</div>
      <div><span>Endereço</span>${esc(o.cliente.endereco) || '—'}${linkMapa(o.cliente) ? ` <a href="${esc(linkMapa(o.cliente))}" target="_blank" rel="noopener" class="link-mapa">📍 Abrir no mapa</a>` : ''}</div>
      <div><span>Telefone</span>${esc(o.cliente.telefone) || '—'}</div>
    </div>
    <div class="totais">Recebido <strong>${fmt(rec)}</strong> de <strong>${fmt(v.valorTotal)}</strong> (${pct}%) · Saldo <strong>${fmt(v.valorTotal - rec)}</strong></div>
    <div class="progresso"><div style="width:${pct}%"></div></div>
    <div class="table-wrap">
      <table class="tabela">
        <thead><tr><th>Parcela</th><th>Vencimento</th><th class="num">Valor</th><th>Recebida em</th><th></th></tr></thead>
        <tbody>${v.parcelas.map(p => `<tr data-p="${p.id}">
          <td>${p.descricao}</td>
          <td>${fmtData(p.vencimento)}${!p.pago && p.vencimento < hoje() ? ' <span class="badge b-atraso">atrasada</span>' : ''}</td>
          <td class="num">${fmt(p.valor)}</td>
          <td>${p.pago ? fmtData(p.dataPagamento) : '—'}</td>
          <td><div class="acoes">${p.pago
            ? '<button class="btn-sm" data-acao="estornar">Desfazer</button>'
            : '<button class="btn-sm btn-ok" data-acao="receber">Marcar recebida</button>'}</div></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
    <p class="sub-title" style="margin-top:18px">Itens vendidos</p>
    <ul>${o.itens.map(it => `<li>${esc(it.descricao)} — ${esc(it.material)} · ${fmt(totalItem(it))}</li>`).join('')}</ul>`;
}

$('#obra-body').addEventListener('click', e => {
  const acao = e.target.dataset.acao;
  if (acao !== 'receber' && acao !== 'estornar') return;
  marcarParcela(obraAberta, e.target.closest('tr').dataset.p, acao === 'receber');
  renderObra();
  renderFinanceiro();
});

$('#btn-cancelar-venda').addEventListener('click', async () => {
  const o = obraAberta;
  if (!await confirmar('Ela sairá do Financeiro (incluindo parcelas já recebidas) e o orçamento voltará para "Em aberto".',
    { titulo: `Cancelar a venda da obra #${o.numero}?`, ok: 'Cancelar venda', cancelar: 'Voltar', perigo: true })) return;
  delete o.venda;
  o.status = 'pendente';
  salvar();
  $('#dlg-obra').close();
  renderFinanceiro();
  renderOrcamentos();
  toast(`Venda #${o.numero} cancelada.`);
});

// ============================================================
//  IMPRESSÃO DO ORÇAMENTO
// ============================================================
function imprimirOrcamento(o) {
  const total = o.status === 'vendido' ? o.venda.valorTotal : totalOrc(o);
  $('#print-area').innerHTML = `
    <div class="pr-head">
      <div class="pr-empresa"><img src="logo-s.png" alt=""><div><h1>${esc(CONFIG.nome)}</h1><p>${esc(CONFIG.endereco)}</p><p>WhatsApp: ${CONFIG.telefones.map(esc).join(' · ')}</p><p>${[CONFIG.cnpj, CONFIG.ie, CONFIG.email].filter(Boolean).map(esc).join(' · ')}</p></div></div>
      <div style="text-align:right"><h1>Orçamento #${o.numero}</h1><p>Data: ${fmtData(o.data)}</p><p>Válido até: ${fmtData(o.validade)}</p></div>
    </div>
    <div class="pr-cliente">
      <p><strong>Cliente:</strong> ${esc(o.cliente.nome)}</p>
      ${o.cliente.telefone ? `<p><strong>Telefone:</strong> ${esc(o.cliente.telefone)}</p>` : ''}
      ${o.cliente.endereco ? `<p><strong>Endereço da obra:</strong> ${esc(o.cliente.endereco)}</p>` : ''}
    </div>
    <table>
      <thead><tr><th class="num">Qtd.</th><th>Descrição</th><th>Material</th><th>Medidas</th><th class="num">Medida total</th><th class="num">Total</th></tr></thead>
      <tbody>${o.itens.map(it => `<tr>
        <td class="num"><strong>${+it.quantidade || 1}</strong></td>
        <td>${esc(it.descricao)}${it.acabamento ? `<br><small>${/^acabamento/i.test(it.acabamento) ? '' : 'Acabamento '}${esc(acabTexto(it))}: ${fmtNum(+it.acabMetros)} m${+it.acabPreco ? ' (incluso)' : ' (sem custo)'}</small>` : ''}${it.cuba ? `<br><small>${esc(cubaTexto(it))}${+it.cubaPreco ? ' (incluso)' : ' (sem custo)'}</small>` : ''}</td><td>${esc(it.material)}</td>
        <td>${it.unidade === 'm2' ? `${fmtNum(+it.comprimento)} × ${fmtNum(+it.largura)} m` : it.unidade === 'ml' ? `${fmtNum(+it.comprimento)} m` : ''}</td>
        <td class="num">${it.unidade === 'un' ? `${medidaItem(it)} un` : `${fmtNum(medidaItem(it))} ${it.unidade === 'm2' ? 'm²' : 'm'}`}</td>
        <td class="num">${fmt(totalItem(it))}</td></tr>`).join('')}
      </tbody>
    </table>
    <div class="pr-total">
      ${o.desconto ? `<p>Subtotal: ${fmt(subtotal(o))}<br>Desconto: − ${fmt(o.desconto)}</p>` : ''}
      <p>Total: <strong>${fmt(total)}</strong></p>
      ${o.status !== 'vendido' && pctAvista(o) ? `<p class="pr-avista">À vista (${fmtPct(pctAvista(o))} de desconto): <strong>${fmt(totalAvista(o))}</strong></p>` : ''}
    </div>
    ${o.prazoEntrega ? `<p><strong>Prazo de entrega:</strong> ${esc(o.prazoEntrega)}</p>` : ''}
    ${o.observacoes ? `<p><strong>Observações:</strong> ${esc(o.observacoes)}</p>` : ''}
    <div class="pr-assin"><div>${esc(CONFIG.nome)}</div><div>${esc(o.cliente.nome)}</div></div>`;
  window.print();
}

// ============================================================
//  BACKUP
// ============================================================
$('#btn-exportar').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `backup-marmoraria-${hoje()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});
$('#inp-importar').addEventListener('change', async e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const dados = JSON.parse(await file.text());
    if (!Array.isArray(dados.orcamentos)) throw new Error();
    if (!await confirmar('Os dados atuais do sistema serão substituídos pelos do arquivo, para todos os usuários.',
      { titulo: `Importar ${dados.orcamentos.length} orçamento(s)?`, ok: 'Importar', perigo: true })) return;
    db = migrar(dados);
    salvar();
    atualizarSugestoes();
    renderOrcamentos();
    toast('Backup importado.');
  } catch {
    avisar('Escolha um arquivo de backup gerado pelo próprio sistema.', { titulo: 'Arquivo de backup inválido' });
  }
});

// ============================================================
//  INICIALIZAÇÃO
// ============================================================
$$('[data-fechar]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
$$('[data-scroll]').forEach(b => b.addEventListener('click', () => document.getElementById(b.dataset.scroll).scrollIntoView({ behavior: 'smooth' })));
window.addEventListener('hashchange', mostrarAba);
aplicarConfig();

// ---------- atualização automática ----------
// O publicar.ps1 grava versao.json a cada publicação. Se o servidor tem uma versão mais nova
// do que a aberta, recarrega a página sozinho (sem precisar de Ctrl+F5) — mas só quando
// ninguém está no meio de uma edição (janela aberta ou dados ainda sendo salvos).
async function verificarVersao() {
  if (!window.VERSAO_SISTEMA || VERSAO_SISTEMA === 'dev') return;
  let atual;
  try { atual = (await (await fetch('versao.json', { cache: 'no-store' })).json()).v; } catch { return; }
  if (!atual || atual === VERSAO_SISTEMA) return;
  const ocupado = document.querySelector('dialog[open]') || (typeof pendente !== 'undefined' && (pendente || salvando));
  if (ocupado) return; // tenta de novo na próxima verificação
  // evita recarregar em círculo se o navegador insistir na versão antiga
  let tentou = null;
  try { tentou = sessionStorage.getItem('marmoraria.recarregou'); } catch {}
  if (tentou === atual) return;
  try { sessionStorage.setItem('marmoraria.recarregou', atual); } catch {}
  location.reload();
}
verificarVersao();
document.addEventListener('visibilitychange', () => { if (!document.hidden) verificarVersao(); });
setInterval(verificarVersao, 5 * 60 * 1000);

// modo claro/escuro (o tema inicial é aplicado no <head> do index.html)
function mostrarBotaoTema() {
  const escuro = document.documentElement.dataset.tema === 'escuro';
  $('#btn-tema').textContent = escuro ? '☀️' : '🌙';
  $('#btn-tema').title = escuro ? 'Mudar para o modo claro' : 'Mudar para o modo escuro';
}
$('#btn-tema').addEventListener('click', () => {
  const novo = document.documentElement.dataset.tema === 'escuro' ? 'claro' : 'escuro';
  document.documentElement.dataset.tema = novo;
  try { localStorage.setItem('marmoraria.tema', novo); } catch {}
  mostrarBotaoTema();
});
mostrarBotaoTema();
$('.hero').style.backgroundImage =
  'radial-gradient(ellipse 34% 60% at 72% 50%, rgba(0,0,0,.75), transparent 75%),' +
  'linear-gradient(90deg, rgba(0,0,0,.6), rgba(0,0,0,.15) 55%, rgba(0,0,0,.3)),' + marmoreHero();
renderCatalogo();
atualizarSugestoes();
aplicarFundoMarmore();

// desenha o mármore uma vez e usa como imagem (mais leve para rolar a página do que o SVG com filtros)
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
function aplicarFundoMarmore() {
  // fundo geral: mármore claro
  // o CSS escolhe qual usar conforme o modo claro/escuro
  rasterizarMarmore(marmoreFundo(), url => { document.body.style.setProperty('--fundo-claro', `url("${url}")`); });
  rasterizarMarmore(marmoreFundoEscuro(), url => { document.body.style.setProperty('--fundo-escuro', `url("${url}")`); });
  // barra das abas: mármore preto com veios dourados (o mesmo do início), escurecido para leitura
  rasterizarMarmore(marmoreHero().slice(5, -2), url => {
    $('.topbar').style.backgroundImage = `linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,.45)), url("${url}")`;
  });
}
// espera producao.js carregar antes de mostrar a primeira aba
document.addEventListener('DOMContentLoaded', mostrarAba);
