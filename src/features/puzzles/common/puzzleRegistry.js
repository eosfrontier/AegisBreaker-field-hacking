const PUZZLE_DEFINITIONS = [
  {
    type: 'sequence',
    label: 'Sequence',
    shortLabel: 'Sequence',
    quickHackLabel: 'Sequencer',
    badge: 'SEQ',
    colorVar: '--puzzle-color-sequence',
    enabled: true,
  },
  {
    type: 'frequencyTuning',
    label: 'Frequency Tuning',
    shortLabel: 'Frequency',
    quickHackLabel: 'Frequency Tuner',
    badge: 'FQ',
    colorVar: '--puzzle-color-frequency',
    enabled: true,
  },
  {
    type: 'logic',
    label: 'Logic Puzzle',
    shortLabel: 'Logic',
    quickHackLabel: 'Logic Sifter',
    badge: 'LOG',
    colorVar: '--puzzle-color-logic',
    enabled: true,
  },
  {
    type: 'masterLock',
    label: 'Circle Lock',
    shortLabel: 'Circle Lock',
    quickHackLabel: 'Lock Picker',
    badge: 'CLK',
    colorVar: '--puzzle-color-masterlock',
    enabled: true,
  },
  {
    type: 'signalShunt',
    label: 'Signal Rerouter',
    shortLabel: 'Signal Rerouter',
    quickHackLabel: 'Signal Rerouter',
    badge: 'SIG',
    colorVar: '--puzzle-color-signal',
    enabled: true,
  },
  {
    type: 'byteStream',
    label: 'Bytestream',
    shortLabel: 'Bytestream',
    quickHackLabel: 'Bytestream',
    badge: 'BST',
    colorVar: '--puzzle-color-bytestream',
    enabled: false,
  },
];

const UNKNOWN_PUZZLE_META = {
  type: 'unknown',
  label: 'Unknown',
  shortLabel: 'Unknown',
  badge: 'UNK',
};

const PUZZLE_META_BY_TYPE = PUZZLE_DEFINITIONS.reduce((acc, def) => {
  acc[def.type] = def;
  return acc;
}, {});

export const DIFFICULTY_LABELS = {
  1: 'Basic',
  2: 'Intermediate',
  3: 'Complex',
  4: 'Intricate',
  5: 'Inscrutable',
};

export const PUZZLE_TYPES = PUZZLE_DEFINITIONS.filter((def) => def.enabled).map((def) => ({
  value: def.type,
  label: def.label,
}));

export const PUZZLE_TOOLS = PUZZLE_DEFINITIONS.filter((def) => def.enabled).map((def) => ({
  type: def.type,
  label: def.quickHackLabel || def.label,
}));

export const PUZZLE_COMPONENT_TYPES = PUZZLE_DEFINITIONS.reduce((acc, def) => {
  acc[def.type] = def.componentType || def.type;
  return acc;
}, {});

export function getPuzzleMeta(type) {
  if (!type) return UNKNOWN_PUZZLE_META;
  return PUZZLE_META_BY_TYPE[type] || UNKNOWN_PUZZLE_META;
}

export function getPuzzleColor(type) {
  const meta = getPuzzleMeta(type);
  if (meta.colorVar) return `var(${meta.colorVar})`;
  return '#ffffff';
}
