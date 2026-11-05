#!/usr/bin/env node
/**
 * Checks that the living documentation in docs/ still covers the code (rule R13) and that the agent rules
 * (AGENTS.md + .rules/) stay single-sourced, plus the mechanically checkable parts of R3, R6 and R10 and of the local
 * rules in .rules/local.md (not versioned; its checks run only when the file exists).
 * Exit code 1 lists every gap. Run: npm run docs:check
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(ROOT, file));
const problems = [];

const REQUIRED_DOCS = ['docs/README.md', 'docs/arquitetura.md', 'docs/contratos-de-dados.md', 'docs/design-system.md',
  'docs/dependencias-e-ambiente.md', 'docs/portabilidade.md', 'docs/changelog.md', 'docs/inventario.md', 'docs/decisoes/README.md'];
// The glossary is required where rule R12 (pt-BR official language) exists.
const RULES_FILE = '.rules/projeto.md';
// Local rules (git-ignored): binding only on the machine that has the file; never cited by versioned files.
const LOCAL_RULES_FILE = '.rules/local.md';
if (exists(RULES_FILE) && /## R12\./.test(read(RULES_FILE))) REQUIRED_DOCS.push('docs/glossario-ptbr.md');
// Data contracts (verification 7) exist only in projects with real data blocks; then the mapping document is required.
const DATA_CONTRACT_FILES = [
  'src/app/views/widgets/widgets-dropdown/segment-cards.service.ts',
  'src/app/views/dashboard/emails/emails.model.ts',
  'src/app/views/dashboard/classification/classification.model.ts',
  'src/app/views/scalation/waterfall/waterfall.model.ts'
].filter(exists);
// Exported declarations only: comments, validation and helpers may change without touching the contract.
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim();
const declarationsOf = (files) => files.flatMap((file) =>
  read(file).match(/^export (?:interface \w+[^{]*\{[\s\S]*?^\}|type \w+ = [^;]+;)/gm) || []
);
const hashOf = (declarations) => crypto.createHash('sha1').update(declarations.map(stripComments).join('\n')).digest('hex').slice(0, 12);
/** [interfaceName, fieldName] pairs of every exported interface in the declarations. */
const fieldsOf = (declarations) => declarations.filter((text) => text.startsWith('export interface')).flatMap((block) => {
  const name = block.match(/^export interface (\w+)/)[1];
  const body = stripComments(block.slice(block.indexOf('{') + 1, block.lastIndexOf('}')));
  return body.split(';').map((part) => part.trim().match(/^(?:readonly )?(\w+)\??:/)).filter(Boolean).map((match) => [name, match[1]]);
});
if (DATA_CONTRACT_FILES.length) REQUIRED_DOCS.push('docs/mapeamento-de-dados.md');
for (const doc of REQUIRED_DOCS) if (!exists(doc)) problems.push(`Documento obrigatório ausente: ${doc}`);

const docText = (file) => (exists(file) ? read(file) : '');

// 1. Every views folder is described in arquitetura.md
const arquitetura = docText('docs/arquitetura.md');
for (const dir of fs.readdirSync(path.join(ROOT, 'src/app/views'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)) {
  if (!arquitetura.includes(`views/${dir}`)) problems.push(`docs/arquitetura.md não menciona a pasta src/app/views/${dir}`);
}
// 1b. Shared pieces that must be documented
const sharedPieces = ['theme.service', 'default-layout'];
if (exists('src/app/views/dashboard/period-filter')) sharedPieces.push('period-filter');
for (const needle of sharedPieces) {
  if (!arquitetura.includes(needle)) problems.push(`docs/arquitetura.md não menciona "${needle}"`);
}

// 2. Every mock data file is described in contratos-de-dados.md
const contratos = docText('docs/contratos-de-dados.md');
if (exists('src/assets/data')) {
  for (const file of fs.readdirSync(path.join(ROOT, 'src/assets/data'))) {
    if (!contratos.includes(file)) problems.push(`docs/contratos-de-dados.md não menciona src/assets/data/${file}`);
  }
}
if (!contratos.includes('apiBase')) problems.push('docs/contratos-de-dados.md não explica a troca do mock pela API (apiBase)');

// 3. Every dependency is listed in dependencias-e-ambiente.md
const deps = docText('docs/dependencias-e-ambiente.md');
const pkg = JSON.parse(read('package.json'));
for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
  if (!deps.includes(name)) problems.push(`docs/dependencias-e-ambiente.md não lista a dependência ${name}`);
}

