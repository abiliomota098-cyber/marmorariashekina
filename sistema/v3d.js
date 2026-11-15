// ============================================================
//  VISUALIZAÇÃO 3D do desenho da produção
//  Usa Three.js (pasta vendor/), carregado só na primeira vez que abre o 3D.
//  Eixos: x do desenho → X · y do desenho → Z (frente da peça virada para quem olha) · altura → Y
//  Unidades em centímetros, tampo da pedra em Y = 0.
// ============================================================
const v3d = { renderer: null, scene: null, camera: null, controls: null, anim: 0, obs: null, centro: null, dist: 0 };
const cacheTex3d = {};
const TEX_CM = [70, 52]; // tamanho real (cm) coberto por uma repetição da textura da pedra

function carregarScript(src) {
  return new Promise((ok, erro) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = erro;
    document.head.appendChild(s);
  });
}
async function carregarThree() {
  if (window.THREE?.OrbitControls) return;
  if (!window.THREE) await carregarScript('vendor/three.min.js');
  await carregarScript('vendor/OrbitControls.js');
}

async function abrir3D() {
  const folha = folhaAtual();
  if (!folha.formas.some(f => f.t === 'peca'))
    return alert('Desenhe as peças (ferramenta Peça ou "Peças do orçamento") antes de ver em 3D.');
  try { await carregarThree(); } catch { return alert('Não foi possível carregar o módulo 3D (pasta vendor).'); }
  $('#v3d-titulo').textContent = `3D — Obra #${des.obra.numero} · ${folha.nome}`;
  $('#v3d-esp').value = String(folha.espessura || 2);
  $('#dlg-3d').showModal();
  await montar3D();
}

