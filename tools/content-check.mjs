import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const situationsRoot = path.join(root, 'situations');
const writeIndex = process.argv.includes('--write-index');
const errors = [];
const warnings = [];

const requiredNoiseFiles = [
  'README.md',
  'overview.md',
  'first-actions.md',
  'evidence/README.md',
  'evidence/evidence-checklist.md',
  'evidence/event-log-template.md',
  'evidence/photo-guidelines.md',
  'evidence/audio-guidelines.md',
  'procedures/informal-resolution.md',
  'procedures/written-notification.md',
  'procedures/professional-assessment.md',
  'procedures/formal-escalation.md',
  'documents/README.md',
  'documents/request-for-information.md',
  'documents/informal-notice.md',
  'documents/formal-notice.md',
  'documents/follow-up.md',
  'documents/professional-inspection-request.md',
  'forms/event-report.md',
  'forms/inspection-checklist.md',
  'forms/chronology-template.md',
  'forms/contacts-register.md',
  'authorities/README.md',
  'authorities/authority-matrix.md',
  'professionals/README.md',
  'professionals/professional-matrix.md',
  'examples/example-case.md',
  'examples/example-timeline.md',
  'examples/example-dossier.md',
  'references/sources.md',
  'references/regulations.md',
  'metadata.yml',
];
const ignoredSizeCheckDirectories = new Set([
  '.git',
  'node_modules',
  'dist',
  '.angular',
  'coverage',
]);
const maximumRepositoryFileSize = 10 * 1024 * 1024;

function reportError(message) {
  errors.push(message);
}

function reportWarning(message) {
  warnings.push(message);
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(entryPath)));
    } else {
      files.push(entryPath);
    }
  }
  return files;
}