// 4. Design tokens changed without reviewing design-system.md (hash stamp)
const design = docText('docs/design-system.md');
const tokenFiles = ['src/scss/_brand.scss', 'src/scss/_variables.scss', 'src/scss/_theme-dark.scss'].filter(exists);
const hash = crypto.createHash('sha1').update(tokenFiles.map(read).join('')).digest('hex').slice(0, 12);
const stamp = (design.match(/<!--\s*tokens-hash:\s*([0-9a-f]{12})\s*-->/) || [])[1];
if (!stamp) problems.push('docs/design-system.md sem carimbo <!-- tokens-hash: ... -->');
else if (stamp !== hash) problems.push(`Tokens mudaram: revise docs/design-system.md e atualize o carimbo para <!-- tokens-hash: ${hash} -->`);

// 5. Inventory is not stale: its inventory-hash stamp must match the files it is generated from (content, not mtime,
// so a fresh clone or a copy to another environment gives the same answer).
// Root route table: app.routes.ts (standalone, Angular 20); app-routing.module.ts kept for projects not yet migrated.
const ROUTING_FILE = ['src/app/app.routes.ts', 'src/app/app-routing.module.ts'].find(exists);
const INVENTORY_SOURCES = ['package.json', 'src/scss/_brand.scss', 'src/scss/_theme-dark.scss', ROUTING_FILE].filter(Boolean);
if (exists('docs/inventario.md')) {
  const invHash = crypto.createHash('sha1').update(INVENTORY_SOURCES.filter(exists).map(read).join('')).digest('hex').slice(0, 12);
  const invStamp = (read('docs/inventario.md').match(/<!--\s*inventory-hash:\s*([0-9a-f]{12})\s*-->/) || [])[1];
  if (invStamp !== invHash) problems.push(`docs/inventario.md desatualizado (${INVENTORY_SOURCES.join(', ')} mudaram): rode npm run docs:inventory`);
}

// 6. Portability playbook keeps its mandatory sections
const port = docText('docs/portabilidade.md');
for (const needle of ['apiBase', 'env.json', 'proxy.conf.json', 'Nexus', 'Checklist']) {
  if (!new RegExp(needle, 'i').test(port)) problems.push(`docs/portabilidade.md não cobre "${needle}"`);
}

// 7. Data contracts changed without reviewing mapeamento-de-dados.md (hash stamp + every interface field mapped)
if (DATA_CONTRACT_FILES.length) {
const mapping = docText('docs/mapeamento-de-dados.md');
const declarations = declarationsOf(DATA_CONTRACT_FILES);
const contractHash = hashOf(declarations);
const contractStamp = (mapping.match(/<!--\s*data-contract-hash:\s*([0-9a-f]{12})\s*-->/) || [])[1];
if (!contractStamp) problems.push('docs/mapeamento-de-dados.md sem carimbo <!-- data-contract-hash: ... -->');
else if (contractStamp !== contractHash) {
  problems.push(`Interfaces de dados mudaram: revise docs/mapeamento-de-dados.md e atualize o carimbo para <!-- data-contract-hash: ${contractHash} -->`);
}
for (const [name, field] of fieldsOf(declarations)) {
  if (!mapping.includes(`${name}.${field}`)) problems.push(`docs/mapeamento-de-dados.md não mapeia ${name}.${field}`);
}
}

// 8. Knowledge base (rule R14): every page folder in base-de-conhecimento/paginas is listed in its README
if (exists('base-de-conhecimento')) {
  const kbReadme = exists('base-de-conhecimento/README.md') ? read('base-de-conhecimento/README.md') : '';
  if (!kbReadme) problems.push('base-de-conhecimento/README.md ausente (regra R14)');
  const pagesDir = path.join(ROOT, 'base-de-conhecimento/paginas');
  const subdirs = (dir) => fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  if (fs.existsSync(pagesDir)) {
    for (const group of subdirs(pagesDir)) {
      if (!kbReadme.includes(`paginas/${group}/`)) problems.push(`base-de-conhecimento/README.md não cita paginas/${group}/`);
      for (const page of subdirs(path.join(pagesDir, group))) {
        if (!kbReadme.includes(`${page}/`)) problems.push(`base-de-conhecimento/README.md não cita paginas/${group}/${page}/`);
      }
    }
  }
  if (!arquitetura.includes('base-de-conhecimento')) problems.push('docs/arquitetura.md não menciona base-de-conhecimento/');
}

