#!/usr/bin/env node
/**
 * Generates docs/inventario.md from the code: routes, design tokens, dependencies and the list of
 * files that differ from the original CoreUI template commit. Run: npm run docs:inventory
 * No dependencies beyond Node 22 and git.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
// Original CoreUI Free Angular Admin Template v4.3.13 commit. Override with DOCS_TEMPLATE_COMMIT when the
// destination repository has a different history; without it, the "files vs template" section is skipped.
const TEMPLATE_COMMIT = process.env.DOCS_TEMPLATE_COMMIT || '36966f6';
const OUT = path.join(ROOT, 'docs', 'inventario.md');

const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const git = (args) => execSync(`git ${args}`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const exists = (file) => fs.existsSync(path.join(ROOT, file));

/** True when this project is its own git repository and the template commit is in its history. */
function templateHistoryAvailable() {
  try {
    return path.resolve(git('rev-parse --show-toplevel')) === ROOT && git(`cat-file -t ${TEMPLATE_COMMIT}`) === 'commit';
  } catch {
    return false;
  }
}

function walk(dir, filter, acc = []) {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel, filter, acc);
    else if (filter(rel)) acc.push(rel);
  }
  return acc;
}

// --- Routes: path/title/loadChildren pairs from app.routes.ts and every views/<page>/routes.ts (legacy: *-routing.module.ts)
function routes() {
  const files = walk('src/app', (f) => /(?:^|[\\/])(?:app\.)?routes\.ts$|routing\.module\.ts$/.test(f)).sort();
  const rows = [];
  for (const file of files) {
    const text = read(file);
    const re = /path:\s*'([^']*)'([\s\S]*?)(?=\n\s*\{\s*\n?\s*path:|\n\];)/g;
    let m;
    while ((m = re.exec(text))) {
      const body = m[2];
      const title = (body.match(/title:\s*(?:\$localize)?[`']([^`']*)[`']/) || [])[1] || '';
      const lazy = (body.match(/import\('([^']+)'\)/) || [])[1] || '';
      const component = (body.match(/component:\s*(\w+)/) || [])[1] || '';
      const redirect = (body.match(/redirectTo:\s*'([^']*)'/) || [])[1];
      rows.push({ file, path: m[1] || "''", title, target: redirect !== undefined ? `redirect → '${redirect}'` : lazy || component });
    }
  }
  return rows;
}

