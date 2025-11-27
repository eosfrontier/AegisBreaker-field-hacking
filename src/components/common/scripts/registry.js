// Central registry for scripts and their context-specific behaviors.
// Each script can declare per-context behavior via contexts[contextId] = { run: (ctxApi) => any, description?: string }.

export const SCRIPT_REGISTRY = {
  scan: {
    name: 'Scan',
    description: 'Reveal key data or reduce interference.',
    contexts: {
      logic: {
        label: 'Highlight contradictions',
        description: 'Marks statements that contradict your current labels.',
        run: (ctx) => ctx?.revealContradictions?.(),
      },
      sequence: {
        label: 'Narrow band',
        description: 'Reduce distractors for a few steps.',
        run: (ctx) => ctx?.narrowBand?.(),
      },
    },
  },
  mask: {
    name: 'Mask',
    description: 'Extend timer or reduce detection; placeholder.',
    contexts: {},
  },
  weaken_ice: {
    name: 'Weaken ICE',
    description: 'Soften defenses; resets the current ICE at a lower difficulty.',
    contexts: {
      logic: {
        label: 'Weaken ICE',
        description: 'Lower the puzzle difficulty (resets current puzzle).',
        run: (ctx) => ctx?.weakenIce?.(),
      },
      sequence: {
        label: 'Weaken ICE',
        description: 'Lower the puzzle difficulty (resets current puzzle).',
        run: (ctx) => ctx?.weakenIce?.(),
      },
    },
  },
  snoop: {
    name: 'Snoop',
    description: 'Reveal a clue.',
    contexts: {
      logic: {
        label: 'Reveal a clue',
        description: 'Auto-label one module correctly.',
        run: (ctx) => ctx?.revealClue?.(),
      },
      sequence: {
        label: 'Echo hint',
        description: 'Highlight the correct symbol briefly.',
        run: (ctx) => ctx?.revealHint?.(),
      },
    },
  },
  override: {
    name: 'Override',
    description: 'Skip a layer; placeholder.',
    contexts: {},
  },
  worm: {
    name: 'Worm',
    description: 'Auto-progress a step; placeholder.',
    contexts: {},
  },
  zeroday: {
    name: 'Zero Day',
    description: 'Instant solve; placeholder.',
    contexts: {},
  },
  shield: {
    name: 'Shield',
    description: 'Become immune for one puzzle; placeholder.',
    contexts: {},
  },
  auto_step: {
    name: 'Auto-Step',
    description: 'Perform a safe automatic step; placeholder.',
    contexts: {
      sequence: {
        label: 'Auto-select next symbol',
        description: 'Selects the correct next symbol in the sequence; placeholder.',
        run: (ctx) => ctx?.autoStep?.(),
      },
      masterLock: {
        label: 'Auto-toggle correct pin',
        description: 'Toggles a correct pin to help progress.',
        run: (ctx) => ctx?.autoStep?.(),
      },
    },
  },
  recon: {
    name: 'Recon',
    description: 'Surface intel before initialization.',
    contexts: {
      main_preinit: {
        label: 'Reveal next group',
        description: 'Shows the upcoming group on the main hacking screen.',
        run: (ctx) => ctx?.revealNextGroup?.(),
      },
    },
  },
};

export function getScriptDefinition(id) {
  return SCRIPT_REGISTRY[id] || null;
}

export function listScriptsForContext(contextId) {
  if (!contextId) return [];
  return Object.entries(SCRIPT_REGISTRY)
    .filter(([, def]) => def?.contexts?.[contextId])
    .map(([id, def]) => ({ id, ...def, contextBehavior: def.contexts[contextId] }));
}