function parseMetadata(content, filePath) {
  const values = {};
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    if (!line.trim() || line.trimStart().startsWith('#')) {
      continue;
    }
    const match = line.match(/^([a-z_]+):\s*(.*?)\s*$/);
    if (!match) {
      reportError(
        `${path.relative(root, filePath)}:${index + 1}: metadata YAML non valido (sono ammessi campi scalari semplici).`,
      );
      continue;
    }
    const [, key, value] = match;
    if (Object.hasOwn(values, key)) {
      reportError(
        `${path.relative(root, filePath)}:${index + 1}: campo metadata duplicato: ${key}.`,
      );
    }
    if (
      (value.startsWith('"') && !value.endsWith('"')) ||
      (value.startsWith("'") && !value.endsWith("'"))
    ) {
      reportError(
        `${path.relative(root, filePath)}:${index + 1}: valore YAML con virgolette non chiuse.`,
      );
    }
    values[key] = value.replace(/^["']|["']$/g, '');
  }
  return values;
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function markdownLinks(content) {
  return [...content.matchAll(/!?\[[^\]]*\]\((<[^>]+>|[^)\s]+)(?:\s+["'][^)]*["'])?\)/g)].map(
    (match) => match[1].replace(/^<|>$/g, ''),
  );
}

async function validateLinks(markdownFiles) {
  for (const filePath of markdownFiles) {
    const content = await readFile(filePath, 'utf8');
    for (const link of markdownLinks(content)) {
      if (/^(?:https?:|mailto:|data:|\/\/)/i.test(link) || link.startsWith('#')) {
        continue;
      }

      const [targetPath, anchor] = link.split('#', 2);
      if (!targetPath) {
        continue;
      }

      const decodedPath = decodeURIComponent(targetPath.split('?')[0]);
      const resolved = path.resolve(
        decodedPath.startsWith('/') ? root : path.dirname(filePath),
        decodedPath.replace(/^[/\\]/, ''),
      );
      if (!(await exists(resolved))) {
        reportError(`${path.relative(root, filePath)}: link locale non trovato: ${link}`);
      } else if (anchor) {
        const targetIsDirectory = (await stat(resolved)).isDirectory();
        const targetFile = targetIsDirectory ? path.join(resolved, 'README.md') : resolved;
        if (!(await exists(targetFile))) {
          reportError(
            `${path.relative(root, filePath)}: destinazione per ancora non trovata: ${link}`,
          );
          continue;
        }
        const targetContent = await readFile(targetFile, 'utf8');
        const heading = anchor.toLowerCase().replace(/-/g, ' ');
        if (!targetContent.toLowerCase().includes(heading)) {
          reportError(`${path.relative(root, filePath)}: ancora locale non verificata: ${link}`);
        }
      }
    }
  }
}

async function validateSourceRegister(filePath) {
  const content = await readFile(filePath, 'utf8');
  const rows = content.split(/\r?\n/).filter((line) => /^\|\s*[^-\s:|]/.test(line));
  for (const row of rows) {
    const cells = row
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells[0]?.toLowerCase() === 'titolo') {
      continue;
    }
    if (cells.length !== 11) {
      reportError(
        `${path.relative(root, filePath)}: ogni fonte deve compilare tutte le 11 colonne della tabella.`,
      );
      continue;
    }
    if (cells.some((cell) => !cell)) {
      reportError(
        `${path.relative(root, filePath)}: ogni fonte deve compilare Paese, regione/ambito, lingua, autorità, titolo, URL, date, stato e revisore; usare "N/A" se non applicabile.`,
      );
    }
    if (!/^https:\/\//i.test(cells[6])) {
      reportError(
        `${path.relative(root, filePath)}: ogni fonte deve indicare un URL ufficiale HTTPS.`,
      );
    }
    if (!isIsoDate(cells[7])) {
      reportError(
        `${path.relative(root, filePath)}: ogni fonte deve avere una data di verifica YYYY-MM-DD.`,
      );
    }
    if (!isIsoDate(cells[10])) {
      reportError(
        `${path.relative(root, filePath)}: ogni fonte deve indicare la prossima revisione YYYY-MM-DD.`,
      );
    }
    if (
      !['draft', 'under-review', 'verified', 'needs-update', 'deprecated', 'archived'].includes(
        cells[8],
      )
    ) {
      reportError(
        `${path.relative(root, filePath)}: stato editoriale della fonte non riconosciuto.`,
      );
    }
  }
}

async function validateRepositoryFileSizes(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredSizeCheckDirectories.has(entry.name)) {
      continue;
    }
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await validateRepositoryFileSizes(entryPath);
    } else if (entry.isFile() && (await stat(entryPath)).size > maximumRepositoryFileSize) {
      reportError(`${path.relative(root, entryPath)}: file oltre il limite di 10 MiB.`);
    }
  }
}

async function getSituations() {
  if (!(await exists(situationsRoot))) {
    reportError('Cartella situations/ mancante.');
    return [];
  }

  const entries = await readdir(situationsRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function buildIndex(situationIds) {
  const rows = [];
  for (const id of situationIds) {
    const metadataPath = path.join(situationsRoot, id, 'metadata.yml');
    if (!(await exists(metadataPath))) {
      continue;
    }
    const metadataContent = await readFile(metadataPath, 'utf8');
    const metadata = parseMetadata(metadataContent, metadataPath);
    const title = metadata.title ?? id;
    const status = metadata.content_status ?? 'unknown';
    const jurisdiction = metadata.jurisdiction ?? 'unspecified';
    rows.push([`[${title}](./${id}/README.md)`, `\`${id}\``, jurisdiction, status]);
  }

  const headers = ['Situazione', 'ID', 'Giurisdizione', 'Stato editoriale'];
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index].length)),
  );
  const formatRow = (cells) =>
    `| ${cells.map((cell, index) => cell.padEnd(widths[index])).join(' | ')} |`;
  const table = [
    formatRow(headers),
    `| ${widths.map((width) => '-'.repeat(width)).join(' | ')} |`,
    ...rows.map(formatRow),
  ];

  return [
    '<!-- This file is generated by `npm run content:check -- --write-index`. Do not edit by hand. -->',
    '',
    '# Indice delle situazioni',
    '',
    'Guide organizzative generali. Verifica sempre le informazioni locali; i contenuti non sostituiscono professionisti o autorità.',
    '',
    ...table,
    '',
    'Per contribuire o segnalare contenuti non aggiornati, consulta [CONTRIBUTING.md](../CONTRIBUTING.md).',
    '',
  ].join('\n');
}

