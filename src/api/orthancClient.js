const ORTHANC_BASE_URL = 'https://api.eosfrontier.space/orthanc/v2';
// Vite env vars are replaced at build time; token must exist during build.
const ORTHANC_TOKEN = import.meta.env.VITE_ORTHANC_TOKEN;

const getToken = () => {
  if (!ORTHANC_TOKEN) {
    throw new Error(
      'Missing VITE_ORTHANC_TOKEN. Vite env vars are replaced at build time; token must exist during build.',
    );
  }
  return ORTHANC_TOKEN;
};

const normalizeId = (id) => {
  const numeric = Number(id);
  if (!Number.isFinite(numeric)) {
    throw new Error(`Orthanc id must be numeric, received "${id}"`);
  }
  return String(numeric);
};

const fetchOrthanc = async (path, id) => {
  console.log('[Orthanc] Request', `${ORTHANC_BASE_URL}${path}`, { id, tokenPresent: !!ORTHANC_TOKEN });

  const token = getToken();
  const res = await fetch(`${ORTHANC_BASE_URL}${path}`, {
    headers: {
      token,
      id: normalizeId(id),
      accountID: normalizeId(id),
      Accept: 'application/json',
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Orthanc request failed (${res.status}): ${text.slice(0, 120)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Orthanc response was not JSON (${res.status}): ${text.slice(0, 120)}`);
  }
};

export async function fetchOrthancCharacter(joomlaId) {
  return fetchOrthanc('/chars_player/', joomlaId);
}

export async function fetchOrthancSkills(characterId) {
  return fetchOrthanc('/chars_player/skills/', characterId);
}