async function montar3D() {
  limpar3D();
  const folha = folhaAtual(), t = +folha.espessura || 2, area = $('#v3d-area');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#ece8e1');
  const grupo = new THREE.Group();
  scene.add(grupo);
  for (const p of folha.formas.filter(f => f.t === 'peca')) await montarPeca(grupo, p, folha.formas, t);

  const caixa = new THREE.Box3().setFromObject(grupo);
  const centro = caixa.getCenter(new THREE.Vector3()), tam = caixa.getSize(new THREE.Vector3());
  const raio = Math.max(tam.x, tam.z, 60);

  const piso = new THREE.Mesh(new THREE.PlaneGeometry(raio * 8, raio * 8), new THREE.MeshStandardMaterial({ color: '#d9d2c6', roughness: 1 }));
  piso.rotation.x = -Math.PI / 2;
  piso.position.set(centro.x, caixa.min.y - 25, centro.z);
  piso.receiveShadow = true;
  scene.add(piso);

  scene.add(new THREE.HemisphereLight('#ffffff', '#8c8378', 0.6));
  const sol = new THREE.DirectionalLight('#fff8ec', 0.65);
  sol.position.set(centro.x - raio * 0.6, raio * 1.6, centro.z + raio * 0.9);
  sol.target.position.copy(centro);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -raio, right: raio, top: raio, bottom: -raio, near: 1, far: raio * 5 });
  scene.add(sol, sol.target);

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  area.prepend(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(38, 1, 1, raio * 30);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.495; // não deixa a câmera passar para baixo do piso
  Object.assign(v3d, { renderer, scene, camera, controls, centro, dist: raio * 0.95 });
  centralizar3D();

  const ajustar = () => {
    const w = area.clientWidth, h = area.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  v3d.obs = new ResizeObserver(ajustar);
  v3d.obs.observe(area);
  ajustar();

  const loop = () => {
    controls.autoRotate = $('#v3d-girar').checked;
    controls.update();
    renderer.render(scene, camera);
    v3d.anim = requestAnimationFrame(loop);
  };
  loop();
}

function centralizar3D() {
  const { camera, controls, centro, dist } = v3d;
  if (!camera) return;
  camera.position.set(centro.x + dist * 0.3, centro.y + dist * 0.55, centro.z + dist * 0.95);
  controls.target.copy(centro);
  controls.update();
}

function limpar3D() {
  cancelAnimationFrame(v3d.anim);
  v3d.obs?.disconnect();
  if (!v3d.renderer) return;
  v3d.scene.traverse(o => o.geometry?.dispose());
  v3d.controls.dispose();
  v3d.renderer.dispose();
  v3d.renderer.domElement.remove();
  v3d.renderer = v3d.camera = null;
}

// ---------- peças ----------
function adicionar3d(grupo, geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = m.receiveShadow = true;
  grupo.add(m);
  return m;
}

async function montarPeca(grupo, p, formas, t) {
  const mat = await materialPedra(p);

  // tampo com os recortes e furos que estão dentro da peça
  const dentro = formas.filter(f => (f.t === 'recorte' || f.t === 'circulo') &&
    pontosForma(f).every(([x, y]) => x > p.x && x < p.x + p.w && y > p.y && y < p.y + p.h));
  const forma = new THREE.Shape();
  forma.moveTo(p.x, p.y); forma.lineTo(p.x + p.w, p.y); forma.lineTo(p.x + p.w, p.y + p.h); forma.lineTo(p.x, p.y + p.h); forma.closePath();
  dentro.forEach(r => {
    const furo = new THREE.Path();
    if (r.t === 'recorte') {
      furo.moveTo(r.x, r.y); furo.lineTo(r.x, r.y + r.h); furo.lineTo(r.x + r.w, r.y + r.h); furo.lineTo(r.x + r.w, r.y); furo.closePath();
    } else furo.absarc(r.cx, r.cy, r.r, 0, Math.PI * 2, true);
    forma.holes.push(furo);
  });
  const tampo = new THREE.ExtrudeGeometry(forma, { depth: t, bevelEnabled: false, curveSegments: 24 });
  tampo.rotateX(Math.PI / 2); // extrusão vira altura: tampo de Y = 0 até Y = -t
  adicionar3d(grupo, tampo, mat);

  // acabamentos: meia esquadria = saia na borda · outros (boleado) = borda arredondada
  const saia = Math.max(+p.saia || 4, t + 0.5);
  Object.entries(bordasDe(p)).forEach(([lado, nome]) => {
    const horiz = lado === 'frente' || lado === 'fundo', comp = horiz ? p.w : p.h;
    const [bx, bz] = { frente: [p.x + p.w / 2, p.y + p.h], fundo: [p.x + p.w / 2, p.y], esq: [p.x, p.y + p.h / 2], dir: [p.x + p.w, p.y + p.h / 2] }[lado];
    const paraDentro = { frente: -1, fundo: 1, esq: 1, dir: -1 }[lado];
    if (ehEsquadria(nome)) {
      const g = horiz ? new THREE.BoxGeometry(comp, saia, t) : new THREE.BoxGeometry(t, saia, comp);
      const m = adicionar3d(grupo, g, materialEscalado(mat, comp, saia));
      // 0,05 cm para fora/abaixo: evita faces no mesmo plano do tampo (listras na tela)
      const desloc = paraDentro * (t / 2 - 0.05);
      m.position.set(horiz ? bx : bx + desloc, -saia / 2 - 0.05, horiz ? bz + desloc : bz);
    } else {
      const g = new THREE.CylinderGeometry(t / 2, t / 2, comp, 24);
      horiz ? g.rotateZ(Math.PI / 2) : g.rotateX(Math.PI / 2);
      const m = adicionar3d(grupo, g, materialEscalado(mat, comp, t * 1.6));
      m.position.set(bx, -t / 2, bz);
    }
  });

  // espelhos: placa vertical em pé sobre o tampo, encostada no lado (parede)
  Object.entries(p.espelhos || {}).forEach(([lado, alt]) => {
    alt = +alt;
    const horiz = lado === 'frente' || lado === 'fundo', comp = horiz ? p.w : p.h;
    const [bx, bz] = { frente: [p.x + p.w / 2, p.y + p.h], fundo: [p.x + p.w / 2, p.y], esq: [p.x, p.y + p.h / 2], dir: [p.x + p.w, p.y + p.h / 2] }[lado];
    const paraDentro = { frente: -1, fundo: 1, esq: 1, dir: -1 }[lado];
    const g = horiz ? new THREE.BoxGeometry(comp, alt, t) : new THREE.BoxGeometry(t, alt, comp);
    const m = adicionar3d(grupo, g, materialEscalado(mat, comp, alt));
    m.position.set(horiz ? bx : bx + paraDentro * t / 2, alt / 2 + 0.02, horiz ? bz + paraDentro * t / 2 : bz);
  });

  // cuba (inox) e cooktop (vidro preto) pelos nomes dos recortes
  dentro.filter(r => r.t === 'recorte').forEach(r => {
    if (/cuba/i.test(r.rotulo || '')) {
      const inox = new THREE.MeshStandardMaterial({ color: '#c3c7cc', metalness: 0.55, roughness: 0.3, side: THREE.BackSide });
      adicionar3d(grupo, new THREE.BoxGeometry(r.w - 0.4, 18, r.h - 0.4), inox).position.set(r.x + r.w / 2, -t - 9, r.y + r.h / 2);
    } else if (/cook|fog/i.test(r.rotulo || '')) {
      const vidro = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.12, metalness: 0.3 });
      adicionar3d(grupo, new THREE.BoxGeometry(r.w + 5, 0.6, r.h + 5), vidro).position.set(r.x + r.w / 2, 0.3, r.y + r.h / 2);
    }
  });
}

