// ============================================================
//  ACESSO RESTRITO
//  A Apresentação é pública. Orçamentos, Produção e Financeiro
//  exigem usuário e senha. As senhas são guardadas apenas como
//  hash PBKDF2 (com sal), nunca em texto.
// ============================================================
const USUARIOS_KEY = 'marmoraria.usuarios.v1';
const SESSAO_KEY = 'marmoraria.sessao';
const INATIVIDADE_MIN = 30; // sai sozinho após 30 min sem uso

const qa = s => document.querySelector(s);
let abaDepoisLogin = 'orcamentos';

function lerUsuarios() {
  try { return JSON.parse(localStorage.getItem(USUARIOS_KEY)) || []; } catch { return []; }
}
const gravarUsuarios = lista => localStorage.setItem(USUARIOS_KEY, JSON.stringify(lista));
const chaveUsuario = s => String(s || '').trim().toLowerCase();

const paraHex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
async function hashSenha(senha, salHex) {
  if (!crypto?.subtle) throw new Error('Este navegador não permite criptografia aqui.');
  const sal = new Uint8Array(salHex.match(/../g).map(h => parseInt(h, 16)));
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: sal, iterations: 150000, hash: 'SHA-256' }, chave, 256);
  return paraHex(bits);
}
async function criarCredencial(nome, senha, admin) {
  const sal = paraHex(crypto.getRandomValues(new Uint8Array(16)));
  return { nome: nome.trim(), sal, hash: await hashSenha(senha, sal), admin: !!admin };
}

// ---------- sessão ----------
function usuarioAtual() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSAO_KEY));
    if (!s || Date.now() > s.ate) return null;
    const u = lerUsuarios().find(x => chaveUsuario(x.nome) === chaveUsuario(s.nome));
    return u || null;
  } catch { return null; }
}
const renovarSessao = nome => sessionStorage.setItem(SESSAO_KEY, JSON.stringify({ nome, ate: Date.now() + INATIVIDADE_MIN * 60000 }));

function sair() {
  sessionStorage.removeItem(SESSAO_KEY);
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
  atualizarConta();
  if (location.hash && location.hash !== '#apresentacao') location.hash = '#apresentacao';
}

// mostra/oculta as abas internas e o botão de entrar/sair
function atualizarConta() {
  const u = usuarioAtual();
  document.querySelectorAll('[data-restrito]').forEach(el => { el.hidden = !u; });
  qa('#conta').innerHTML = u
    ? `<span class="conta-nome" title="Conectado">👤 ${u.nome.replace(/[<>&"]/g, '')}</span>
       ${u.admin ? '<button type="button" class="conta-btn" data-conta="usuarios">Usuários</button>' : '<button type="button" class="conta-btn" data-conta="senha">Senha</button>'}
       <button type="button" class="conta-btn" data-conta="sair">Sair</button>`
    : '<button type="button" class="conta-btn conta-entrar" data-conta="entrar">🔒 Área restrita</button>';
}

// ---------- login / primeiro acesso ----------
function pedirLogin(aba) {
  abaDepoisLogin = aba || 'orcamentos';
  const primeiro = !lerUsuarios().length;
  qa('#login-titulo').textContent = primeiro ? 'Primeiro acesso — criar administrador' : 'Área restrita';
  qa('#login-dica').textContent = primeiro
    ? 'Crie o usuário administrador. Depois ele pode cadastrar as outras pessoas autorizadas.'
    : 'Orçamentos, Produção e Financeiro são apenas para pessoas autorizadas.';
  qa('#login-conf-wrap').hidden = !primeiro;
  qa('#login-conf').required = primeiro;
  qa('#login-senha').autocomplete = primeiro ? 'new-password' : 'current-password';
  qa('#login-btn').textContent = primeiro ? 'Criar e entrar' : 'Entrar';
  qa('#login-erro').textContent = '';
  qa('#form-login').reset();
  if (!qa('#dlg-login').open) qa('#dlg-login').showModal();
  qa('#login-nome').focus();
}

