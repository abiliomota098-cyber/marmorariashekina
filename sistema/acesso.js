// ============================================================
//  ACESSO RESTRITO (Supabase)
//  A Apresentação é pública. Orçamentos, Produção e Financeiro
//  exigem usuário e senha cadastrados pelo administrador.
//  Login e dados ficam no Supabase: as permissões são checadas
//  no servidor, não só aqui no navegador.
//  * só existe um administrador; só ele cria, bloqueia/libera,
//    troca senha e remove acessos (função admin-usuarios)
//  * não há cadastro aberto nem "primeiro acesso"
// ============================================================
const SUPABASE_URL = 'https://wdypikcvlrddkuzzexfa.supabase.co';
const SUPABASE_CHAVE = 'sb_publishable_kxcGIuwC2tQsOgYaGbTiFg_E1-GDNzU'; // chave pública (anon) — pode ficar no site
const INATIVIDADE_MIN = 30; // sai sozinho após 30 min sem uso

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_CHAVE, {
  // como antes: fechar o navegador encerra a sessão
  auth: { storage: window.sessionStorage, persistSession: true, autoRefreshToken: true },
});

const qa = s => document.querySelector(s);
const escH = s => String(s ?? '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
let abaDepoisLogin = 'orcamentos';
let perfil = null;          // { id, nome, admin, ativo } de quem está logado
let acessoIniciado = false; // false até conferir se já havia sessão aberta

// usuário "Fulano" vira e-mail interno — mesma regra da função admin-usuarios
const DOMINIO_USUARIOS = 'usuarios.marmorariashekina.com.br';
const emailDe = nome => String(nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') + '@' + DOMINIO_USUARIOS;

const usuarioAtual = () => perfil;

// ---------- dados na nuvem ----------
let versao = null, salvando = false, pendente = false, timerSalvar = null, estadoSync = '';

function mostrarSync(estado) {
  estadoSync = estado;
  const el = qa('#sync');
  if (!el) return;
  el.textContent = { salvando: '⟳ salvando…', salvo: '✓ salvo', erro: '⚠ sem conexão — tentando de novo' }[estado] || '';
  el.className = 'conta-sync ' + estado;
}

async function carregarDados() {
  const { data, error } = await sb.from('dados').select('conteudo, atualizado_em').eq('id', 1).maybeSingle();
  if (error) throw new Error('Não foi possível carregar os dados: ' + error.message);
  if (!data) throw new Error('Seu acesso não permite ver os dados.');
  db = migrar(data.conteudo && Array.isArray(data.conteudo.orcamentos) ? data.conteudo : { seq: 0, orcamentos: [] });
  versao = data.atualizado_em;
  pendente = false;
  mostrarSync('salvo');
}

// chamada por salvar() (app.js): junta várias alterações e envia uma vez
function agendarSalvar() {
  if (!perfil) return;
  pendente = true;
  mostrarSync('salvando');
  clearTimeout(timerSalvar);
  timerSalvar = setTimeout(enviarDados, 800);
}

async function enviarDados() {
  if (!perfil || !pendente) return;
  if (salvando) { timerSalvar = setTimeout(enviarDados, 400); return; }
  salvando = true; pendente = false;
  const { data, error } = await sb.from('dados').update({ conteudo: db }).eq('id', 1).eq('atualizado_em', versao).select('atualizado_em');
  salvando = false;
  if (error) {
    pendente = true;
    mostrarSync('erro');
    timerSalvar = setTimeout(enviarDados, 5000);
    return;
  }
  if (!data.length) {
    // ou outra pessoa salvou antes (versão mudou) ou o acesso foi bloqueado
    const { data: ainda } = await sb.from('dados').select('atualizado_em').eq('id', 1).maybeSingle();
    if (!ainda) { alert('Seu acesso foi bloqueado pelo administrador.'); return sair(); }
    alert('Outra pessoa salvou alterações ao mesmo tempo que você. Os dados foram atualizados; confira e refaça a sua última alteração, se preciso.');
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
    await carregarDados();
    mostrarAba();
    return;
  }
  versao = data[0].atualizado_em;
  mostrarSync(pendente ? 'salvando' : 'salvo');
}

// ao voltar para a aba do navegador, busca o que os outros salvaram
document.addEventListener('visibilitychange', async () => {
  if (document.hidden || !perfil || pendente || salvando || document.querySelector('dialog[open]')) return;
  const { data } = await sb.from('dados').select('atualizado_em').eq('id', 1).maybeSingle();
  if (!data) return sair();
  if (data.atualizado_em !== versao && !pendente && !salvando) { await carregarDados(); mostrarAba(); }
});
addEventListener('beforeunload', e => { if (pendente || salvando) { e.preventDefault(); e.returnValue = ''; } });

// dados que ficaram salvos só neste navegador (versão antiga do sistema)
async function oferecerImportacao() {
  if (!perfil?.admin || db.orcamentos.length) return;
  let local;
  try { local = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return; }
  if (!local || !Array.isArray(local.orcamentos) || !local.orcamentos.length) return;
  if (!confirm(`Encontrei ${local.orcamentos.length} orçamento(s) salvos só neste computador (versão antiga do sistema).\n\nEnviar para o sistema na nuvem, para todos os usuários autorizados verem?`)) return;
  db = migrar(local);
  pendente = true;
  await enviarDados();
  if (estadoSync === 'salvo') {
    localStorage.setItem(STORAGE_KEY + '.importado', localStorage.getItem(STORAGE_KEY));
    localStorage.removeItem(STORAGE_KEY);
    if (typeof toast === 'function') toast('Dados enviados para a nuvem.');
  }
}

// ---------- sessão ----------
async function carregarPerfil(user) {
  const { data } = await sb.from('perfis').select('id, nome, admin, ativo').eq('id', user.id).maybeSingle();
  return data && data.ativo ? data : null;
}

async function sair() {
  perfil = null; versao = null; pendente = false;
  clearTimeout(timerSalvar);
  db = migrar({ seq: 0, orcamentos: [] });
  await sb.auth.signOut().catch(() => {});
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
  atualizarConta();
  if (location.hash && location.hash !== '#apresentacao') location.hash = '#apresentacao';
}

// mostra/oculta as abas internas e o botão de entrar/sair
function atualizarConta() {
  const u = perfil;
  document.querySelectorAll('[data-restrito]').forEach(el => { el.hidden = !u; });
  qa('#conta').innerHTML = u
    ? `<span id="sync" class="conta-sync"></span>
       <span class="conta-nome" title="Conectado">👤 ${escH(u.nome)}</span>
       ${u.admin ? '<button type="button" class="conta-btn" data-conta="usuarios">Usuários</button>' : '<button type="button" class="conta-btn" data-conta="senha">Senha</button>'}
       <button type="button" class="conta-btn" data-conta="sair">Sair</button>`
    : '<button type="button" class="conta-btn conta-entrar" data-conta="entrar">🔒 Área restrita</button>';
  if (u) mostrarSync(estadoSync || 'salvo');
}

// ---------- login ----------
function pedirLogin(aba) {
  abaDepoisLogin = aba || 'orcamentos';
  qa('#login-erro').textContent = '';
  qa('#form-login').reset();
  if (!qa('#dlg-login').open) qa('#dlg-login').showModal();
  qa('#login-nome').focus();
}

qa('#form-login').addEventListener('submit', async e => {
  e.preventDefault();
  const erro = msg => { qa('#login-erro').textContent = msg; };
  const nome = qa('#login-nome').value.trim(), senha = qa('#login-senha').value;
  const btn = qa('#login-btn');
  btn.disabled = true; erro('');
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email: emailDe(nome), password: senha });
    if (error) {
      if (/rate|too many/i.test(error.message)) return erro('Muitas tentativas. Aguarde um pouco e tente de novo.');
      if (/banned/i.test(error.message)) return erro('Seu acesso está bloqueado. Fale com o administrador.');
      return erro('Usuário ou senha incorretos.');
    }
    perfil = await carregarPerfil(data.user);
    if (!perfil) { await sb.auth.signOut(); return erro('Seu acesso não está liberado. Fale com o administrador.'); }
    await carregarDados();
  } catch (err) {
    perfil = null;
    return erro(err.message || 'Sem conexão com o servidor.');
  } finally { btn.disabled = false; }
  marcarAtividade();
  qa('#dlg-login').close();
  atualizarConta();
  location.hash = '#' + abaDepoisLogin;
  mostrarAba();
  oferecerImportacao();
});

