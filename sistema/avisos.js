// ============================================================
//  AVISOS E SUGESTÕES NO VISUAL DO SISTEMA
//  Substituem as janelas do navegador (alert / confirm / prompt)
//  e a lista de sugestões nativa (<datalist>).
//    await avisar('Mensagem', { titulo })
//    if (await confirmar('Mensagem', { titulo, ok, perigo })) ...
//    const txt = await perguntar('Rótulo', 'valor inicial', { titulo, tipo })
//  Campos com data-lista="id-do-datalist" ganham sugestões próprias.
// ============================================================
(() => {
  const dlg = document.createElement('dialog');
  dlg.className = 'dlg dlg-sm aviso';
  dlg.innerHTML = `
    <form method="dialog">
      <div class="aviso-corpo">
        <div class="aviso-icone" aria-hidden="true"></div>
        <div class="aviso-texto">
          <h3 class="aviso-titulo"></h3>
          <p class="aviso-msg"></p>
          <label class="aviso-campo" hidden><span></span><input></label>
        </div>
      </div>
      <footer class="aviso-botoes">
        <button type="button" class="btn btn-ghost-dark" value="nao">Cancelar</button>
        <button class="btn btn-gold" value="sim">OK</button>
      </footer>
    </form>`;
  const $a = s => dlg.querySelector(s);
  const btnNao = $a('[value="nao"]'), btnSim = $a('[value="sim"]'), campo = $a('.aviso-campo input');
  let resolver = null;

  function fechar(valor) {
    if (!resolver) return;
    const r = resolver; resolver = null;
    dlg.close();
    r(valor);
  }
  btnNao.addEventListener('click', () => fechar(false));
  dlg.addEventListener('cancel', e => { e.preventDefault(); fechar(false); }); // tecla Esc
  $a('form').addEventListener('submit', e => { e.preventDefault(); fechar(true); });

  function abrir({ titulo, msg, tipo, ok, cancelar, perigo, rotulo, valor, tipoCampo }) {
    if (!dlg.isConnected) document.body.appendChild(dlg);
    if (resolver) fechar(false);
    dlg.dataset.tipo = perigo ? 'perigo' : tipo;
    $a('.aviso-icone').textContent = perigo ? '!' : { info: 'i', confirmar: '?', perguntar: '✎' }[tipo];
    $a('.aviso-titulo').textContent = titulo || '';
    $a('.aviso-titulo').hidden = !titulo;
    $a('.aviso-msg').textContent = msg || '';
    $a('.aviso-msg').hidden = !msg;
    const temCampo = tipo === 'perguntar';
    $a('.aviso-campo').hidden = !temCampo;
    campo.required = false;
    if (temCampo) {
      $a('.aviso-campo span').textContent = rotulo || '';
      campo.type = tipoCampo || 'text';
      campo.value = valor ?? '';
    }
    btnNao.hidden = tipo === 'info';
    btnNao.textContent = cancelar || 'Cancelar';
    btnSim.textContent = ok || (tipo === 'info' ? 'Entendi' : 'Confirmar');
    btnSim.className = 'btn ' + (perigo ? 'btn-perigo' : 'btn-gold');
    dlg.showModal();
    if (temCampo) { campo.focus(); campo.select(); } else btnSim.focus();
    return new Promise(r => { resolver = r; });
  }

  window.avisar = (msg, o = {}) => abrir({ ...o, tipo: 'info', msg }).then(() => {});
  window.confirmar = (msg, o = {}) => abrir({ ...o, tipo: 'confirmar', msg });
  window.perguntar = (rotulo, valor = '', o = {}) =>
    abrir({ ...o, tipo: 'perguntar', msg: o.msg, rotulo, valor, tipoCampo: o.tipo }).then(sim => (sim ? campo.value : null));

  // ---------- sugestões (substitui o <datalist> do navegador) ----------
  const caixa = document.createElement('ul');
  caixa.className = 'sugestoes';
  caixa.setAttribute('role', 'listbox');
  caixa.hidden = true;
  let alvo = null, itens = [], marcado = -1;

  const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function opcoes(input) {
    const dl = document.getElementById(input.dataset.lista);
    return dl ? [...dl.options].map(o => o.value).filter(Boolean) : [];
  }
  function posicionar() {
    if (!alvo) return;
    const r = alvo.getBoundingClientRect();
    const larg = Math.max(r.width, 240);
    caixa.style.left = Math.min(r.left, innerWidth - larg - 8) + 'px';
    caixa.style.width = larg + 'px';
    const abaixo = innerHeight - r.bottom;
    if (abaixo < 220 && r.top > abaixo) { caixa.style.top = ''; caixa.style.bottom = (innerHeight - r.top + 4) + 'px'; }
    else { caixa.style.bottom = ''; caixa.style.top = (r.bottom + 4) + 'px'; }
  }
  function mostrar(input) {
    alvo = input;
    const termo = semAcento(input.value).trim();
    const todas = opcoes(input);
    itens = termo ? todas.filter(v => semAcento(v).includes(termo) && semAcento(v) !== termo) : todas;
    marcado = -1;
    if (!itens.length) return esconder();
    caixa.innerHTML = itens.map((v, i) => `<li role="option" data-i="${i}"></li>`).join('');
    caixa.querySelectorAll('li').forEach((li, i) => { li.textContent = itens[i]; });
    // fica dentro do diálogo aberto (camada de cima), senão no body
    const pai = input.closest('dialog[open]') || document.body;
    if (caixa.parentNode !== pai) pai.appendChild(caixa);
    caixa.hidden = false;
    posicionar();
  }
  function esconder() { caixa.hidden = true; marcado = -1; }
  function escolher(i) {
    if (!alvo || !itens[i]) return;
    alvo.value = itens[i];
    alvo.dispatchEvent(new Event('input', { bubbles: true }));
    alvo.dispatchEvent(new Event('change', { bubbles: true }));
    esconder();
  }
  function marcar(i) {
    const lis = caixa.querySelectorAll('li');
    if (!lis.length) return;
    marcado = (i + lis.length) % lis.length;
    lis.forEach((li, k) => li.classList.toggle('marcado', k === marcado));
    lis[marcado].scrollIntoView({ block: 'nearest' });
  }

  document.addEventListener('focusin', e => { if (e.target.matches?.('input[data-lista]')) mostrar(e.target); });
  document.addEventListener('input', e => { if (e.target === alvo && e.isTrusted) mostrar(alvo); });
  document.addEventListener('focusout', e => { if (e.target === alvo) setTimeout(() => { if (document.activeElement !== alvo) esconder(); }, 150); });
  document.addEventListener('keydown', e => {
    if (e.target !== alvo) return;
    if (caixa.hidden && e.key === 'ArrowDown') { mostrar(alvo); return; }
    if (caixa.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); marcar(marcado + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); marcar(marcado - 1); }
    else if (e.key === 'Enter' && marcado >= 0) { e.preventDefault(); escolher(marcado); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); esconder(); }
  }, true);
  caixa.addEventListener('mousedown', e => e.preventDefault()); // não tira o foco do campo
  caixa.addEventListener('click', e => { const li = e.target.closest('li'); if (li) escolher(+li.dataset.i); });
  addEventListener('resize', () => { if (!caixa.hidden) posicionar(); });
  document.addEventListener('scroll', () => { if (!caixa.hidden) posicionar(); }, true);
})();
