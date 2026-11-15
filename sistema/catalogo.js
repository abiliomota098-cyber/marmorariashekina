// ============================================================
//  CATÁLOGO DE PEDRAS (aba Apresentação)
//
//  FOTOS REAIS: salve a foto da chapa em  fotos/<id>.jpg
//  (ex.: fotos/preto-sao-gabriel.jpg). Quando a foto existe ela é
//  usada; quando não existe, o site desenha uma textura ilustrativa.
//
//  preco: 1 = econômico · 2 = intermediário · 3 = alto padrão
//  tex:   desenho ilustrativo — base (cor de fundo), pontos (granulado),
//         veio (veios de mármore), faixa (travertino)
// ============================================================
const TIPOS_PEDRA = {
  granito: { t: 'Granitos', s: 'Granito', info: 'Pedra natural muito dura: resiste bem a riscos, calor e manchas. A escolha mais segura para cozinhas e áreas externas.' },
  marmore: { t: 'Mármores', s: 'Mármore', info: 'Pedra natural nobre e de veios marcantes. É mais macia e sensível a ácidos (limão, vinagre) — ideal para banheiros, lavabos, pisos e decoração.' },
  quartzito: { t: 'Quartzitos', s: 'Quartzito', info: 'A beleza do mármore com a resistência do granito. Ótimo para cozinhas e ilhas de alto padrão.' },
  industrializado: { t: 'Industrializados', s: 'Industrializado', info: 'Superfícies fabricadas com cor uniforme e baixa porosidade: quase não mancham e não precisam de impermeabilização.' },
};

const FAIXA_PRECO = { 1: 'Econômico', 2: 'Intermediário', 3: 'Alto padrão' };