// ---------- usuários (só administrador) ----------
async function chamarAdmin(corpo) {
  const { data, error } = await sb.functions.invoke('admin-usuarios', { body: corpo });
  if (error) {
    let msg = error.message;
    try { msg = (await error.context.json()).erro || msg; } catch {}
    throw new Error(msg);
  }
  return data;
}

async function renderUsuarios() {
  const ul = qa('#lista-usuarios');
  ul.innerHTML = '<li><span>Carregando…</span></li>';
  const { data, error } = await sb.from('perfis').select('id, nome, admin, ativo').order('admin', { ascending: false }).order('nome');
  if (error) { ul.innerHTML = `<li><span>Erro: ${escH(error.message)}</span></li>`; return; }
  ul.innerHTML = data.map(u => `
    <li${u.ativo ? '' : ' class="bloqueado"'}><span>👤 <strong>${escH(u.nome)}</strong>${u.admin ? ' <small>administrador (você)</small>' : u.ativo ? '' : ' <small>bloqueado</small>'}</span>
      ${u.admin ? '' : `<span class="acoes-usuario">
        <button type="button" class="btn-sm" data-u-ativo="${u.id}" data-ativo="${u.ativo ? 0 : 1}">${u.ativo ? 'Bloquear' : 'Liberar'}</button>
        <button type="button" class="btn-sm" data-u-senha="${u.id}" data-nome="${escH(u.nome)}">Nova senha</button>
        <button type="button" class="btn-sm btn-danger" data-u-remover="${u.id}" data-nome="${escH(u.nome)}">Remover</button></span>`}
    </li>`).join('');
}