// 9. Agent rules live in one place (AGENTS.md + .rules/); tool files only point to them (see .rules/erros.md E-005).
// Only the versioned rules of RULES_FILE need an index line; rules of LOCAL_RULES_FILE are local and have none.
const agents = docText('AGENTS.md');
const rules = docText(RULES_FILE);
if (!agents) problems.push('AGENTS.md ausente na raiz');
if (!rules) problems.push(`${RULES_FILE} ausente`);
for (const num of (rules.match(/^## R(\d+)\./gm) || []).map((h) => h.match(/\d+/)[0])) {
  if (!new RegExp(`^- R${num} `, 'm').test(agents)) problems.push(`AGENTS.md não tem a linha de índice da regra R${num} de ${RULES_FILE}`);
}
const POINTERS = ['CLAUDE.md', 'GEMINI.md', '.cursor/rules/regras-projeto.mdc', '.agents/rules/regras.md'];
for (const file of POINTERS.filter(exists)) {
  const text = read(file);
  if (!/AGENTS\.md/.test(text)) problems.push(`${file} não aponta para AGENTS.md`);
  if (/^## R\d+\./m.test(text)) problems.push(`${file} contém texto de regra; deve ser só ponteiro para AGENTS.md/.rules/`);
}
if (exists('CLAUDE.md') && !/^@AGENTS\.md/m.test(read('CLAUDE.md'))) problems.push('CLAUDE.md precisa importar @AGENTS.md (o Claude Code não lê AGENTS.md quando há CLAUDE.md)');

// 10. ADRs: unique numbers, every file in the index, every index link resolves (E-004)
if (exists('docs/decisoes')) {
  const adrFiles = fs.readdirSync(path.join(ROOT, 'docs/decisoes')).filter((f) => /^ADR-\d{3}-.+\.md$/.test(f));
  const seen = new Map();
  for (const f of adrFiles) { const n = f.slice(4, 7); seen.set(n, [...(seen.get(n) || []), f]); }
  for (const [n, files] of seen) if (files.length > 1) problems.push(`ADR-${n} usado ${files.length} vezes (${files.join(', ')}); próximo número livre é o maior + 1`);
  const index = docText('docs/decisoes/README.md');
  for (const f of adrFiles) if (!index.includes(`(${f})`)) problems.push(`docs/decisoes/README.md não lista ${f}`);
  for (const [, link] of index.matchAll(/\]\((ADR-[^)]+\.md)\)/g)) if (!adrFiles.includes(link)) problems.push(`docs/decisoes/README.md aponta para ${link}, que não existe`);
}

// Git-ignored outputs of the E2E package (Playwright install, results and report): never scanned by any walk.
const GENERATED_PATHS = new Set(['e2e/node_modules', 'e2e/test-results', 'e2e/playwright-report']);
const isGenerated = (rel) => GENERATED_PATHS.has(rel.split(path.sep).join('/'));
// 11 and 13. Mechanical parts of R10 (11), R3 and R6 (13) on the product code (spec files excluded)
const walkFiles = (dir, ext) => (exists(dir) ? fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
  const rel = path.join(dir, e.name);
  if (isGenerated(rel)) return [];
  return e.isDirectory() ? walkFiles(rel, ext) : (ext.test(e.name) && !/\.spec\.ts$/.test(e.name) ? [rel] : []);
}) : []);
const lineHits = (files, re) => files.flatMap((f) => read(f).split('\n').map((line, i) => ({ f, n: i + 1, line })).filter((h) => re.test(h.line)));
// R10: literal colors only in the three token files; in .ts only as token fallback or black/white ink (D-002).
// Enabled only where the project's R10 forbids literal colors (the plain CoreUI template does not).
const COLOR_RULE = /Cor literal/.test(rules);
const TOKEN_FILES = ['_brand.scss', '_variables.scss', '_theme-dark.scss'];
const HEX = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b(?!\{)/;
for (const h of COLOR_RULE ? lineHits(walkFiles('src', /\.scss$/).filter((f) => !TOKEN_FILES.includes(path.basename(f))), HEX) : []) {
  problems.push(`R10: cor literal em ${h.f}:${h.n}; use var(--brand-*|--cui-*|--app-*) ou um token de src/scss/_brand.scss`);
}
for (const h of COLOR_RULE ? lineHits(walkFiles('src', /\.html$/).filter((f) => f !== path.join('src', 'index.html')), /#[0-9a-fA-F]{6}\b/) : []) {
  problems.push(`R10: cor literal em ${h.f}:${h.n}`);
}
// Known literal-color exceptions outside the token files ({ file, values }); empty since ChartSample left (2026-11-03).
const KNOWN_COLOR_EXCEPTIONS = [];
const INK = /^#(?:fff|ffffff|000|000000|0b0b0b)$/i;
const FALLBACK = /\|\||read\(|FALLBACK|fallbackColor|_INK|mix\(/;
for (const h of COLOR_RULE ? lineHits(walkFiles('src/app', /\.ts$/), /['"]#[0-9a-fA-F]{3,8}['"]/) : []) {
  const values = h.line.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  const known = KNOWN_COLOR_EXCEPTIONS.find((e) => e.file === h.f);
  if (known && values.every((v) => known.values.includes(v.toLowerCase()))) continue;
  if (FALLBACK.test(h.line) || values.every((v) => INK.test(v))) continue;
  problems.push(`R10: cor literal fora de fallback de token em ${h.f}:${h.n} (ver exceções da R10 em ${RULES_FILE})`);
}
// 13. R3: Angular 20 idioms. Legacy patterns the migration removed must not come back (standalone, built-in control
// flow, provideHttpClient, ng-scrollbar, ThemeService as the only color mode).
const R3 = [
  [/@NgModule\s*\(/, 'NgModule novo (use componente standalone)'],
  [/standalone:\s*false/, 'standalone: false (componente deve ser standalone)'],
  [/\*ng(?:If|For|Switch)\b|\[ngSwitch\]|\*ngSwitchCase/, 'diretiva estrutural antiga (use @if/@for/@switch)'],
  [/\bHttpClientModule\b|\bBrowserModule\b|platformBrowserDynamic\(/, 'API de NgModule no bootstrap (use app.config.ts)'],
  [/ngx-perfect-scrollbar|perfect-scrollbar/, 'ngx-perfect-scrollbar (use ngx-scrollbar)'],
  [/\bColorModeService\b/, 'ColorModeService do CoreUI (tema só pelo ThemeService, R10)'],
  [/\bwithHashLocation\b|\bHashLocationStrategy\b/, 'roteamento por hash (proibido: caminho limpo com fallback no servidor web, ADR-023)'],
];
for (const [re, why] of R3) {
  for (const h of lineHits(walkFiles('src/app', /\.(ts|html)$/), re)) problems.push(`R3: ${why} em ${h.f}:${h.n}: ${h.line.trim().slice(0, 80)}`);
}
// 13. R6: no backend hosts in versioned source
for (const h of lineHits(walkFiles('src', /\.(ts|html|json)$/), /localhost|appdes|appuat/)) problems.push(`R6: host proibido em ${h.f}:${h.n}`);

// 12. Watched claims about the code that must not survive the change that made them false (E-005)
const STALE_CLAIMS = [
  { when: () => exists('src/app/core/services/api.service.ts'), text: /não existe\*{0,2} serviço base|Hoje não existe esse serviço base|serviço base de API \(R4\) ainda não existe/, why: 'api.service.ts existe' },
  { when: () => !exists('src/app/views/base'), text: /rotas do template \(`theme`, `base`|seções do template "Tema", "Componentes", "Extras"/, why: 'as demos foram para base-de-conhecimento/' },
  { when: () => !exists('src/scss/_examples.scss'), text: /@import "layout"; @import "fixes"; @import "examples"/, why: '_examples.scss saiu de src/scss' },
  { when: () => exists('docs/portabilidade.md'), text: /exige documentos que ainda não existem/, why: 'os documentos existem' },
  { when: () => true, text: /R1[–-]R1\d/, why: 'cite regra por número, nunca por faixa (a faixa envelhece)' },
  // Migration to Node 22 / Angular 20 / CoreUI 5.5 (ADR-021): the old stack must not survive in living docs.
  // Clean URLs (ADR-023): hash routes and the relative base href must not survive in living docs.
  { when: () => exists('src/app/app.config.ts') && !/withHashLocation\(/.test(read('src/app/app.config.ts')), skip: /planejamento[\\/]/, text: /\/#\/|rotas (?:usam|com) hash|roteador com hash|`provideRouter` com hash|<base href="\.\/">/, why: 'as rotas usam caminho limpo (PathLocationStrategy) e <base href="/">' },
  { when: () => /"@angular\/core":\s*"20\./.test(read('package.json')), text: /Angular 15\.2|Angular 15\b(?! →)|Node 18\b|TypeScript 4\.9|TS 4\.9|CoreUI 4\.[34]\b|Chart\.js 3\.9|app-routing\.module|-routing\.module\.ts|NgModules? no padrão|nada de standalone/, why: 'o projeto está em Node 22, Angular 20.3, TS 5.9, CoreUI 5.5, Chart.js 4.5, standalone (ADR da migração); menção histórica cita a migração' },
];
const CLAIM_FILES = ['README.md', 'AGENTS.md', RULES_FILE, ...POINTERS, 'base-de-conhecimento/README.md', ...walkFiles('docs', /\.md$/)]
  .filter((f) => exists(f) && !/changelog\.md$|inventario\.md$|decisoes[\\/]ADR-|migracao-node22-angular20\.md$|referencia-visual[\\/]/.test(f));
// A line that names the migration (or ADR-021, or says "histórico") is a deliberate historical mention, not a stale claim.
const HISTORICAL = /migraç|migrad|ADR-021|histórico/i;
for (const claim of STALE_CLAIMS.filter((c) => c.when())) {
  for (const h of lineHits(CLAIM_FILES.filter((f) => !claim.skip?.test(f)), claim.text)) {
    if (!HISTORICAL.test(h.line)) problems.push(`Afirmação defasada em ${h.f}:${h.n} (${claim.why})`);
  }
}

// 14. Page sheets (rule R15): one docs/paginas/<slug>.md per routed page, naming every data file, mock and field the page
// reaches through its imports, with a page-data-hash stamp over those declarations.
if (/## R15\./.test(rules) && ROUTING_FILE) {
  const DATA_FILE_RE = /(\.model|-data\.service|segment-cards\.service|charts-data)\.ts$/;
  const SECTIONS = ['Identidade', 'Blocos', 'Dados consumidos', 'Calculado no front', 'De-para', 'O que copiar', 'Verificação'];
  const routing = read(ROUTING_FILE);
  const pages = [];
  const routeRe = /path:\s*'([^']*)'([\s\S]*?)(?=\n\s*\{\s*\n?\s*path:|\n\];)/g;
  let m;
  while ((m = routeRe.exec(routing))) {
    const folder = (m[2].match(/import\('\.\/views\/([^/']+)\//) || [])[1];
    if (folder) pages.push({ slug: m[1] || 'inicio', folder });
  }
  const resolveImport = (from, spec) => {
    if (!spec.startsWith('.')) return null;
    const base = path.join(path.dirname(from), spec);
    for (const candidate of [`${base}.ts`, path.join(base, 'index.ts')]) if (exists(candidate) && !/\.spec\.ts$/.test(candidate)) return candidate;
    return null;
  };
  const reachable = (startFiles) => {
    const seen = new Set();
    const queue = [...startFiles];
    while (queue.length) {
      const file = queue.shift();
      if (seen.has(file) || !file.startsWith('src/app')) continue;
      seen.add(file);
      for (const [, spec] of read(file).matchAll(/from\s+'([^']+)'/g)) {
        const target = resolveImport(file, spec);
        if (target && !seen.has(target)) queue.push(target);
      }
    }
    return [...seen];
  };
  const index = docText('docs/paginas/README.md');
  if (!index) problems.push('docs/paginas/README.md ausente (regra R15)');
  for (const { slug, folder } of pages) {
    const sheet = `docs/paginas/${slug}.md`;
    if (!exists(sheet)) { problems.push(`${sheet} ausente: página views/${folder} sem ficha (R15)`); continue; }
    if (index && !index.includes(`${slug}.md`)) problems.push(`docs/paginas/README.md não lista ${slug}.md`);
    const text = read(sheet);
    for (const section of SECTIONS) if (!new RegExp(`^#{2,3} .*${section}`, 'mi').test(text)) problems.push(`${sheet} sem a seção "${section}"`);
    const files = reachable(walkFiles(`src/app/views/${folder}`, /\.ts$/));
    // Page data lives under views/; the chat contract (src/app/chat) belongs to the layout widget (contratos §9).
    const dataFiles = files.filter((f) => f.startsWith('src/app/views/') && DATA_FILE_RE.test(f)).sort();
    const mocks = [...new Set(files.flatMap((f) => read(f).match(/assets\/data\/[\w.-]+\.json/g) || []))].sort();
    for (const f of dataFiles) if (!text.includes(f)) problems.push(`${sheet} não cita o arquivo de dados ${f}`);
    for (const mock of mocks) if (!text.includes(mock)) problems.push(`${sheet} não cita o mock ${mock}`);
    const pageDeclarations = declarationsOf(dataFiles);
    for (const [name, field] of fieldsOf(pageDeclarations)) {
      if (!text.includes(`${name}.${field}`)) problems.push(`${sheet} não descreve o campo ${name}.${field}`);
    }
    if (dataFiles.length && !text.includes('mapeamento-de-dados.md')) problems.push(`${sheet} não aponta para docs/mapeamento-de-dados.md (de-para)`);
    const pageHash = hashOf(pageDeclarations);
    const pageStamp = (text.match(/<!--\s*page-data-hash:\s*([0-9a-f]{12})\s*-->/) || [])[1];
    if (!pageStamp) problems.push(`${sheet} sem carimbo <!-- page-data-hash: ${pageHash} -->`);
    else if (pageStamp !== pageHash) problems.push(`Dados da página ${slug} mudaram: revise ${sheet} e atualize o carimbo para <!-- page-data-hash: ${pageHash} -->`);
  }
}

// 15. Local rule (institution name), enabled only when LOCAL_RULES_FILE exists and defines it: no file name and no text
// file of the project carries the company name, its acronym, internal domains or legal names. The tokens are assembled
// from parts so this script never contains them itself.
const LOCAL_TAG = 'regra local (nome da instituição)';
if (/^## L1\./m.test(docText(LOCAL_RULES_FILE))) {
  const acronym = ['b', 'v'].join('');
  const FORBIDDEN = new RegExp([
    `(^|[^A-Za-z0-9])${acronym}([^A-Za-z0-9]|$)`,
    // Prefix glued to letters (a theme or package name starting with the acronym), any case.
    `(?<![A-Za-z0-9])${acronym}[A-Za-z]`,
    `${acronym}net`, `${acronym}docker`, `banco${acronym}`, `${acronym}c-`, ['voto', 'rantim'].join(''),
  ].join('|'), 'i');
  // Case-sensitive: the acronym glued to a lowercase word inside an identifier (camelCase), e.g. a field named
  // api + acronym. Capitalized ("Xy") must not be followed by a lowercase letter, all caps ("XY") by any letter.
  const capital = acronym[0].toUpperCase() + acronym.slice(1);
  const GLUED = new RegExp(`[a-z](?:${capital}(?![a-z])|${acronym.toUpperCase()}(?![A-Za-z]))`);
  const SKIP_DIRS = new Set(['node_modules', 'dist', '.angular', '.git', 'coverage', '__pycache__', '.venv']);
  const SKIP_CONTENT = new Set(['package-lock.json']);
  // Binary assets: only their names are checked. SVG is text and is scanned (title, desc, ids, aria-label).
  const BINARY = /\.(png|jpe?g|gif|webp|ico|bmp|tiff?|woff2?|ttf|otf|eot|pdf|zip|gz|tgz|jar|mp[34]|wav)$/i;
  const walkAll = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = dir ? path.join(dir, e.name) : e.name;
    if (SKIP_DIRS.has(e.name) || isGenerated(rel)) return [];
    return e.isDirectory() ? walkAll(rel) : [rel];
  });
  for (const file of walkAll('')) {
    const posix = file.split(path.sep).join('/');
    if (FORBIDDEN.test(posix) || GLUED.test(posix)) problems.push(`${LOCAL_TAG}: nome de arquivo ou pasta cita a instituição: ${posix} (use brand-*)`);
    if (SKIP_CONTENT.has(path.basename(file)) || BINARY.test(file)) continue;
    const buffer = fs.readFileSync(path.join(ROOT, file));
    if (buffer.includes(0)) continue;
    buffer.toString('utf8').split('\n').forEach((line, i) => {
      if (FORBIDDEN.test(line) || GLUED.test(line)) problems.push(`${LOCAL_TAG}: menção à instituição em ${posix}:${i + 1} (use "a instituição", "corporativo" ou \`brand-*\`)`);
    });
  }
}

if (problems.length) {
  console.error(`docs:check — ${problems.length} pendência(s):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('docs:check — documentação em dia.');
