// Central registry for scripts and their context-specific behaviors.
// Each script can declare per-context behavior via contexts[contextId] = { run: (ctxApi) => any, description?: string }.

export const SCRIPT_REGISTRY = {
  contradiction_scan: {
    name: 'Scan',
    description: 'Highlight contradictions based on current labels.',
    contexts: {
      logic: {
        label: 'Highlight contradictions',
        description: 'Marks statements that contradict your current labels.',
        run: (ctx) => ctx?.revealContradictions?.(),
      },
    },
  },
  auto_step: {
    name: 'Auto-Step',
    description: 'Perform a safe automatic step.',
    contexts: {
      sequence: {
        label: 'Auto-select next symbol',
        description: 'Selects the correct next symbol in the sequence.',
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
