const ROOT_KEY = 'app_scripts_v1';

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

// charges
export function getScriptCharges(scope, scriptId) {
  const root = readRoot();
  return Number(root?.[scope]?.[scriptId]?.charges ?? 0);
}
export function setScriptCharges(scope, scriptId, charges) {
  const root = readRoot();
  root[scope] = root[scope] || {};
  root[scope][scriptId] = { ...(root[scope][scriptId] || {}), charges: Math.max(0, Number(charges)) };
  writeRoot(root);
}
export function grantScript(scope, scriptId, delta = 1) {
  setScriptCharges(scope, scriptId, getScriptCharges(scope, scriptId) + Number(delta));
}
export function consumeScriptCharge(scope, scriptId, n = 1) {
  const cur = getScriptCharges(scope, scriptId);
  if (cur < n) return false;
  setScriptCharges(scope, scriptId, cur - n);
  return true;
}

// optional helpers
export function listScripts(scope) {
  const root = readRoot();
  return Object.entries(root?.[scope] || {}).map(([id, data]) => ({ id, charges: Number(data?.charges ?? 0) }));
}
export function clearScripts(scope) {
  const root = readRoot();
  if (root?.[scope]) {
    delete root[scope];
    writeRoot(root);
  }
}
