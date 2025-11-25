import { getScriptDefinition } from '../../common/scripts/registry';

const ROOT_KEY = 'app_scripts_v1';
const GLOBAL_SCOPE = 'global';

function readRoot() {
  try {
    const raw = localStorage.getItem(ROOT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeRoot(obj) {
  localStorage.setItem(ROOT_KEY, JSON.stringify(obj));
}
function ensureScope(root) {
  if (!root[GLOBAL_SCOPE]) root[GLOBAL_SCOPE] = {};
  return root;
}
function isAdmin() {
  try {
    const raw = localStorage.getItem('characterInfo');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.role === 'admin';
  } catch {
    return false;
  }
}

// charges
export function getScriptCharges(_scope, scriptId) {
  const root = ensureScope(readRoot());
  return Number(root[GLOBAL_SCOPE]?.[scriptId]?.charges ?? 0);
}
export function setScriptCharges(_scope, scriptId, charges) {
  const root = ensureScope(readRoot());
  root[GLOBAL_SCOPE][scriptId] = { ...(root[GLOBAL_SCOPE][scriptId] || {}), charges: Math.max(0, Number(charges)) };
  writeRoot(root);
}
export function grantScript(_scope, scriptId, delta = 1) {
  setScriptCharges(GLOBAL_SCOPE, scriptId, getScriptCharges(GLOBAL_SCOPE, scriptId) + Number(delta));
}
export function consumeScriptCharge(_scope, scriptId, n = 1) {
  if (isAdmin()) return true; // infinite for admin testers
  const cur = getScriptCharges(GLOBAL_SCOPE, scriptId);
  if (cur < n) return false;
  setScriptCharges(GLOBAL_SCOPE, scriptId, cur - n);
  return true;
}

// optional helpers
export function listScripts() {
  const root = ensureScope(readRoot());
  return Object.entries(root[GLOBAL_SCOPE] || {}).map(([id, data]) => ({
    id,
    charges: Number(data?.charges ?? 0),
    scope: GLOBAL_SCOPE,
  }));
}
export function clearScripts() {
  const root = readRoot();
  if (root?.[GLOBAL_SCOPE]) {
    delete root[GLOBAL_SCOPE];
    writeRoot(root);
  }
}

// registry-aware executor
export function runScript(scriptId, contextId, ctxApi = {}) {
  const def = getScriptDefinition(scriptId);
  if (!def) return { ok: false, error: 'unknown_script' };
  const behavior = def.contexts?.[contextId];
  if (!behavior) return { ok: false, error: 'context_unsupported' };

  const charges = getScriptCharges(GLOBAL_SCOPE, scriptId);
  const admin = isAdmin();
  if (!admin && charges <= 0) {
    // Gracefully auto-grant 1 charge for quick testing when out.
    setScriptCharges(GLOBAL_SCOPE, scriptId, 1);
  }

  const result = behavior.run?.(ctxApi);
  if (!admin) setScriptCharges(GLOBAL_SCOPE, scriptId, Math.max(0, getScriptCharges(GLOBAL_SCOPE, scriptId) - 1));
  return { ok: true, result };
}
