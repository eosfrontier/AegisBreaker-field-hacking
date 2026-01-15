import { useCallback, useState } from 'react';
import { fetchOrthancCharacter, fetchOrthancSkills } from '../api/orthancClient';
import { getAuthMode, useJoomlaSession } from '../auth/JoomlaSessionContext';

const parseMockJson = (raw, label) => {
  if (!raw) {
    throw new Error(`${label} is missing`);
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }
};

const getCharacterId = (character) => {
  if (!character || typeof character !== 'object') return '';
  return character.characterID ?? character.characterId ?? character.character_id ?? character.id ?? '';
};

const getItLevel = (skills) => {
  const list = Array.isArray(skills) ? skills : Array.isArray(skills?.skills) ? skills.skills : [];
  const entry = list.find((skill) => typeof skill?.name === 'string' && skill.name.toLowerCase() === 'it');
  const level = Number(entry?.level);
  return Number.isFinite(level) ? level : 0;
};

const mapOrthancProfile = (character, skills) => {
  const characterId = getCharacterId(character);
  if (!characterId) {
    throw new Error('Orthanc response missing characterID.');
  }
  const characterName = character?.character_name ?? character?.characterName ?? '';
  const faction = character?.faction ?? '';
  const itLevel = getItLevel(skills);

  return {
    characterId,
    characterName,
    faction,
    itLevel,
  };
};

export function useOrthancImport() {
  const { isLoggedIn, joomlaId } = useJoomlaSession();
  const authMode = getAuthMode();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const importCharacter = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      let character;
      let skills;

      if (authMode === 'mock') {
        character = parseMockJson(import.meta.env.VITE_ORTHANC_MOCK_CHARACTER, 'VITE_ORTHANC_MOCK_CHARACTER');
        skills = parseMockJson(import.meta.env.VITE_ORTHANC_MOCK_SKILLS, 'VITE_ORTHANC_MOCK_SKILLS');
        if (!Array.isArray(skills)) {
          throw new Error('VITE_ORTHANC_MOCK_SKILLS must be a JSON array');
        }
      } else {
        if (authMode === 'joomla' && (!isLoggedIn || !joomlaId)) {
          throw new Error('Login to Joomla to import a character profile.');
        }
        character = await fetchOrthancCharacter(joomlaId);
        const characterId = getCharacterId(character);
        if (!characterId) {
          throw new Error('Orthanc response missing characterID.');
        }
        skills = await fetchOrthancSkills(characterId);
      }

      const mapped = mapOrthancProfile(character, skills);
      setData(mapped);
      return mapped;
    } catch (err) {
      const nextError = err instanceof Error ? err : new Error(String(err));
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, [authMode, isLoggedIn, joomlaId]);

  return { importCharacter, loading, error, data };
}