function abrirUsuarios(soSenha) {
  if (!perfil) return pedirLogin();
  qa('#lista-usuarios').hidden = soSenha || !perfil.admin;
  qa('#form-novo-usuario').closest('fieldset').hidden = soSenha || !perfil.admin;
  qa('#dlg-usuarios').querySelector('h3').textContent = soSenha ? 'Trocar minha senha' : 'Usuários autorizados';
  if (!soSenha && perfil.admin) renderUsuarios();
  qa('#dlg-usuarios').showModal();
}

qa('#lista-usuarios').addEventListener('click', async e => {
  const b = e.target.closest('button');
  if (!b || !perfil?.admin) return;
  try {
    if (b.dataset.uAtivo) {
      const ativo = b.dataset.ativo === '1';
      b.disabled = true;
      await chamarAdmin({ acao: 'ativo', id: b.dataset.uAtivo, ativo });
      toast(ativo ? 'Acesso liberado.' : 'Acesso bloqueado.');
    } else if (b.dataset.uSenha) {
      const senha = prompt(`Nova senha para "${b.dataset.nome}" (mínimo 8 caracteres):`);
      if (!senha) return;
      await chamarAdmin({ acao: 'senha', id: b.dataset.uSenha, senha });
      toast('Senha alterada.');
    } else if (b.dataset.uRemover) {
      if (!confirm(`Remover o acesso de "${b.dataset.nome}"? Essa pessoa não vai mais conseguir entrar.`)) return;
      b.disabled = true;
      await chamarAdmin({ acao: 'remover', id: b.dataset.uRemover });
      toast('Acesso removido.');
    } else return;
  } catch (err) { alert(err.message); }
  renderUsuarios();
});

qa('#form-novo-usuario').addEventListener('submit', async e => {
  e.preventDefault();
  if (!perfil?.admin) return;
  const nome = qa('#nu-nome').value.trim(), btn = e.target.querySelector('button');
  btn.disabled = true;
  try {
    await chamarAdmin({ acao: 'criar', nome, senha: qa('#nu-senha').value });
    e.target.reset();
    toast(`Usuário "${nome}" cadastrado.`);
    renderUsuarios();
  } catch (err) { alert(err.message); }
  finally { btn.disabled = false; }
});

qa('#form-trocar-senha').addEventListener('submit', async e => {
  e.preventDefault();
  if (!perfil) return;
  const { data: { user } } = await sb.auth.getUser();
  const { error: e1 } = await sb.auth.signInWithPassword({ email: user.email, password: qa('#ts-atual').value });
  if (e1) return alert('Senha atual incorreta.');
  const { error } = await sb.auth.updateUser({ password: qa('#ts-nova').value });
  if (error) return alert(/weak|short|least/i.test(error.message) ? 'A nova senha é fraca demais (mínimo 8 caracteres).' : error.message);
  e.target.reset();
  toast('Senha alterada.');
});

qa('#conta').addEventListener('click', e => {
  const a = e.target.closest('[data-conta]')?.dataset.conta;
  if (a === 'entrar') pedirLogin('orcamentos');
  if (a === 'sair') sair();
  if (a === 'usuarios') abrirUsuarios(false);
  if (a === 'senha') abrirUsuarios(true);
});

// ---------- inatividade ----------
const ATIV_KEY = 'marmoraria.atividade';
const marcarAtividade = () => sessionStorage.setItem(ATIV_KEY, String(Date.now()));
const inativo = () => Date.now() - (+sessionStorage.getItem(ATIV_KEY) || 0) > INATIVIDADE_MIN * 60000;
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => { if (perfil) marcarAtividade(); }, { passive: true }));
setInterval(() => { if (perfil && inativo() && !pendente && !salvando) sair(); }, 30000);

// ---------- início: retoma a sessão aberta nesta aba, se houver ----------
const acessoPronto = new Promise(pronto => {
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session && !inativo()) {
        perfil = await carregarPerfil(session.user);
        if (perfil) await carregarDados(); else await sb.auth.signOut();
      } else if (session) await sb.auth.signOut();
    } catch { perfil = null; }
    acessoIniciado = true;
    atualizarConta();
    mostrarAba();
    pronto();
  });
});

atualizarConta();
