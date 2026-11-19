/**
 * Host half of @local/skills-inspector.
 *
 * Routes on the Host web server:
 *   GET  /api/skills-inspector/skills     -> { skills, roots, warnings, scannedAt }
 *   GET  /api/skills-inspector/prompt     -> { ok, text, error }
 *   POST /api/skills-inspector/translate  -> { ok, translations, error }
 *
 * Translation uses the profile's own configured LLM (no extra key), cached to disk.
 */
import { readFile, readdir, stat, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { homedir } from 'node:os';

export const inject = ['webServer', 'systemPrompt', 'workingDirectory', 'workspaceRegistry', 'llm', 'agentDefaultModel'];

const API = '/api/skills-inspector';
const MAX_FILE = 512 * 1024;
const MAX_DEPTH = 4;
const CACHE_FILE = path.join(process.env.DSH_HOME || path.join(homedir(), '.dsh'), 'inspector-translations.json');

function json(res, status, value) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(value));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 200000) { reject(Error('request too large')); req.destroy(); }
    });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

function frontmatter(text) {
  const out = {};
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return out;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return out;
}

function collectWorkspaces(ctx) {
  const found = new Set();
  try {
    const registry = ctx && ctx.workspaceRegistry;
    if (registry && typeof registry.list === 'function') {
      for (const ws of registry.list()) {
        if (typeof ws === 'string') { found.add(ws); continue; }
        if (ws && typeof ws === 'object') {
          for (const key of ['path', 'directory', 'root', 'cwd', 'dir', 'folder', 'workdir']) {
            if (typeof ws[key] === 'string' && ws[key]) found.add(ws[key]);
          }
        }
      }
    }
  } catch (_) {}
  try {
    const wd = ctx && ctx.workingDirectory;
    if (wd && wd.defaultDirectory) found.add(wd.defaultDirectory);
  } catch (_) {}
  found.add(process.cwd());
  return [...found];
}

function skillRoots(ctx) {
  const home = homedir();
  const resources = process.resourcesPath || '';
  const list = [];
  for (const workspace of collectWorkspaces(ctx)) {
    list.push([path.join(workspace, '.agents', 'skills'), 'workspace/.agents']);
    list.push([path.join(workspace, '.dsh', 'skills'), 'workspace/.dsh']);
    list.push([path.join(workspace, 'agent', 'skills'), 'workspace/agent']);
  }
  list.push([path.join(home, '.agents', 'skills'), 'home/.agents']);
  list.push([path.join(home, '.dsh', 'skills'), 'home/.dsh']);
  if (resources) {
    list.push([path.join(resources, 'app.asar', 'dsh', 'node_modules', '@deepseek-ai', 'dsh-agent-preset', 'skills'), 'built-in']);
    list.push([path.join(resources, 'runtime', 'office-skills'), 'runtime/office']);
  }
  const extra = process.env.DSH_SKILLS_INSPECTOR_DIRS || '';
  for (const part of extra.split(/[;|]/)) {
    const dir = part.trim();
    if (dir) list.push([dir, 'extra']);
  }
  return list;
}

async function walk(dir, source, depth, out, seen) {
  if (depth < 0) return;
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
  const own = entries.find((e) => e.isFile() && e.name.toLowerCase() === 'skill.md');
  if (own) {
    const file = path.join(dir, own.name);
    const key = path.resolve(file).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      try {
        const st = await stat(file);
        if (st.isFile() && st.size <= MAX_FILE) {
          const content = await readFile(file, 'utf8');
          const meta = frontmatter(content);
          out.push({
            id: path.basename(dir),
            name: meta.name || path.basename(dir),
            description: meta.description || '',
            file, dir, source, size: st.size, content,
          });
        }
      } catch (_) {}
    }
    return;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name.endsWith('.bak')) continue;
    await walk(path.join(dir, entry.name), source, depth - 1, out, seen);
  }
}

async function scanSkills(ctx) {
  const roots = skillRoots(ctx);
  const out = [];
  const seen = new Set();
  const warnings = [];
  for (const [dir, source] of roots) {
    try { await walk(dir, source, MAX_DEPTH, out, seen); }
    catch (err) { warnings.push(`${source}: ${err && err.message ? err.message : String(err)}`); }
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return { skills: out, roots: roots.map(([dir, source]) => ({ dir, source })), warnings, scannedAt: new Date().toISOString() };
}

function renderPrompt(value, depth) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((v) => renderPrompt(v, depth + 1)).filter(Boolean).join('\n');
  if (typeof value === 'object') {
    const lines = [];
    for (const [key, child] of Object.entries(value)) {
      const text = renderPrompt(child, depth + 1);
      if (text) lines.push(`${'#'.repeat(Math.min(Math.max(depth + 1, 2), 6))} ${key}\n${text}`);
    }
    return lines.join('\n\n');
  }
  return String(value);
}

async function assembledPrompt(ctx) {
  try {
    const registry = ctx.systemPrompt;
    if (!registry || typeof registry.assemble !== 'function') {
      return { ok: false, text: '', error: 'systemPrompt service is not mounted in this profile.' };
    }
    const assembly = await registry.assemble({});
    return { ok: true, text: renderPrompt(assembly, 0).trim(), error: '' };
  } catch (err) {
    return { ok: false, text: '', error: String((err && (err.stack || err.message)) || err) };
  }
}