const situationIds = await getSituations();
if (!situationIds.includes('noise')) {
  reportError('La situazione pilota situations/noise/ è obbligatoria.');
}

const markdownFiles = [];
for (const id of situationIds) {
  const situationPath = path.join(situationsRoot, id);
  const readmePath = path.join(situationPath, 'README.md');
  const metadataPath = path.join(situationPath, 'metadata.yml');
  if (!(await exists(readmePath))) {
    reportError(`situations/${id}/README.md mancante.`);
  } else {
    markdownFiles.push(readmePath);
  }
  if (!(await exists(metadataPath))) {
    reportError(`situations/${id}/metadata.yml mancante.`);
    continue;
  }

  const metadataContent = await readFile(metadataPath, 'utf8');
  const metadata = parseMetadata(metadataContent, metadataPath);
  const requiredFields = [
    'id',
    'title',
    'content_status',
    'jurisdiction',
    'language',
    'updated_at',
    'reviewer',
    'review_due',
    'sources',
  ];
  for (const field of requiredFields) {
    if (!Object.hasOwn(metadata, field)) {
      reportError(`situations/${id}/metadata.yml: campo ${field} mancante.`);
    }
  }
  if (metadata.id !== id) {
    reportError(`situations/${id}/metadata.yml: id deve corrispondere al nome della cartella.`);
  }
  if (
    !['draft', 'under-review', 'verified', 'needs-update', 'deprecated', 'archived'].includes(
      metadata.content_status,
    )
  ) {
    reportError(`situations/${id}/metadata.yml: content_status non riconosciuto.`);
  }
  if (!isIsoDate(metadata.updated_at)) {
    reportError(`situations/${id}/metadata.yml: updated_at deve usare YYYY-MM-DD.`);
  }
  if (metadata.review_due !== 'null' && !isIsoDate(metadata.review_due)) {
    reportError(
      `situations/${id}/metadata.yml: review_due deve essere una data YYYY-MM-DD o null.`,
    );
  }
  if (!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(metadata.language ?? '')) {
    reportError(`situations/${id}/metadata.yml: language deve essere un codice lingua valido.`);
  }
  if (metadata.reviewer === 'unassigned') {
    reportWarning(`situations/${id}/metadata.yml: nessun revisore assegnato.`);
  }
  if (metadata.sources !== 'references/sources.md') {
    reportError(`situations/${id}/metadata.yml: sources deve puntare a references/sources.md.`);
  }

  const sourceRegister = path.join(situationPath, 'references', 'sources.md');
  if (!(await exists(sourceRegister))) {
    reportError(`situations/${id}/references/sources.md mancante.`);
  } else {
    await validateSourceRegister(sourceRegister);
  }

  for (const file of await walk(situationPath)) {
    if (file.endsWith('.md') && !markdownFiles.includes(file)) {
      markdownFiles.push(file);
    }
  }
}

for (const requiredFile of requiredNoiseFiles) {
  if (!(await exists(path.join(situationsRoot, 'noise', requiredFile)))) {
    reportError(`File richiesto per il pilota noise mancante: situations/noise/${requiredFile}`);
  }
}

