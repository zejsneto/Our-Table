// ─────────────────────────────────────────────────────────────
//  Personalização do Our Table
//  Edite à vontade: categorias, ocasiões, critérios e local padrão.
//  Ícones: https://fontawesome.com/search?o=r&m=free (use o nome "fa-...")
// ─────────────────────────────────────────────────────────────

export const APP = {
  name: 'Our Table',
  tagline: 'Nosso diário gastronômico',
  // Local padrão ao cadastrar um lugar novo
  defaultCity: 'Campo Grande',
  defaultState: 'MS',
  defaultCountry: 'Brasil',
  // Centro do mapa quando ainda não há lugares com coordenadas
  mapCenter: [-20.4697, -54.6201],
  currency: 'BRL',
  locale: 'pt-BR',
  // Link do repositório (aparece no rodapé das Configurações)
  github: 'https://github.com/SEU-USUARIO/our-table'
};

// Tipos de lugar
export const KINDS = {
  restaurante: { label: 'Restaurante', plural: 'Restaurantes', icon: 'fa-utensils', verb: 'Fomos', wish: 'Quero ir' },
  delivery: { label: 'Delivery', plural: 'Delivery', icon: 'fa-motorcycle', verb: 'Pedimos', wish: 'Quero pedir' }
};

// Critérios avaliados (0 a 10). Cada critério pode ficar "não se aplica".
export const CRITERIA = {
  restaurante: [
    { key: 'sabor', label: 'Sabor', icon: 'fa-utensils' },
    { key: 'atendimento', label: 'Atendimento', icon: 'fa-bell-concierge' },
    { key: 'ambiente', label: 'Ambiente', icon: 'fa-couch' },
    { key: 'apresentacao', label: 'Apresentação', icon: 'fa-wand-magic-sparkles' },
    { key: 'custo', label: 'Custo-benefício', icon: 'fa-scale-balanced' }
  ],
  delivery: [
    { key: 'sabor', label: 'Sabor', icon: 'fa-utensils' },
    { key: 'apresentacao', label: 'Apresentação', icon: 'fa-wand-magic-sparkles' },
    { key: 'embalagem', label: 'Embalagem', icon: 'fa-box' },
    { key: 'entrega', label: 'Tempo de entrega', icon: 'fa-stopwatch' },
    { key: 'custo', label: 'Custo-benefício', icon: 'fa-scale-balanced' }
  ]
};

// Todos os critérios (para rankings por critério)
export const ALL_CRITERIA = (() => {
  const map = new Map();
  Object.values(CRITERIA).flat().forEach(c => map.set(c.key, c));
  return [...map.values()];
})();

export const RETURN_OPTIONS = {
  sim: { label: 'Voltaria', icon: 'fa-heart' },
  talvez: { label: 'Talvez', icon: 'fa-face-meh' },
  nao: { label: 'Não voltaria', icon: 'fa-heart-crack' }
};

// Tipos de comida
export const CATEGORIES = [
  { key: 'japonesa', label: 'Japonesa', icon: 'fa-fish' },
  { key: 'hamburguer', label: 'Hambúrguer', icon: 'fa-burger' },
  { key: 'pizza', label: 'Pizza', icon: 'fa-pizza-slice' },
  { key: 'italiana', label: 'Italiana', icon: 'fa-wine-glass' },
  { key: 'brasileira', label: 'Brasileira', icon: 'fa-bowl-food' },
  { key: 'regional', label: 'Regional / Sobá', icon: 'fa-bowl-rice' },
  { key: 'churrascaria', label: 'Churrascaria', icon: 'fa-fire' },
  { key: 'carnes', label: 'Carnes / Steakhouse', icon: 'fa-drumstick-bite' },
  { key: 'frutos-do-mar', label: 'Frutos do mar', icon: 'fa-shrimp' },
  { key: 'arabe', label: 'Árabe', icon: 'fa-lemon' },
  { key: 'mexicana', label: 'Mexicana', icon: 'fa-pepper-hot' },
  { key: 'chinesa', label: 'Chinesa', icon: 'fa-bowl-rice' },
  { key: 'asiatica', label: 'Asiática (tailandesa, coreana…)', icon: 'fa-bowl-food' },
  { key: 'peruana', label: 'Peruana', icon: 'fa-fish-fins' },
  { key: 'francesa', label: 'Francesa', icon: 'fa-champagne-glasses' },
  { key: 'portuguesa', label: 'Portuguesa', icon: 'fa-wine-bottle' },
  { key: 'vegetariana', label: 'Vegetariana / Vegana', icon: 'fa-leaf' },
  { key: 'lanches', label: 'Lanches / Pastel', icon: 'fa-hotdog' },
  { key: 'bar', label: 'Bar / Petiscos', icon: 'fa-martini-glass-citrus' },
  { key: 'cafe', label: 'Café / Padaria', icon: 'fa-mug-hot' },
  { key: 'doces', label: 'Doces / Sobremesas', icon: 'fa-cake-candles' },
  { key: 'sorvete', label: 'Sorvete / Açaí', icon: 'fa-ice-cream' },
  { key: 'outra', label: 'Outra', icon: 'fa-utensils' }
];

// Ocasiões
export const OCCASIONS = [
  { key: 'casual', label: 'Dia comum', icon: 'fa-mug-saucer' },
  { key: 'encontro', label: 'Encontro', icon: 'fa-heart' },
  { key: 'aniversario', label: 'Aniversário', icon: 'fa-cake-candles' },
  { key: 'aniversario-namoro', label: 'Aniversário de namoro', icon: 'fa-ring' },
  { key: 'namorados', label: 'Dia dos Namorados', icon: 'fa-heart-circle-check' },
  { key: 'comemoracao', label: 'Comemoração', icon: 'fa-champagne-glasses' },
  { key: 'viagem', label: 'Viagem', icon: 'fa-plane' },
  { key: 'amigos', label: 'Com amigos', icon: 'fa-user-group' },
  { key: 'familia', label: 'Em família', icon: 'fa-people-roof' },
  { key: 'preguica', label: 'Preguiça de cozinhar', icon: 'fa-couch' },
  { key: 'trabalho', label: 'Trabalho', icon: 'fa-briefcase' },
  { key: 'outra', label: 'Outra', icon: 'fa-star' }
];

export const PHOTO_KINDS = {
  lugar: { label: 'Lugar', icon: 'fa-store' },
  prato: { label: 'Prato', icon: 'fa-utensils' },
  nos: { label: 'Nós', icon: 'fa-heart' }
};

// Cores padrão das pessoas (se o documento em "members" não tiver "color")
export const MEMBER_COLORS = ['#c9a96e', '#c07a86'];
