const ROOT_KEY = 'app_prefs_v1';

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

export function getFlag(scope, key, defaultValue = false) {
  const root = readRoot();
  return !!(root?.[scope]?.[key] ?? defaultValue);
}
export function setFlag(scope, key, value = true) {
  const root = readRoot();
  root[scope] = root[scope] || {};
  root[scope][key] = !!value;
  writeRoot(root);
}

export function getValue(scope, key, defaultValue = null) {
  const root = readRoot();
  return root?.[scope]?.[key] ?? defaultValue;
}
export function setValue(scope, key, value) {
  const root = readRoot();
  root[scope] = root[scope] || {};
  root[scope][key] = value;
  writeRoot(root);
}

export function remove(scope, key) {
  const root = readRoot();
  if (root?.[scope]) {
    delete root[scope][key];
    writeRoot(root);
  }
}
export function clearScope(scope) {
  const root = readRoot();
  if (root?.[scope]) {
    delete root[scope];
    writeRoot(root);
  }
}
export function getScope(scope) {
  const root = readRoot();
  return root?.[scope] || {};
}