/* ---------- automatic translation via the profile's configured LLM ---------- */

const cache = { data: null, loaded: false };
const inflight = new Map();

async function loadCache() {
  if (cache.loaded) return;
  cache.loaded = true;
  try { cache.data = JSON.parse(await readFile(CACHE_FILE, 'utf8')) || {}; }
  catch { cache.data = {}; }
}
async function saveCache() {
  try {
    await mkdir(path.dirname(CACHE_FILE), { recursive: true });
    await writeFile(CACHE_FILE, JSON.stringify(cache.data, null, 2), 'utf8');
  } catch (_) {}
}

function resolveModel(ctx) {
  try {
    const sel = ctx.agentDefaultModel && typeof ctx.agentDefaultModel.currentSelection === 'function'
      ? ctx.agentDefaultModel.currentSelection() : null;
    if (sel) {
      const provider = sel.provider || sel.providerId || sel.providerName;
      const model = sel.model || sel.modelId || sel.modelName;
      if (provider && model) return { provider, model };
      if (typeof sel === 'string') return sel;
    }
  } catch (_) {}
  return null;
}

function extractJSON(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { return null; }
}

async function callLlm(ctx, items) {
  const route = resolveModel(ctx);
  if (!route) throw new Error('没有可用的默认模型（agentDefaultModel 未配置）。');
  const provider = typeof route === 'string' ? undefined : route.provider;
  const model = typeof route === 'string' ? route : route.model;
  const brief = items.map((it) => ({ name: it.name, description: (it.description || '').slice(0, 600) }));
  const prompt = [
    '你是中文技术文档翻译助手。下面是一批 AI 技能(skill)的英文名和英文说明，请为每个技能生成中文信息。',
    '对每个技能输出：cn=简短中文名(4-12字)，desc=一句中文说明(40字内)，howto=一句话告诉小白怎么用它(说清"你对AI说什么话就能触发它"，40字内)。',
    '只输出一个 JSON 对象：key 是英文名，value 是 {cn,desc,howto}。不要 markdown，不要解释。',
    '输入：' + JSON.stringify(brief),
  ].join('\n');
  let text = '';
  const opts = {
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
    maxTokens: 2400,
  };
  if (provider) opts.provider = provider;
  if (model) opts.model = model;
  for await (const chunk of ctx.llm.stream(opts)) {
    if (!chunk) continue;
    const kind = chunk.type || chunk.kind;
    if (kind === 'text-delta' || kind === 'text') text += (chunk.text || chunk.delta || '');
    else if (kind === 'error' || kind === 'aborted') {
      const f = chunk.failure || chunk.error;
      throw new Error((f && (f.message || f.code)) || 'LLM stream error');
    } else if (kind === 'finish' && chunk.failure) {
      throw new Error((chunk.failure.message || chunk.failure.code) || 'LLM finish error');
    }
  }
  const parsed = extractJSON(text);
  if (!parsed) throw new Error('模型返回无法解析（收到 ' + text.length + ' 字符）：' + text.slice(0, 160));
  return parsed;
}

async function translateItems(ctx, items) {
  await loadCache();
  const result = {};
  const todo = [];
  for (const it of items) {
    const key = it.name;
    if (!key) continue;
    if (cache.data[key]) { result[key] = cache.data[key]; continue; }
    if (!cache.data[key] && !inflight.has(key)) todo.push(it);
    if (inflight.has(key)) todo.push(it);
  }
  if (todo.length) {
    const unique = [...new Map(todo.map((i) => [i.name, i])).values()].filter((i) => !cache.data[i.name]);
    if (unique.length && !inflight.has('__batch')) {
      const p = callLlm(ctx, unique).then((parsed) => {
        for (const [k, v] of Object.entries(parsed)) {
          if (v && typeof v === 'object') {
            cache.data[k] = { cn: v.cn || '', desc: v.desc || '', howto: v.howto || '' };
          }
        }
        saveCache();
        return cache.data;
      }).catch((e) => { return { __error: String(e && e.message || e) }; })
        .finally(() => { inflight.delete('__batch'); });
      inflight.set('__batch', p);
    }
    if (inflight.has('__batch')) await inflight.get('__batch');
    for (const it of items) if (cache.data[it.name]) result[it.name] = cache.data[it.name];
  }
  return { ok: true, translations: result, error: result.__error || '' };
}

export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact', path: `${API}/skills`,
    handler: async (_req, res) => {
      try { json(res, 200, await scanSkills(ctx)); }
      catch (err) { json(res, 500, { error: String((err && err.message) || err) }); }
    },
  }), 'skills-inspector: skills route');

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact', path: `${API}/prompt`,
    handler: async (_req, res) => { json(res, 200, await assembledPrompt(ctx)); },
  }), 'skills-inspector: prompt route');

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact', path: `${API}/translate`,
    handler: async (req, res) => {
      try {
        const body = await readBody(req);
        const items = Array.isArray(body.items) ? body.items : [];
        json(res, 200, await translateItems(ctx, items));
      } catch (err) {
        json(res, 200, { ok: false, translations: {}, error: String((err && err.message) || err) });
      }
    },
  }), 'skills-inspector: translate route');
}