const CATALOGO = [
  // ---------- GRANITOS ----------
  { id: 'preto-sao-gabriel', nome: 'Preto São Gabriel', tipo: 'granito', preco: 1, tons: 'Preto com grãos acinzentados',
    desc: 'O granito mais pedido para cozinhas. Resistente, fácil de limpar e combina com qualquer estilo.',
    uso: ['Cozinha', 'Banheiro', 'Área gourmet', 'Soleira'], tex: { base: '#151515', pontos: [['#3e3e3e', .5], ['#626262', .22]] } },
  { id: 'preto-absoluto', nome: 'Preto Absoluto', tipo: 'granito', preco: 2, tons: 'Preto uniforme, quase sem desenho',
    desc: 'Visual liso e elegante, muito usado em projetos modernos e minimalistas.',
    uso: ['Cozinha', 'Banheiro', 'Escada'], tex: { base: '#0c0c0c', pontos: [['#1f1f1f', .35]] } },
  { id: 'preto-via-lactea', nome: 'Preto Via Láctea', tipo: 'granito', preco: 2, tons: 'Preto com pontos brancos',
    desc: 'Fundo preto salpicado de branco, lembrando um céu estrelado. Marcante em ilhas e bancadas.',
    uso: ['Cozinha', 'Área gourmet', 'Banheiro'], tex: { base: '#141414', pontos: [['#3a3a3a', .35], ['#ece8e1', .14]] } },
  { id: 'branco-itaunas', nome: 'Branco Itaúnas', tipo: 'granito', preco: 1, tons: 'Branco/creme com pontos bege',
    desc: 'Granito claro mais popular do Brasil. Ilumina o ambiente com ótimo custo-benefício.',
    uso: ['Cozinha', 'Banheiro', 'Lavanderia', 'Piso'], tex: { base: '#ebe5da', pontos: [['#c9bba6', .4], ['#9b8f80', .2]] } },
  { id: 'branco-siena', nome: 'Branco Siena', tipo: 'granito', preco: 1, tons: 'Branco com pontos cinza e bege',
    desc: 'Claro e discreto, com granulado miúdo. Muito usado em cozinhas e banheiros.',
    uso: ['Cozinha', 'Banheiro', 'Lavanderia'], tex: { base: '#e9e5de', pontos: [['#b4aa9d', .35], ['#6f6b67', .18]] } },
  { id: 'branco-dallas', nome: 'Branco Dallas', tipo: 'granito', preco: 1, tons: 'Branco com pontos pretos',
    desc: 'Fundo branco com pintas pretas bem definidas. Contraste moderno a bom preço.',
    uso: ['Cozinha', 'Banheiro', 'Lavanderia'], tex: { base: '#edeae5', pontos: [['#8a8580', .25], ['#262626', .17]] } },
  { id: 'cinza-andorinha', nome: 'Cinza Andorinha', tipo: 'granito', preco: 1, tons: 'Cinza médio com pontos preto e branco',
    desc: 'Clássico e muito resistente. Muito usado em pias, soleiras, peitoris e escadas.',
    uso: ['Cozinha', 'Soleira', 'Peitoril', 'Escada'], tex: { base: '#9b9994', pontos: [['#d8d5cf', .35], ['#3f3f3f', .35]] } },
  { id: 'cinza-corumba', nome: 'Cinza Corumbá', tipo: 'granito', preco: 1, tons: 'Cinza escuro granulado',
    desc: 'Tom mais fechado que o Andorinha, disfarça bem o uso diário.',
    uso: ['Cozinha', 'Área externa', 'Escada'], tex: { base: '#6d6b68', pontos: [['#2c2c2c', .38], ['#b9b5ad', .3]] } },
  { id: 'verde-ubatuba', nome: 'Verde Ubatuba', tipo: 'granito', preco: 1, tons: 'Verde escuro, quase preto',
    desc: 'Escuro com reflexos esverdeados e dourados. Resistente e econômico.',
    uso: ['Cozinha', 'Área gourmet', 'Churrasqueira'], tex: { base: '#1a241d', pontos: [['#3f5b44', .45], ['#a59772', .2]] } },
  { id: 'amarelo-ornamental', nome: 'Amarelo Ornamental', tipo: 'granito', preco: 1, tons: 'Amarelo/bege com pontos marrons',
    desc: 'Tom quente e acolhedor, muito usado em cozinhas e áreas externas.',
    uso: ['Cozinha', 'Área externa', 'Piso'], tex: { base: '#d6c39b', pontos: [['#efe4cc', .35], ['#7a6a50', .3]] } },
  { id: 'cafe-imperial', nome: 'Marrom Café Imperial', tipo: 'granito', preco: 2, tons: 'Marrom café com manchas escuras',
    desc: 'Granito marrom de visual rico, combina com madeira e ambientes rústicos.',
    uso: ['Cozinha', 'Área gourmet', 'Mesa'], tex: { base: '#3d2b21', pontos: [['#6e4c37', .45], ['#171110', .3]] } },

  { id: 'branco-ceara', nome: 'Branco Ceará', tipo: 'granito', preco: 2, tons: 'Branco/creme com granulado bege',
    desc: 'Granito claro de fundo uniforme, muito procurado para cozinhas iluminadas.',
    uso: ['Cozinha', 'Banheiro', 'Lavanderia'], tex: { base: '#eee8dc', pontos: [['#cdbfa6', .35], ['#8b8378', .15]] } },
  { id: 'ocre-itabira', nome: 'Ocre Itabira', tipo: 'granito', preco: 1, tons: 'Ocre/amarelado com pontos marrons',
    desc: 'Tom terroso e quente, ótimo custo-benefício para áreas externas e churrasqueiras.',
    uso: ['Área externa', 'Churrasqueira', 'Soleira', 'Piso'], tex: { base: '#c99a5b', pontos: [['#e2c08d', .3], ['#8a5f32', .35]] } },
  { id: 'maracuja', nome: 'Maracujá', tipo: 'granito', preco: 1, tons: 'Amarelo esverdeado com pontos escuros',
    desc: 'Granito amarelo com granulado marcante, resistente e econômico.',
    uso: ['Cozinha', 'Área externa', 'Soleira'], tex: { base: '#c9b77d', pontos: [['#e5d9a8', .3], ['#6b6a4a', .35]] } },

  // ---------- MÁRMORES ----------
  { id: 'bege-bahia', nome: 'Bege Bahia', tipo: 'marmore', preco: 2, tons: 'Bege claro com pequenos fósseis',
    desc: 'Pedra nacional bege e uniforme, elegante em pisos, escadas e banheiros.',
    uso: ['Piso', 'Escada', 'Banheiro', 'Parede'], tex: { base: '#d9c7a3', pontos: [['#c9b48c', .35], ['#e8dcc2', .25]], grao: .12 } },
  { id: 'carrara', nome: 'Mármore Carrara', tipo: 'marmore', preco: 2, tons: 'Branco com veios cinza suaves',
    desc: 'O mármore italiano mais famoso do mundo. Clássico e atemporal.',
    uso: ['Banheiro', 'Lavabo', 'Piso', 'Parede'], tex: { base: '#f0efec', veio: '#8b8e95', forca: .6, angulo: 25 } },
  { id: 'calacatta', nome: 'Mármore Calacatta', tipo: 'marmore', preco: 3, tons: 'Branco intenso com veios marcantes',
    desc: 'Veios mais grossos e dourados que o Carrara. Peça de destaque em projetos de luxo.',
    uso: ['Banheiro', 'Lavabo', 'Ilha', 'Parede'], tex: { base: '#f6f3ee', veio: '#9b8a70', forca: .9, angulo: 40, grosso: true } },
  { id: 'branco-pigues', nome: 'Branco Piguês', tipo: 'marmore', preco: 2, tons: 'Branco com veios cinza leves',
    desc: 'Mármore nacional claro e delicado, ótima alternativa ao Carrara.',
    uso: ['Banheiro', 'Lavabo', 'Piso', 'Escada'], tex: { base: '#f4f1ea', veio: '#a29c90', forca: .45, angulo: 15 } },
  { id: 'branco-parana', nome: 'Branco Paraná', tipo: 'marmore', preco: 1, tons: 'Branco acinzentado com veios',
    desc: 'Mármore nacional de bom custo-benefício para pisos, escadas e soleiras.',
    uso: ['Piso', 'Escada', 'Soleira', 'Banheiro'], tex: { base: '#e7e5e0', veio: '#979ca2', forca: .5, angulo: 60 } },
  { id: 'travertino-romano', nome: 'Travertino Romano', tipo: 'marmore', preco: 2, tons: 'Bege com faixas e poros naturais',
    desc: 'Textura rústica e sofisticada. Lindo em pisos, paredes e lavabos.',
    uso: ['Piso', 'Parede', 'Lavabo', 'Área externa'], tex: { base: '#dcc8a5', faixa: '#a88b5e' } },
  { id: 'crema-marfil', nome: 'Crema Marfil', tipo: 'marmore', preco: 3, tons: 'Creme claro com veios suaves',
    desc: 'Mármore espanhol em tom marfim, elegante e acolhedor.',
    uso: ['Banheiro', 'Lavabo', 'Piso'], tex: { base: '#e6d5b8', veio: '#a88a5c', forca: .45, angulo: 70 } },
  { id: 'nero-marquina', nome: 'Nero Marquina', tipo: 'marmore', preco: 3, tons: 'Preto profundo com veios brancos',
    desc: 'Contraste dramático entre o preto e os veios brancos. Ideal para lavabos de impacto.',
    uso: ['Lavabo', 'Banheiro', 'Parede', 'Mesa'], tex: { base: '#121212', veio: '#e9e9e9', forca: .75, angulo: 35 } },
  { id: 'marrom-emperador', nome: 'Marrom Emperador', tipo: 'marmore', preco: 3, tons: 'Marrom com veios claros',
    desc: 'Tom chocolate com veios dourados. Elegância clássica.',
    uso: ['Lavabo', 'Parede', 'Lareira', 'Mesa'], tex: { base: '#4a3326', veio: '#cbab8b', forca: .7, angulo: 50 } },

  // ---------- QUARTZITOS ----------
  { id: 'taj-mahal', nome: 'Quartzito Taj Mahal', tipo: 'quartzito', preco: 3, tons: 'Creme com veios dourados',
    desc: 'Um dos quartzitos mais desejados: visual de mármore com alta resistência.',
    uso: ['Cozinha', 'Ilha', 'Banheiro'], tex: { base: '#ece2d0', veio: '#a3824f', forca: .55, angulo: 30 } },
  { id: 'mont-blanc', nome: 'Quartzito Mont Blanc', tipo: 'quartzito', preco: 2, tons: 'Branco acinzentado com veios',
    desc: 'Quartzito claro e versátil, mais acessível entre os quartzitos.',
    uso: ['Cozinha', 'Banheiro', 'Área gourmet'], tex: { base: '#e6e4e0', veio: '#8e8e8e', forca: .5, angulo: 20 } },
  { id: 'perla-venata', nome: 'Quartzito Perla Venata', tipo: 'quartzito', preco: 3, tons: 'Branco perolado com veios cinza',
    desc: 'Brasileiro, com veios acinzentados e brilho perolado. Muito exportado.',
    uso: ['Cozinha', 'Ilha', 'Banheiro', 'Parede'], tex: { base: '#e9e7e2', veio: '#8f9196', forca: .6, angulo: 45 } },
  { id: 'cristallo', nome: 'Quartzito Cristallo', tipo: 'quartzito', preco: 3, tons: 'Branco translúcido',
    desc: 'Translúcido: permite retroiluminação com LED, criando efeitos únicos.',
    uso: ['Ilha', 'Bar', 'Parede', 'Lavabo'], tex: { base: '#eef0ee', veio: '#a9b5ad', forca: .5, angulo: 75, grosso: true } },
  { id: 'azul-macaubas', nome: 'Quartzito Azul Macaúbas', tipo: 'quartzito', preco: 3, tons: 'Azul com veios claros',
    desc: 'Pedra exótica brasileira, rara e de cor intensa. Para projetos exclusivos.',
    uso: ['Lavabo', 'Bar', 'Mesa', 'Parede'], tex: { base: '#4c7ca6', veio: '#cddde9', forca: .65, angulo: 10 } },

  // ---------- INDUSTRIALIZADOS ----------
  { id: 'quartzo-branco', nome: 'Quartzo Branco', tipo: 'industrializado', preco: 2, tons: 'Branco uniforme',
    desc: 'Branco sem variação, praticamente não mancha. O queridinho das cozinhas modernas.',
    uso: ['Cozinha', 'Banheiro', 'Ilha'], tex: { base: '#f5f5f3', pontos: [['#dcdcd8', .2]], grao: .9 } },
  { id: 'branco-estelar', nome: 'Branco Estelar', tipo: 'industrializado', preco: 3, tons: 'Branco com pontos cintilantes',
    desc: 'Quartzo branco com brilho cintilante, sofisticado e fácil de limpar.',
    uso: ['Cozinha', 'Ilha', 'Banheiro'], tex: { base: '#f6f6f4', pontos: [['#ffffff', .25], ['#d8d8d4', .2]], grao: .9 } },
  { id: 'quartzo-cinza', nome: 'Quartzo Cinza', tipo: 'industrializado', preco: 2, tons: 'Cinza uniforme',
    desc: 'Cinza sóbrio e uniforme, combina com marcenaria em madeira e preto.',
    uso: ['Cozinha', 'Banheiro', 'Área gourmet'], tex: { base: '#8d8e8f', pontos: [['#949596', .3]], grao: .9 } },
  { id: 'quartzo-calacatta', nome: 'Quartzo Calacatta', tipo: 'industrializado', preco: 3, tons: 'Branco com veios',
    desc: 'Visual de mármore Calacatta com a resistência e praticidade do quartzo.',
    uso: ['Cozinha', 'Ilha', 'Banheiro'], tex: { base: '#f7f6f3', veio: '#a49b8d', forca: .55, angulo: 35 } },
  { id: 'nanoglass', nome: 'Nanoglass', tipo: 'industrializado', preco: 2, tons: 'Branco puro brilhante',
    desc: 'Branco total com brilho vítreo. Muito usado em bancadas e cubas esculpidas.',
    uso: ['Banheiro', 'Cozinha', 'Cuba esculpida'], tex: { base: '#fbfbfb' } },
  { id: 'marmoglass', nome: 'Marmoglass', tipo: 'industrializado', preco: 2, tons: 'Branco com leve granulado',
    desc: 'Branco com granulado discreto, boa opção custo-benefício entre os industrializados.',
    uso: ['Banheiro', 'Cozinha', 'Lavanderia'], tex: { base: '#f3f2ee', pontos: [['#d9d6cf', .3]], grao: .7 } },
  { id: 'ultracompacta', nome: 'Superfície Ultracompacta', tipo: 'industrializado', preco: 3, tons: 'Diversos (cimento, pedra, mármore)',
    desc: 'Lâminas finas e extremamente resistentes a calor, riscos e raios UV. Ideal até para áreas externas.',
    uso: ['Cozinha', 'Área externa', 'Revestimento'], tex: { base: '#7c7b78', pontos: [['#8f8e8a', .4], ['#6a6966', .3]], grao: .08 } },
];