// ---------- material com a textura da pedra do catálogo ----------
function pedraDoNome(nome) {
  const n = chaveNome(nome);
  const lista = [...CATALOGO].sort((a, b) => b.nome.length - a.nome.length);
  return lista.find(c => n.includes(chaveNome(c.nome))) ||
    lista.find(c => {
      const curto = chaveNome(c.nome).replace(/^(marmore|quartzito|granito) /, '');
      return curto.length > 4 && n.includes(curto);
    });
}

async function materialPedra(p) {
  const nome = p.material || p.rotulo || '';
  const pedra = pedraDoNome(nome);
  const fosco = /escovad|levigad|apicoad/i.test(nome);
  const mat = new THREE.MeshStandardMaterial({ color: '#e6dfd2', roughness: fosco ? 0.75 : 0.28, metalness: 0 });
  if (pedra) {
    const tex = await texturaPedra3d(pedra);
    if (tex) { mat.map = tex; mat.color.set('#ffffff'); } else mat.color.set(pedra.tex.base);
  }
  return mat;
}

function texturaPedra3d(pedra) {
  return (cacheTex3d[pedra.id] ??= new Promise(ok => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 400; c.height = 300;
      c.getContext('2d').drawImage(img, 0, 0);
      const tx = new THREE.CanvasTexture(c);
      tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
      tx.repeat.set(1 / TEX_CM[0], 1 / TEX_CM[1]);
      tx.anisotropy = 4;
      ok(tx);
    };
    img.onerror = () => ok(null);
    img.src = texturaPedra(pedra.tex, CATALOGO.indexOf(pedra) * 13 + 1).slice(5, -2); // tira o url('...')
  }));
}

// caixas e cilindros têm UV de 0 a 1: ajusta a repetição ao tamanho real da peça
function materialEscalado(mat, largura, altura) {
  if (!mat.map) return mat;
  const m = mat.clone();
  m.map = mat.map.clone();
  m.map.repeat.set(largura / TEX_CM[0], altura / TEX_CM[1]);
  m.map.needsUpdate = true;
  return m;
}

// ---------- botões ----------
$('#des-3d').addEventListener('click', abrir3D);
$('#dlg-3d').addEventListener('close', limpar3D);
$('#v3d-esp').addEventListener('change', e => { folhaAtual().espessura = +e.target.value; salvar(); montar3D(); });
$('#v3d-reset').addEventListener('click', centralizar3D);
$('#v3d-foto').addEventListener('click', () => {
  if (!v3d.renderer) return;
  const a = document.createElement('a');
  a.href = v3d.renderer.domElement.toDataURL('image/png');
  a.download = `obra-${des.obra.numero}-3d.png`;
  a.click();
});