let tentativas = 0, bloqueadoAte = 0;
qa('#form-login').addEventListener('submit', async e => {
  e.preventDefault();
  const erro = msg => { qa('#login-erro').textContent = msg; };
  const nome = qa('#login-nome').value.trim(), senha = qa('#login-senha').value;
  const lista = lerUsuarios();
  try {
    if (!lista.length) {
      if (senha.length < 6) return erro('A senha precisa ter pelo menos 6 caracteres.');
      if (senha !== qa('#login-conf').value) return erro('As senhas não conferem.');
      gravarUsuarios([await criarCredencial(nome, senha, true)]);
    } else {
      if (Date.now() < bloqueadoAte) return erro(`Muitas tentativas. Aguarde ${Math.ceil((bloqueadoAte - Date.now()) / 1000)} s.`);
      const u = lista.find(x => chaveUsuario(x.nome) === chaveUsuario(nome));
      if (!u || (await hashSenha(senha, u.sal)) !== u.hash) {
        if (++tentativas >= 5) { bloqueadoAte = Date.now() + 60000; tentativas = 0; }
        return erro('Usuário ou senha incorretos.');
      }
      tentativas = 0;
    }
  } catch (err) { return erro(err.message); }
  const u = lerUsuarios().find(x => chaveUsuario(x.nome) === chaveUsuario(nome));
  renovarSessao(u.nome);
  qa('#dlg-login').close();
  atualizarConta();
  location.hash = '#' + abaDepoisLogin;
  if (typeof mostrarAba === 'function') mostrarAba();
});

// ---------- usuários ----------
function renderUsuarios() {
  const eu = usuarioAtual();
  qa('#lista-usuarios').innerHTML = lerUsuarios().map((u, i) => `
    <li><span>👤 <strong>${u.nome.replace(/[<>&"]/g, '')}</strong>${u.admin ? ' <small>administrador</small>' : ''}${chaveUsuario(u.nome) === chaveUsuario(eu?.nome) ? ' <small>(você)</small>' : ''}</span>
      ${chaveUsuario(u.nome) !== chaveUsuario(eu?.nome) ? `<button type="button" class="btn-sm btn-danger" data-remover="${i}">Remover</button>` : ''}</li>`).join('');
}
function abrirUsuarios(soSenha) {
  const u = usuarioAtual();
  if (!u) return pedirLogin();
  qa('#lista-usuarios').hidden = soSenha;
  qa('#form-novo-usuario').closest('fieldset').hidden = soSenha || !u.admin;
  renderUsuarios();
  qa('#dlg-usuarios').showModal();
}
qa('#lista-usuarios').addEventListener('click', e => {
  const b = e.target.closest('[data-remover]');
  if (!b || !usuarioAtual()?.admin) return;
  const lista = lerUsuarios(), u = lista[+b.dataset.remover];
  if (!confirm(`Remover o acesso de "${u.nome}"?`)) return;
  lista.splice(+b.dataset.remover, 1);
  if (!lista.some(x => x.admin)) return alert('Precisa ficar pelo menos um administrador.');
  gravarUsuarios(lista);
  renderUsuarios();
});
qa('#form-novo-usuario').addEventListener('submit', async e => {
  e.preventDefault();
  if (!usuarioAtual()?.admin) return;
  const nome = qa('#nu-nome').value.trim(), lista = lerUsuarios();
  if (lista.some(x => chaveUsuario(x.nome) === chaveUsuario(nome))) return alert('Já existe um usuário com esse nome.');
  lista.push(await criarCredencial(nome, qa('#nu-senha').value, qa('#nu-admin').checked));
  gravarUsuarios(lista);
  e.target.reset();
  renderUsuarios();
  if (typeof toast === 'function') toast(`Usuário "${nome}" cadastrado.`);
});
qa('#form-trocar-senha').addEventListener('submit', async e => {
  e.preventDefault();
  const eu = usuarioAtual();
  if (!eu) return;
  if ((await hashSenha(qa('#ts-atual').value, eu.sal)) !== eu.hash) return alert('Senha atual incorreta.');
  const lista = lerUsuarios(), i = lista.findIndex(x => chaveUsuario(x.nome) === chaveUsuario(eu.nome));
  lista[i] = await criarCredencial(eu.nome, qa('#ts-nova').value, eu.admin);
  gravarUsuarios(lista);
  e.target.reset();
  if (typeof toast === 'function') toast('Senha alterada.');
});

qa('#conta').addEventListener('click', e => {
  const a = e.target.closest('[data-conta]')?.dataset.conta;
  if (a === 'entrar') pedirLogin('orcamentos');
  if (a === 'sair') sair();
  if (a === 'usuarios') abrirUsuarios(false);
  if (a === 'senha') abrirUsuarios(true);
});

// inatividade: renova a sessão enquanto a pessoa usa o sistema; expira sozinha depois
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => {
  const u = usuarioAtual();
  if (u) renovarSessao(u.nome);
}, { passive: true }));
setInterval(() => {
  if (!usuarioAtual() && document.querySelector('[data-restrito]:not([hidden])')) sair();
}, 30000);

atualizarConta();