const rootMarkdownFiles = [
  'README.md',
  'CONTRIBUTING.md',
  'GOVERNANCE.md',
  'DISCLAIMER.md',
  'SECURITY.md',
  'PRIVACY.md',
  'ROADMAP.md',
  'CHANGELOG.md',
  'AUTHORS.md',
  'CODE_OF_CONDUCT.md',
  'docs/content-review-policy.md',
  'docs/legal-content-policy.md',
  'docs/source-verification-policy.md',
];
for (const relativePath of rootMarkdownFiles) {
  const filePath = path.join(root, relativePath);
  if (await exists(filePath)) {
    markdownFiles.push(filePath);
  }
}

await validateRepositoryFileSizes(root);

const placeholderPattern =
  /\[(?:INFORMAZIONE DA INSERIRE|DATA DA VERIFICARE|FONTE NECESSARIA|PROFESSIONISTA DA CONSULTARE)\]/i;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const phonePattern = /(?:\+?\d[\s().-]*){9,}/;
const licensePlatePattern = /\b[A-Z]{2}\s?\d{3}\s?[A-Z]{2}\b/i;
const streetAddressPattern =
  /\b(?:via|viale|piazza|corso|vicolo|largo|strada|street|road|avenue|boulevard)\s+[\p{L}'’-]+(?:\s+[\p{L}'’-]+){0,3}\s+\d{1,4}\b/iu;
const postalCodePattern = /\b\d{5}\b/;
const coordinatePattern = /\b-?\d{1,3}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}\b/;
const privacyFiles = [...markdownFiles];
for (const directory of [situationsRoot, path.join(root, '.github', 'ISSUE_TEMPLATE')]) {
  if (await exists(directory)) {
    privacyFiles.push(...(await walk(directory)).filter((filePath) => filePath.endsWith('.yml')));
  }
}

for (const filePath of privacyFiles) {
  const relativePath = path.relative(root, filePath);
  const content = await readFile(filePath, 'utf8');
  const isMarkdown = filePath.endsWith('.md');
  const isTemplate =
    isMarkdown &&
    ['documents', 'forms', 'evidence', 'authorities', 'professionals'].some((directory) =>
      relativePath.includes(`${path.sep}${directory}${path.sep}`),
    );
  if (isMarkdown && !isTemplate && placeholderPattern.test(content)) {
    reportError(`${relativePath}: segnaposto non risolto fuori da un template compilabile.`);
  }
  if (
    emailPattern.test(content) ||
    phonePattern.test(content) ||
    licensePlatePattern.test(content) ||
    streetAddressPattern.test(content) ||
    postalCodePattern.test(content) ||
    coordinatePattern.test(content)
  ) {
    reportError(
      `${relativePath}: possibile email, telefono, targa, indirizzo, CAP o coordinata; rimuovere o richiedere revisione manuale.`,
    );
  }
  if (isMarkdown && Buffer.byteLength(content, 'utf8') > 1024 * 1024) {
    reportError(`${relativePath}: file Markdown superiore a 1 MiB.`);
  }
}

const indexPath = path.join(situationsRoot, 'README.md');
const expectedIndex = await buildIndex(situationIds);
if (writeIndex) {
  await writeFile(indexPath, expectedIndex, 'utf8');
  markdownFiles.push(indexPath);
} else if ((await exists(indexPath)) && (await readFile(indexPath, 'utf8')) !== expectedIndex) {
  reportError(
    'situations/README.md non aggiornato. Esegui `npm run content:check -- --write-index`.',
  );
} else if (!(await exists(indexPath))) {
  reportError(
    'situations/README.md mancante; genera l’indice con `npm run content:check -- --write-index`.',
  );
} else {
  markdownFiles.push(indexPath);
}

await validateLinks(markdownFiles);

for (const warning of warnings) {
  console.warn(`AVVISO: ${warning}`);
}
for (const error of errors) {
  console.error(`ERRORE: ${error}`);
}

if (errors.length > 0) {
  process.exitCode = 1;
} else {
  console.log(
    `Controllo contenuti superato: ${situationIds.length} situazione/i, ${markdownFiles.length} file Markdown. Nessun dato personale rilevato dai controlli automatici.`,
  );
}
