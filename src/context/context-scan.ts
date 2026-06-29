import path from 'node:path';
import fg from 'fast-glob';
import fs from 'fs-extra';
import { parse as parseJsonc } from 'jsonc-parser';
import { saveContextSummary } from '../memory/index.js';
import { CONTEXT_IGNORE } from './file-context.js';

export interface ProjectContext {
  projectRoot: string;
  files: string[];
  packageJson?: {
    name?: string;
    version?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  tsconfig?: unknown;
  summary: string;
}

export async function scanProject(projectRoot: string): Promise<ProjectContext> {
  const files = await fg('**/*', {
    cwd: projectRoot,
    dot: true,
    onlyFiles: true,
    ignore: CONTEXT_IGNORE,
  });

  const packageJson = await readJsonIfExists(path.join(projectRoot, 'package.json'));
  const tsconfig = await readJsoncIfExists(path.join(projectRoot, 'tsconfig.json'));
  const summary = formatSummary(projectRoot, files, packageJson, tsconfig);

  return { projectRoot, files, packageJson, tsconfig, summary };
}

export async function generateContext(projectRoot: string): Promise<string> {
  const context = await scanProject(projectRoot);
  await saveContextSummary(projectRoot, context.summary);
  return context.summary;
}

function formatSummary(
  projectRoot: string,
  files: string[],
  packageJson: ProjectContext['packageJson'],
  tsconfig: unknown,
): string {
  const tree = files.slice(0, 250).map((file) => `- ${file}`).join('\n');
  const scripts = packageJson?.scripts
    ? Object.keys(packageJson.scripts).join(', ')
    : 'none detected';
  const deps = packageJson?.dependencies
    ? Object.keys(packageJson.dependencies).join(', ')
    : 'none detected';
  const devDeps = packageJson?.devDependencies
    ? Object.keys(packageJson.devDependencies).join(', ')
    : 'none detected';

  return [
    `Project root: ${projectRoot}`,
    `Package: ${packageJson?.name ?? 'unknown'} ${packageJson?.version ?? ''}`.trim(),
    `Scripts: ${scripts}`,
    `Dependencies: ${deps}`,
    `Dev dependencies: ${devDeps}`,
    `TypeScript config: ${tsconfig ? 'present' : 'not detected'}`,
    '',
    `Files (${files.length}${files.length > 250 ? ', first 250 shown' : ''}):`,
    tree || '- no files detected',
  ].join('\n');
}

async function readJsonIfExists(filePath: string): Promise<ProjectContext['packageJson']> {
  if (!(await fs.pathExists(filePath))) {
    return undefined;
  }

  return (await fs.readJson(filePath)) as ProjectContext['packageJson'];
}

async function readJsoncIfExists(filePath: string): Promise<unknown> {
  if (!(await fs.pathExists(filePath))) {
    return undefined;
  }

  return parseJsonc(await fs.readFile(filePath, 'utf8'));
}
