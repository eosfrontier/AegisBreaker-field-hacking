import { useCallback, useState } from 'react';
import { getAuthMode, useJoomlaSession } from './JoomlaSessionContext';

const CLOUD_PROFILE_KEY = 'profile';

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const normalizeCloudProfile = (profile) => {
  if (!profile || typeof profile !== 'object') return null;
  return {
    ...profile,
    characterName: profile.characterName || profile.displayName || '',
    displayName: profile.displayName || profile.characterName || '',
    itLevel: toNumber(profile.itLevel),
  };
};

export const loadCloudProfile = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CLOUD_PROFILE_KEY);
    if (!raw) return null;
    return normalizeCloudProfile(JSON.parse(raw));
  } catch {
    return null;
  }
};

const saveCloudProfile = (profile) => {
  if (typeof window === 'undefined') return normalizeCloudProfile(profile);
  try {
    localStorage.setItem(CLOUD_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore */
  }
  return normalizeCloudProfile(profile);
};

const buildError = (message, code) => {
  const err = new Error(message);
  if (code) err.code = code;
  return err;
};

const parseJsonResponse = async (res, label) => {
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from ${label} but got: ${text.slice(0, 80)}`);
  }
  return { data, text };
};

const parseMockJson = (envKey, fallback) => {
  const raw = import.meta.env[envKey];
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${envKey} must be valid JSON`);
  }
};

const extractSkills = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.skills)) return payload.skills;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export function useCharacterImport() {
  const { isLoggedIn, joomlaId } = useJoomlaSession();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const importProfile = useCallback(async () => {
    const authMode = getAuthMode();
    setStatus('loading');
    setError(null);

    try {
      let characterData;
      let skillsData;

      if (authMode === 'mock') {
        // Firebase Hosting cannot execute PHP, so mock mode uses local JSON.
        characterData = parseMockJson('VITE_ORTHANK_MOCK_CHARACTER', {
          characterID: '0',
          character_name: 'Mock Operative',
          faction: 'neutral',
        });
        skillsData = parseMockJson('VITE_ORTHANK_MOCK_SKILLS', [{ name: 'it', level: 0 }]);
      } else if (authMode === 'joomla') {
        if (!isLoggedIn) {
          throw buildError('Please log into Joomla to import character.', 'not_logged_in');
        }

        const charsRes = await fetch('/assets/orthank_chars_player.php', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (charsRes.status === 401) {
          throw buildError('Please log into Joomla to import character.', 'not_logged_in');
        }

        const { data } = await parseJsonResponse(charsRes, '/assets/orthank_chars_player.php');
        if (!charsRes.ok) {
          throw new Error(`Orthank character request failed (${charsRes.status}).`);
        }
        characterData = data;

        const characterId = characterData?.characterID ?? characterData?.characterId ?? characterData?.character_id;
        if (!characterId) {
          throw new Error('Orthank response missing characterID.');
        }

        const skillsRes = await fetch(
          `/assets/orthank_skills_character.php?characterId=${encodeURIComponent(String(characterId))}`,
          {
            credentials: 'include',
            cache: 'no-store',
          },
        );

        if (skillsRes.status === 401) {
          throw buildError('Please log into Joomla to import character.', 'not_logged_in');
        }

        const skillsJson = await parseJsonResponse(skillsRes, '/assets/orthank_skills_character.php');
        if (!skillsRes.ok) {
          throw new Error(`Orthank skills request failed (${skillsRes.status}).`);
        }
        skillsData = skillsJson.data;
      } else {
        throw new Error('Character import is disabled in this auth mode.');
      }

      const characterId = characterData?.characterID ?? characterData?.characterId ?? characterData?.character_id;
      const characterName = characterData?.character_name ?? characterData?.characterName ?? characterData?.name ?? '';
      const faction = characterData?.faction ?? '';
      const skillsArray = extractSkills(skillsData);
      const itSkill = skillsArray.find((skill) => String(skill?.name || '').toLowerCase() === 'it');
      const itLevel = toNumber(itSkill?.level);

      const cloudProfile = {
        accountId: joomlaId ? String(joomlaId) : '',
        characterId: characterId != null ? String(characterId) : '',
        characterName: String(characterName || ''),
        faction: String(faction || ''),
        itLevel,
        importedAt: Date.now(),
        source: 'cloud',
      };

      const normalized = saveCloudProfile(cloudProfile);
      setStatus('ready');
      return normalized;
    } catch (err) {
      const resolved = err instanceof Error ? err : new Error(String(err));
      setError(resolved);
      setStatus('error');
      throw resolved;
    }
  }, [isLoggedIn, joomlaId]);

  return {
    importProfile,
    status,
    error,
  };
}
