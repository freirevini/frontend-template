// Deterministic generator of src/assets/data/dashboard-classificacao.json (run once; the output is versioned).
let seed = 20211130;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pick = (list) => list[int(0, list.length - 1)];

const segments = [['atacado', 3], ['corporativo', 3], ['plataforma', 2], ['varejo', 3]].flatMap(([id, w]) => Array(w).fill(id));
const kinds = [['Resolução CMN', 4800, 5100], ['Resolução BCB', 120, 290], ['Circular BCB', 3600, 3900], ['Instrução Normativa BCB', 150, 330]];
// Theme and its chance of being applicable to the bank; weight = how often the theme appears.
const themes = [
  ['Prevenção à lavagem de dinheiro', .9, 6], ['Requisitos de capital regulatório', .85, 5], ['Gerenciamento de riscos e de capital', .85, 5],
  ['Segurança cibernética e continuidade', .8, 4], ['Proteção de dados pessoais (LGPD)', .8, 4], ['Open Finance: compartilhamento de dados', .7, 4],
  ['Pix: regras de devolução e limites', .6, 5], ['Cartões de crédito: encargos e transparência', .65, 4], ['Crédito consignado: limites e informações ao cliente', .7, 3],
  ['Tarifas de serviços bancários', .55, 3], ['Câmbio: operações e reporte', .4, 3], ['Registro de recebíveis de cartões', .45, 2],
  ['Financiamento imobiliário e alienação fiduciária', .35, 2], ['Contratação de serviços de nuvem', .6, 2], ['Cadastro positivo e bureaus de crédito', .5, 2],
  ['Seguro prestamista e venda casada', .45, 2], ['Relatório de riscos sociais e ambientais', .55, 2], ['Auditoria independente e comitê de auditoria', .5, 2],
  ['Garantias e reforço de colateral', .4, 1], ['Portabilidade de crédito e de salário', .5, 1]
];
const themePool = themes.flatMap((t) => Array(t[2]).fill(t));
// Responsible Área and Diretoria per theme (fictitious; derived, so no extra random draws).
const owners = {
  'Requisitos de capital regulatório': ['Gestão de Capital', 'Riscos'],
  'Prevenção à lavagem de dinheiro': ['Prevenção à Lavagem de Dinheiro', 'Compliance'],
  'Segurança cibernética e continuidade': ['Segurança da Informação', 'Tecnologia'],
  'Crédito consignado: limites e informações ao cliente': ['Produtos de Crédito', 'Produtos'],
  'Open Finance: compartilhamento de dados': ['Open Finance', 'Tecnologia'],
  'Pix: regras de devolução e limites': ['Meios de Pagamento', 'Operações'],
  'Gerenciamento de riscos e de capital': ['Riscos Corporativos', 'Riscos'],
  'Cadastro positivo e bureaus de crédito': ['Políticas de Crédito', 'Riscos'],
  'Cartões de crédito: encargos e transparência': ['Cartões', 'Produtos'],
  'Contratação de serviços de nuvem': ['Arquitetura e Infraestrutura', 'Tecnologia'],
  'Registro de recebíveis de cartões': ['Recebíveis', 'Operações'],
  'Seguro prestamista e venda casada': ['Seguros', 'Produtos'],
  'Proteção de dados pessoais (LGPD)': ['Privacidade e Proteção de Dados', 'Jurídico'],
  'Câmbio: operações e reporte': ['Câmbio', 'Tesouraria'],
  'Tarifas de serviços bancários': ['Tarifas e Pacotes', 'Produtos'],
  'Financiamento imobiliário e alienação fiduciária': ['Crédito Imobiliário', 'Produtos'],
  'Relatório de riscos sociais e ambientais': ['Sustentabilidade', 'Riscos'],
  'Auditoria independente e comitê de auditoria': ['Auditoria Interna', 'Governança'],
  'Garantias e reforço de colateral': ['Garantias', 'Operações'],
  'Portabilidade de crédito e de salário': ['Produtos de Crédito', 'Produtos']
};

const normas = [];
const used = new Set();
const start = Date.UTC(2021, 0, 1);
for (let day = 0; day < 365; day++) {
  const date = new Date(start + day * 86400000);
  const weekday = date.getUTCDay();
  if (weekday === 0 || weekday === 6) continue;
  const boost = [0.8, 0.8, 1, 1.2, 1.2, 1.1, 0.9, 0.9, 1, 1.1, 1.3, 1.2][date.getUTCMonth()];
  const count = Math.round(int(1, 6) * boost);
  const dd = date.toISOString().slice(0, 10);
  for (let i = 0; i < count; i++) {
    const [kind, min, max] = pick(kinds);
    const numero = int(min, max).toLocaleString('pt-BR');
    const code = `${kind} ${numero}`;
    if (used.has(code)) continue;
    used.add(code);
    const [theme, chance] = pick(themePool);
    const [tipo, orgao] = [kind.slice(0, kind.lastIndexOf(' ')), kind.slice(kind.lastIndexOf(' ') + 1)];
    const [area, diretoria] = owners[theme];
    const segment = pick(segments);
    normas.push({ code, orgao, tipo, numero, classifiedAt: dd, segment, theme, applicable: rand() < chance, area, diretoria });
  }
}
const body = normas.map((n) => '    ' + JSON.stringify(n)).join(',\n');
require('fs').writeFileSync(process.argv[2], '{\n  "asOf": "2021-12-31",\n  "normas": [\n' + body + '\n  ]\n}\n');
const applicable = normas.filter((n) => n.applicable).length;
console.log(normas.length, 'normas', applicable, 'aplicáveis');
