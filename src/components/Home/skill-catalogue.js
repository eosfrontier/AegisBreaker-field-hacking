// ---- skill-catalogue.js ---------------------------------
export const SKILL_TIERS = {
  '1-2': [
    { id: 'initialize', label: 'Initialize Hack' },
    { id: 'scan', label: 'Script - Scan' },
    { id: 'hack_consumer', label: 'Hack Consumer Electronics' },
  ],
  '3-4': [
    { id: 'hack_industrial', label: 'Hack Industrial Electronics' },
    { id: 'restart_device', label: 'Restart Device' },

    // “scripts” (1× / session consumables)
    { id: 'script_mask', label: 'Script - Mask' },
    { id: 'script_weaken_ice', label: 'Script - Weaken ICE' },
    { id: 'script_snoop', label: 'Script - Snoop' },
  ],
  '5-6': [
    { id: 'hack_security', label: 'Hack Security Devices (cams, turrets)' },
    { id: 'sabotage_basic', label: 'Sabotage (Basic)' },
    { id: 'script_override', label: 'Script - Override' },
  ],
  '7-8': [
    { id: 'hack_it', label: 'Hack IT Infrastructure (routers, modems)' },
    { id: 'improvise', label: 'Improvise (GM adjudication)' },
    { id: 'script_worm', label: 'Script - Worm' },
    { id: 'sabotage_adv', label: 'Sabotage (Advanced)' },
  ],
  '9-10': [
    { id: 'system_takeover', label: 'System Takeover' },
    { id: 'realtime_ctrl', label: 'Real-time Control' },
    { id: 'script_zeroday', label: 'Script - Zero Day (instant solve)' },
    { id: 'script_shield', label: 'Script - Shield (immune this puzzle)' },
    { id: 'sabotage_crit', label: 'Sabotage (Critical)' },
  ],
};

export const tierForLevel = (lvl) => {
  if (lvl <= 2) return '1-2';
  if (lvl <= 4) return '3-4';
  if (lvl <= 6) return '5-6';
  if (lvl <= 8) return '7-8';
  return '9-10';
};

export const getAvailableSkills = (lvl) => {
  const result = [];
  for (const [range, skills] of Object.entries(SKILL_TIERS)) {
    const [min] = range.split('-').map(Number);
    if (lvl >= min) result.push(...skills);
  }
  return result;
};

export const getLabelById = (id) => {
  for (const arr of Object.values(SKILL_TIERS)) {
    const hit = arr.find((s) => s.id === id);
    if (hit) return hit.label;
  }
  return id;
};