// ---------- textura ilustrativa (SVG gerado) ----------
function hexParaRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => (v / 255).toFixed(3));
}
// matriz que pinta tudo com `cor` e usa o ruído (canal R) como transparência: alpha = a·R + b
function matrizCor(cor, a, b) {
  const [r, g, bl] = hexParaRgb(cor);
  return `0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${bl} ${a} 0 0 0 ${b}`;
}

// tabela de transferência com picos estreitos: cada pico vira uma linha (veio) no desenho
function tabelaPicos(picos, n = 101) {
  const v = Array(n).fill(0);
  picos.forEach(([pos, intens, larg]) => {
    for (let i = 0; i < n; i++) {
      const d = Math.abs(i / (n - 1) - pos);
      if (d < larg) v[i] = Math.max(v[i], intens * (1 - d / larg));
    }
  });
  return v.map(x => x.toFixed(2)).join(' ');
}

function texturaPedra(tex, seed) {
  let defs = '', camadas = '', n = 0;
  const camada = (turb, matriz, transform = '') => {
    const id = 'f' + n++;
    defs += `<filter id='${id}' x='0' y='0' width='100%' height='100%'>${turb}<feColorMatrix type='matrix' values='${matriz}'/></filter>`;
    camadas += transform
      ? `<rect x='-200' y='-200' width='800' height='700' filter='url(#${id})' transform='${transform}'/>`
      : `<rect width='400' height='300' filter='url(#${id})'/>`;
  };

  if (tex.pontos) {
    tex.pontos.forEach(([cor, dens], k) => {
      const limiar = 0.66 - dens * 0.24;
      camada(`<feTurbulence type='fractalNoise' baseFrequency='${tex.grao || 0.21}' numOctaves='2' seed='${seed + k * 17}'/>`,
        matrizCor(cor, 30, -30 * limiar));
    });
  }
  if (tex.veio) {
    // nuvens suaves + veios: linhas de contorno de um ruído alongado
    const w = tex.grosso ? 0.022 : 0.012;
    const veios = (freq, picos, s, ang, forca) => camada(
      `<feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='4' seed='${s}'/>` +
      `<feComponentTransfer><feFuncR type='table' tableValues='${tabelaPicos(picos)}'/></feComponentTransfer>`,
      matrizCor(tex.veio, forca, 0), `rotate(${ang} 200 150)`);
    camada(`<feTurbulence type='fractalNoise' baseFrequency='0.007' numOctaves='3' seed='${seed}'/>`, matrizCor(tex.veio, 1.1, -0.45));
    const forca = Math.min(1, tex.forca * 1.6);
    veios('0.0035 0.011', [[.42, 1, w], [.5, .7, w * .8], [.58, 1, w], [.34, .5, w * .7], [.66, .5, w * .7]], seed + 3, tex.angulo, forca);
    veios('0.008 0.022', [[.46, .7, .008], [.54, .7, .008]], seed + 9, tex.angulo + 15, forca * .6);
  }
  if (tex.faixa) {
    camada(`<feTurbulence type='fractalNoise' baseFrequency='0.003 0.06' numOctaves='3' seed='${seed}'/>`, matrizCor(tex.faixa, 3, -1.25));
    camada(`<feTurbulence type='fractalNoise' baseFrequency='0.02 0.25' numOctaves='2' seed='${seed + 5}'/>`, matrizCor('#8a6e48', 14, -9.4));
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><defs>${defs}</defs><rect width='400' height='300' fill='${tex.base}'/>${camadas}</svg>`;
  return `url('data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}')`;
}

// fundo geral do sistema: mármore claro (tipo Carrara) com veios cinza suaves e toques dourados
function marmoreFundo() {
  const W = 1600, H = 1000;
  let defs = '', corpo = '', n = 0;
  const camada = (prim, matriz, ang) => {
    const id = 'm' + n++;
    defs += `<filter id='${id}' x='0' y='0' width='100%' height='100%'>${prim}<feColorMatrix type='matrix' values='${matriz}'/></filter>`;
    corpo += `<rect x='-800' y='-800' width='3200' height='2600' filter='url(#${id})' transform='rotate(${ang} 800 500)'/>`;
  };
  const veios = (freq, picos, seed) =>
    `<feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='5' seed='${seed}'/>` +
    `<feComponentTransfer><feFuncR type='table' tableValues='${tabelaPicos(picos, 201)}'/></feComponentTransfer>`;

  camada(`<feTurbulence type='fractalNoise' baseFrequency='0.002 0.005' numOctaves='4' seed='5'/>`, matrizCor('#d9d4cb', 1.4, -0.55), 25);
  camada(veios('0.0011 0.004', [[.4, .55, .007], [.48, .3, .005], [.56, .5, .007], [.63, .3, .005]], 17), matrizCor('#9d978d', .55, 0), 25);
  camada(veios('0.0028 0.009', [[.45, .35, .004], [.53, .35, .004]], 29), matrizCor('#b3ada3', .4, 0), 38);
  camada(veios('0.0014 0.0045', [[.5, .45, .005]], 41), matrizCor('#c49a2c', .35, 0), 20);

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'><defs>${defs}</defs><rect width='${W}' height='${H}' fill='#f4f1ec'/>${corpo}</svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

// fundo do início da Apresentação: mármore preto com veios brancos e dourados
function marmoreHero() {
  const W = 1600, H = 700;
  let defs = '', corpo = '', n = 0;
  const camada = (prim, matriz, ang) => {
    const id = 'h' + n++;
    defs += `<filter id='${id}' x='0' y='0' width='100%' height='100%'>${prim}<feColorMatrix type='matrix' values='${matriz}'/></filter>`;
    corpo += `<rect x='-800' y='-800' width='3200' height='2300' filter='url(#${id})' transform='rotate(${ang} 800 350)'/>`;
  };
  const veios = (freq, picos, seed) =>
    `<feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='5' seed='${seed}'/>` +
    `<feComponentTransfer><feFuncR type='table' tableValues='${tabelaPicos(picos, 201)}'/></feComponentTransfer>`;

  camada(`<feTurbulence type='fractalNoise' baseFrequency='0.0025 0.006' numOctaves='4' seed='7'/>`, matrizCor('#3b3936', 2.2, -0.95), 28);
  camada(veios('0.0012 0.0045', [[.4, .85, .008], [.47, .45, .006], [.55, .75, .008], [.62, .45, .006]], 11), matrizCor('#ece9e3', .9, 0), 28);
  camada(veios('0.003 0.01', [[.45, .45, .005], [.53, .45, .005]], 23), matrizCor('#cfcac2', .55, 0), 40);
  camada(veios('0.0015 0.005', [[.49, 1, .008], [.37, .6, .006]], 31), matrizCor('#d4a838', 1, 0), 22);

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'><defs>${defs}</defs><rect width='${W}' height='${H}' fill='#060606'/>${corpo}</svg>`;
  return `url('data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}')`;
}
