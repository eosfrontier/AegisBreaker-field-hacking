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
        description: 'Reduces the amount of dud options.',
        run: (ctx) => ctx?.narrowBand?.(),
      },
      masterLock: {
        label: 'Stabilize ring',
        description: 'Nudges the most misaligned ring toward alignment.',
        run: (ctx) => ctx?.stabilizeRing?.(),
      },
      frequency: {
        label: 'Harmonic sweep',
        description: 'Nudges your outgoing waves toward the carrier signature.',
        run: (ctx) => ctx?.harmonicSweep?.(),
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
      masterLock: {
        label: 'Auto-align ring',
        description: 'Snaps a misaligned ring to the lock baseline.',
        run: (ctx) => ctx?.autoStep?.(),
      },
      frequency: {
        label: 'Reveal carrier',
        description: 'Snaps Wave 01 to the detected carrier signature.',
        run: (ctx) => ctx?.revealPrimary?.(),
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
    description: 'Perform a safe automatic step;',
    contexts: {
      masterLock: {
        label: 'Auto-align ring',
        description: 'Snaps a misaligned ring to the lock baseline.',
        run: (ctx) => ctx?.autoStep?.(),
      },
      frequency: {
        label: 'Auto-lock',
        description: 'Force-aligns all waves to the carrier baseline.',
        run: (ctx) => ctx?.autoLock?.(),
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