// --- Tokens: CSS custom properties from _brand.scss (light) and _theme-dark.scss (dark)
function tokens() {
  const grab = (file) => {
    const map = new Map();
    const re = /(--(?:brand|app)-[a-z0-9-]+):\s*([^;]+);/g;
    let m;
    const text = read(file);
    while ((m = re.exec(text))) map.set(m[1], m[2].trim().replace(/^#\{\$?|\}$/g, ''));
    return map;
  };
  const lightFile = exists('src/scss/_brand.scss') ? 'src/scss/_brand.scss' : 'src/scss/_theme-dark.scss';
  const light = grab(lightFile);
  const dark = exists('src/scss/_theme-dark.scss') ? grab('src/scss/_theme-dark.scss') : new Map();
  // _theme-dark.scss holds both :root (light) and [data-theme="dark"] values when there is no _brand.scss.
  if (lightFile === 'src/scss/_theme-dark.scss') {
    const text = read(lightFile);
    const darkBlock = text.slice(text.indexOf('[data-theme="dark"]'));
    dark.clear();
    let m;
    const re = /(--(?:brand|app)-[a-z0-9-]+):\s*([^;]+);/g;
    while ((m = re.exec(darkBlock))) dark.set(m[1], m[2].trim().replace(/^#\{\$?|\}$/g, ''));
  }
  return [...light.keys()].map((name) => ({ name, light: light.get(name), dark: dark.get(name) || '(herda o claro)' }));
}

function dependencies() {
  const pkg = JSON.parse(read('package.json'));
  const rows = [];
  for (const [section, deps] of [['dependencies', pkg.dependencies], ['devDependencies', pkg.devDependencies]]) {
    for (const [name, version] of Object.entries(deps || {})) rows.push({ section, name, version });
  }
  return rows;
}

function filesVsTemplate() {
  if (!templateHistoryAvailable()) {
    return null;
  }
  const tracked = git(`diff --name-status ${TEMPLATE_COMMIT} HEAD`).split('\n').filter(Boolean)
    .map((line) => { const [status, ...rest] = line.split('\t'); return { status, file: rest[rest.length - 1] }; });
  const untracked = git('status --porcelain --untracked-files=all').split('\n').filter(Boolean)
    .map((line) => ({ status: line.slice(0, 2).trim() || 'M', file: line.slice(3).trim() }));
  const map = new Map();
  for (const row of [...tracked, ...untracked]) map.set(row.file, row.status);
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

const STATUS = { A: 'novo', M: 'alterado', D: 'removido', R: 'renomeado', '??': 'novo (não commitado)', AM: 'novo', MM: 'alterado' };

function table(headers, rows) {
  const line = (cells) => `| ${cells.map((c) => String(c).replace(/\|/g, '\\|')).join(' | ')} |`;
  return [line(headers), line(headers.map(() => '---')), ...rows.map(line)].join('\n');
}

const today = new Date().toISOString().slice(0, 10);
// Same sources and hash as docs-check.js verification 5: the stamp says which content this inventory reflects.
const ROUTING_FILE = ['src/app/app.routes.ts', 'src/app/app-routing.module.ts'].find(exists);
const INVENTORY_SOURCES = ['package.json', 'src/scss/_brand.scss', 'src/scss/_theme-dark.scss', ROUTING_FILE].filter(Boolean);
const inventoryHash = crypto.createHash('sha1').update(INVENTORY_SOURCES.filter(exists).map(read).join('')).digest('hex').slice(0, 12);
const versusTemplate = filesVsTemplate();
const versusSection = versusTemplate
  ? `Tudo que não está nesta lista é idêntico ao template v4.3.13.\n\n${table(['Arquivo', 'Situação'], versusTemplate.map(([file, status]) => [`\`${file}\``, STATUS[status] || status]))}`
  : 'Indisponível: este diretório não tem o histórico git do template CoreUI (commit `' + TEMPLATE_COMMIT + '`). Para gerar, rode dentro de um repositório git próprio que contenha esse commit, ou defina DOCS_TEMPLATE_COMMIT.';
const out = `# Inventário do projeto (gerado)

<!-- inventory-hash: ${inventoryHash} -->

Gerado por \`npm run docs:inventory\` em ${today}. Não editar à mão: regenerar após mudanças estruturais.
Base de comparação: commit \`${TEMPLATE_COMMIT}\` (CoreUI Free Angular Admin Template v4.3.13).

## Rotas

${table(['Arquivo', 'Caminho', 'Título', 'Destino'], routes().map((r) => [`\`${r.file}\``, `\`${r.path}\``, r.title, r.target ? `\`${r.target}\`` : '']))}

## Tokens de design (claro / escuro)

${table(['Token', 'Claro', 'Escuro'], tokens().map((t) => [`\`${t.name}\``, `\`${t.light}\``, `\`${t.dark}\``]))}

## Dependências

${table(['Seção', 'Pacote', 'Versão'], dependencies().map((d) => [d.section, `\`${d.name}\``, d.version]))}

## Arquivos do projeto em relação ao template CoreUI

${versusSection}
`;
fs.writeFileSync(OUT, out);
console.log(`docs/inventario.md atualizado: ${routes().length} rotas, ${tokens().length} tokens, ${dependencies().length} dependências, ${versusTemplate ? versusTemplate.length + ' arquivos vs template' : 'comparação com o template indisponível'}.`);
