import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useScriptContext } from '../scripts/ScriptProvider';
import { usePuzzleCompletion } from './common/usePuzzleCompletion';
import './styles/SignalShuntPuzzle.css';
import sciCircle from '../../assets/sci-fi-vector-circle.svg';
import sciHashtag from '../../assets/sci-fi-vector-hashtag.svg';
import sciTriangle from '../../assets/sci-fi-vector-triangle.svg';
import sciCross from '../../assets/sci-fi-vector-cross.svg';
import sciHexagon from '../../assets/sci-fi-vector-hexagon.svg';
import sciStar from '../../assets/sci-fi-vector-star.svg';

// ============================================================================
// CONFIG
// ============================================================================
const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'cyan'];
const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'hexagon', 'star'];
const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const ALL_COMBOS = (() => {
  const combos = [];
  for (const color of COLORS) {
    for (const shape of SHAPES) {
      for (const number of NUMBERS) {
        combos.push({ color, shape, number });
      }
    }
  }
  return combos;
})();

const SHAPE_MASKS = {
  circle: sciCircle,
  square: sciHashtag,
  triangle: sciTriangle,
  diamond: sciCross,
  hexagon: sciHexagon,
  star: sciStar,
};

// ============================================================================
// RULE GENERATION
// ============================================================================
function generateRules(difficulty, seed) {
  const rng = seededRandom(seed);

  const binCount = [0, 3, 3, 3, 4, 5][difficulty] || 5;

  const bins = [];
  const rules = [];
  const ruleDescriptions = [];
  const ruleTokens = [];

  const buildNumberClause = () => {
    const options = [
      {
        fn: (p) => p.number % 2 === 0,
        desc: 'value is even',
        tokens: [
          { type: 'keyword', value: 'VALUE' },
          { type: 'text', value: ' is even' },
        ],
      },
      {
        fn: (p) => p.number % 2 !== 0,
        desc: 'value is odd',
        tokens: [
          { type: 'keyword', value: 'VALUE' },
          { type: 'text', value: ' is odd' },
        ],
      },
      {
        fn: (p) => p.number % 3 === 0,
        desc: 'divisible by 3',
        tokens: [
          { type: 'keyword', value: 'VALUE' },
          { type: 'text', value: ' divisible by 3' },
        ],
      },
      {
        fn: (p) => p.number % 4 === 0,
        desc: 'divisible by 4',
        tokens: [
          { type: 'keyword', value: 'VALUE' },
          { type: 'text', value: ' divisible by 4' },
        ],
      },
      {
        fn: (p) => p.number > 5,
        desc: 'value > 5',
        tokens: [
          { type: 'keyword', value: 'VALUE ' },
          { type: 'text', value: ' > 5' },
        ],
      },
      {
        fn: (p) => p.number < 4,
        desc: 'value < 4',
        tokens: [
          { type: 'keyword', value: 'VALUE ' },
          { type: 'text', value: ' < 4' },
        ],
      },
      {
        fn: (p) => p.number >= 3 && p.number <= 7,
        desc: 'value 3-7',
        tokens: [
          { type: 'keyword', value: 'VALUE ' },
          { type: 'text', value: ' 3-7' },
        ],
      },
    ];
    return options[Math.floor(rng() * options.length)];
  };

  const pickColorSubset = (min = 2, max = 4) => {
    const shuffled = shuffleArray([...COLORS], rng);
    const take = min + Math.floor(rng() * (max - min + 1));
    return shuffled.slice(0, take);
  };
  const pickShapeSubset = (min = 2, max = 3) => {
    const shuffled = shuffleArray([...SHAPES], rng);
    const take = min + Math.floor(rng() * (max - min + 1));
    return shuffled.slice(0, take);
  };

  const toColorTokens = (colors) =>
    colors.flatMap((c, idx) => [
      { type: 'color', value: c },
      ...(idx < colors.length - 1 ? [{ type: 'text', value: ', ' }] : []),
    ]);

  const toShapeTokens = (shapes) =>
    shapes.flatMap((s, idx) => [
      { type: 'shape', value: s },
      ...(idx < shapes.length - 1 ? [{ type: 'text', value: ', ' }] : []),
    ]);

  const buildCompositeRule = (level) => {
    const clauseCount = level <= 1 ? 1 : level <= 2 ? 1 : level <= 4 ? 2 : 3;
    const pools = [
      {
        id: 'colorPos',
        build: () => {
          const subset = pickColorSubset();
          return {
            fn: (p) => subset.includes(p.color),
            desc: `color in ${subset.join(', ')}`,
            tokens: [...toColorTokens(subset)],
          };
        },
      },
      {
        id: 'colorNeg',
        build: () => {
          const subset = pickColorSubset(2, Math.max(2, Math.min(3, level + 1)));
          return {
            fn: (p) => !subset.includes(p.color),
            desc: `color NOT in ${subset.join(', ')}`,
            tokens: [
              { type: 'keyword', value: 'COLOR ' },
              { type: 'keyword', value: 'NOT ' },
              ...toColorTokens(subset),
            ],
          };
        },
      },
      {
        id: 'shapePos',
        build: () => {
          const subset = pickShapeSubset(2, Math.max(2, Math.min(3, level)));
          return {
            fn: (p) => subset.includes(p.shape),
            desc: `shape in ${subset.join(', ')}`,
            tokens: [{ type: 'keyword', value: 'SHAPE ' }, ...toShapeTokens(subset)],
          };
        },
      },
      {
        id: 'shapeNeg',
        build: () => {
          const subset = pickShapeSubset(1, 2);
          return {
            fn: (p) => !subset.includes(p.shape),
            desc: `shape NOT in ${subset.join(', ')}`,
            tokens: [
              { type: 'keyword', value: 'SHAPE ' },
              { type: 'keyword', value: 'NOT ' },
              ...toShapeTokens(subset),
            ],
          };
        },
      },
      {
        id: 'number',
        build: () => buildNumberClause(),
      },
    ];

    const available = shuffleArray(pools, rng);
    const chosen = [];
    const usedProps = new Set();

    for (const entry of available) {
      if (chosen.length >= clauseCount) break;
      if (entry.id.startsWith('color') && usedProps.has('color')) continue;
      if (entry.id.startsWith('shape') && usedProps.has('shape')) continue;
      const clause = entry.build();
      chosen.push(clause);
      if (entry.id.startsWith('color')) usedProps.add('color');
      if (entry.id.startsWith('shape')) usedProps.add('shape');
    }

    const fn = (p) => chosen.every((c) => c.fn(p));
    const desc = chosen.map((c) => c.desc).join(' AND ');
    const tokens = chosen.flatMap((c, idx) => [
      ...(c.tokens ? c.tokens : [{ type: 'text', value: c.desc }]),
      ...(idx < chosen.length - 1 ? [{ type: 'keyword', value: ' AND ' }] : []),
    ]);
    return { fn, desc, tokens };
  };

  const buildConditionalRule = () => {
    const triggerColors = pickColorSubset();
    const numClause = buildNumberClause();
    const elseShapes = pickShapeSubset();
    const fn = (p) => (triggerColors.includes(p.color) ? numClause.fn(p) : elseShapes.includes(p.shape));
    const desc = `IF color in ${triggerColors.join(', ')} THEN ${numClause.desc} ELSE shape in ${elseShapes.join(
      ', ',
    )}`;
    const tokens = [
      { type: 'keyword', value: ' IF ' },
      ...toColorTokens(triggerColors),
      { type: 'keyword', value: ' THEN ' },
      ...(numClause.tokens ? numClause.tokens : [{ type: 'text', value: numClause.desc }]),
      { type: 'keyword', value: ' ELSE ' },
      ...toShapeTokens(elseShapes),
    ];
    return { fn, desc, tokens };
  };

  for (let i = 0; i < binCount; i++) {
    bins.push({ id: i, label: `Port ${i + 1}` });
    const useConditional = difficulty >= 5 && rng() < 0.25;
    const rule = useConditional ? buildConditionalRule() : buildCompositeRule(difficulty);
    rules.push(rule.fn);
    ruleDescriptions.push(rule.desc);
    ruleTokens.push(rule.tokens || [{ type: 'text', value: rule.desc }]);
  }

  return { bins, rules, ruleDescriptions, ruleTokens };
}

// ============================================================================
// PACKET GENERATION
// ============================================================================
function generatePackets(count, rules, bins, seed) {
  const rng = seededRandom(seed + 1000);
  const packets = [];

  // Precompute only packet combos that satisfy at least one rule.
  const validCombos = [];
  const combosByBin = bins.map(() => []);
  for (const combo of ALL_COMBOS) {
    const eligibleBins = rules.map((rule, idx) => (rule(combo) ? idx : -1)).filter((idx) => idx >= 0);
    if (eligibleBins.length > 0) {
      const entry = { color: combo.color, shape: combo.shape, number: combo.number, eligible: eligibleBins };
      validCombos.push(entry);
      eligibleBins.forEach((binId) => combosByBin[binId].push(entry));
    }
  }

  if (validCombos.length > 0) {
    const usedCombos = new Set();
    const binOrder = combosByBin
      .map((list, idx) => ({ idx, options: list.length }))
      .sort((a, b) => a.options - b.options);

    for (const { idx } of binOrder) {
      if (packets.length >= count) break;
      const options = combosByBin[idx];
      if (!options.length) continue;
      const singletons = options.filter((combo) => combo.eligible.length === 1);
      const pickFrom = singletons.length ? singletons : options;
      const unused = pickFrom.filter((combo) => !usedCombos.has(combo));
      const pool = unused.length ? unused : pickFrom;
      const pick = pool[Math.floor(rng() * pool.length)];
      usedCombos.add(pick);
      packets.push({
        id: `packet-${packets.length}`,
        color: pick.color,
        shape: pick.shape,
        number: pick.number,
        eligible: [...pick.eligible],
      });
    }

    for (let i = packets.length; i < count; i++) {
      const pick = validCombos[Math.floor(rng() * validCombos.length)];
      packets.push({
        id: `packet-${i}`,
        color: pick.color,
        shape: pick.shape,
        number: pick.number,
        eligible: [...pick.eligible],
      });
    }
  } else {
    // Fallback: should never happen unless rules are impossible.
    for (let i = 0; i < count; i++) {
      const packet = {
        id: `packet-${i}`,
        color: COLORS[Math.floor(rng() * COLORS.length)],
        shape: SHAPES[Math.floor(rng() * SHAPES.length)],
        number: NUMBERS[Math.floor(rng() * NUMBERS.length)],
      };
      const eligibleBins = rules.map((rule, idx) => (rule(packet) ? idx : -1)).filter((idx) => idx >= 0);
      packet.eligible = eligibleBins.length > 0 ? eligibleBins : [0];
      packets.push(packet);
    }
  }

  const shuffled = shuffleArray(packets, rng);
  const balanced = balanceAssignments(shuffled, bins);
  balanced.forEach(({ packet, binId }) => {
    packet.correctBin = binId;
  });

  return shuffled;
}

// ============================================================================
// UTILITIES
// ============================================================================
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = Math.sin(s) * 10000;
    return s - Math.floor(s);
  };
}

function shuffleArray(array, rng) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function getAttemptLimit(difficulty) {
  if (difficulty <= 1) return 6;
  if (difficulty === 2) return 5;
  if (difficulty === 3) return 4;
  if (difficulty === 4) return 4;
  return 3;
}

function balanceAssignments(packets, bins) {
  const desiredBase = Math.max(1, Math.floor(packets.length / bins.length));
  const remainder = packets.length - desiredBase * bins.length;
  const desiredCounts = bins.map((_, idx) => desiredBase + (idx < remainder ? 1 : 0));
  const counts = bins.map(() => 0);

  const remaining = [...packets];
  const result = [];

  const binsByOptions = bins
    .map((_, idx) => ({
      idx,
      options: remaining.filter((packet) => packet.eligible.includes(idx)).length,
    }))
    .sort((a, b) => a.options - b.options);

  for (const { idx } of binsByOptions) {
    if (!remaining.length) break;
    if (counts[idx] >= desiredCounts[idx]) continue;
    let bestIndex = -1;
    let bestFlex = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const packet = remaining[i];
      if (!packet.eligible.includes(idx)) continue;
      const flex = packet.eligible.length;
      if (flex < bestFlex) {
        bestFlex = flex;
        bestIndex = i;
        if (flex === 1) break;
      }
    }
    if (bestIndex === -1) continue;
    const [packet] = remaining.splice(bestIndex, 1);
    counts[idx] += 1;
    result.push({ packet, binId: idx });
  }

  const byFlex = remaining.sort((a, b) => a.eligible.length - b.eligible.length);
  for (const packet of byFlex) {
    const elig = packet.eligible && packet.eligible.length ? packet.eligible : [bins.length - 1];
    const candidates = elig.filter((b) => counts[b] < desiredCounts[b]);
    const pickFrom = candidates.length > 0 ? candidates : elig;
    let chosen = pickFrom[0];
    let bestCount = counts[chosen];
    for (const b of pickFrom) {
      if (counts[b] < bestCount) {
        chosen = b;
        bestCount = counts[b];
      }
    }
    counts[chosen] += 1;
    result.push({ packet, binId: chosen });
  }

  // If any bin ended with 0 and is reachable, try to rebalance from bins with surplus
  for (let i = 0; i < bins.length; i++) {
    if (counts[i] > 0) continue;
    const donorIndex = result.findIndex(
      ({ packet, binId }) => binId !== i && counts[binId] > 1 && packet.eligible.includes(i),
    );
    if (donorIndex !== -1) {
      const donor = result[donorIndex];
      counts[donor.binId] -= 1;
      counts[i] += 1;
      donor.binId = i;
    }
  }

  return result;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function SignalShuntPuzzle({ sessionId, layerId, layerData, onLocalPuzzleComplete }) {
  const difficulty = layerData?.difficulty || 5;
  const baseSeedRef = useRef(layerData?.seed ?? (sessionId ? hashCode(sessionId + layerId) : Date.now()));
  const { setScriptContext } = useScriptContext();
  const { markSolved } = usePuzzleCompletion({ sessionId, layerId, onLocalPuzzleComplete });
  const [runSeed, setRunSeed] = useState(baseSeedRef.current);

  const packetCount = (() => {
    switch (difficulty) {
      case 1:
        return 12;
      case 2:
        return 14;
      case 3:
        return 16;
      case 4:
        return 18;
      default:
        return 22;
    }
  })();

  const { bins, rules, ruleTokens } = useMemo(() => generateRules(difficulty, runSeed), [difficulty, runSeed]);

  const packets = useMemo(
    () => generatePackets(packetCount, rules, bins, runSeed),
    [packetCount, rules, bins, runSeed],
  );

  const requiredCounts = useMemo(() => {
    const counts = {};
    bins.forEach((b) => {
      counts[b.id] = 0;
    });
    packets.forEach((p) => {
      counts[p.correctBin] = (counts[p.correctBin] ?? 0) + 1;
    });
    return counts;
  }, [bins, packets]);

  const [assignments, setAssignments] = useState({});
  const [selectedPacket, setSelectedPacket] = useState(null);
  const [solved, setSolved] = useState(false);
  const [binFeedback, setBinFeedback] = useState({}); // { binId: { correct, total, required } }
  const [attemptsLeft, setAttemptsLeft] = useState(getAttemptLimit(difficulty));
  const [statusMessage, setStatusMessage] = useState('');

  // reset when seed changes
  useEffect(() => {
    setAssignments({});
    setSelectedPacket(null);
    setSolved(false);
    setBinFeedback({});
    setAttemptsLeft(getAttemptLimit(difficulty));
    setStatusMessage('');
  }, [difficulty, runSeed]);

  // solved sync
  useEffect(() => {
    if (!solved) return;
    void markSolved();
  }, [solved, markSolved]);

  const currentBinCount = useCallback((map, binId) => {
    return Object.values(map).filter((v) => v === binId).length;
  }, []);

  const handleAssign = useCallback(
    (packetId, binId) => {
      const packet = packets.find((p) => p.id === packetId);
      if (!packet) return;
      const prevBin = assignments[packetId];
      const next = { ...assignments };
      if (prevBin != null) delete next[packetId];
      next[packetId] = binId;
      setAssignments(next);
      setSelectedPacket(null);
    },
    [assignments, packets],
  );

  const handleUnassign = useCallback(
    (packetId) => {
      const next = { ...assignments };
      delete next[packetId];
      setAssignments(next);
      setSelectedPacket(null);
    },
    [assignments],
  );

  const onDragStart = (id) => (e) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = (binId) => (e) => {
    e.preventDefault();
    const packetId = e.dataTransfer.getData('text/plain');
    handleAssign(packetId, binId);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const unassignedPackets = packets.filter((p) => assignments[p.id] == null);
  const assignedByBin = useMemo(() => {
    const map = {};
    bins.forEach((b) => {
      map[b.id] = [];
    });
    Object.entries(assignments).forEach(([pid, binId]) => {
      const packet = packets.find((p) => p.id === pid);
      if (packet) map[binId].push(packet);
    });
    return map;
  }, [assignments, bins, packets]);

  const handleReset = () => {
    setAssignments({});
    setSelectedPacket(null);
    setSolved(false);
    setBinFeedback({});
    setAttemptsLeft(getAttemptLimit(difficulty));
    setStatusMessage('');
  };

  const handleSubmit = () => {
    const allAssigned = Object.keys(assignments).length === packets.length;
    if (!allAssigned) {
      setStatusMessage('Assign all packets before submitting.');
      return;
    }

    const binResults = {};
    let allCorrect = true;
    bins.forEach((bin, idx) => {
      const assigned = assignedByBin[bin.id] || [];
      const correctAssigned = assigned.filter((p) => rules[idx](p)).length;
      const required = requiredCounts[bin.id];
      binResults[bin.id] = { correct: correctAssigned, total: assigned.length, required };
      if (correctAssigned !== required || assigned.length !== required) {
        allCorrect = false;
      }
    });

    setBinFeedback(binResults);

    if (allCorrect) {
      setSolved(true);
      setStatusMessage('Routing accepted. All ports correct.');
      return;
    }

    const nextAttempts = attemptsLeft - 1;
    setAttemptsLeft(nextAttempts);
    setStatusMessage(
      nextAttempts > 0 ? `Incorrect. Attempts remaining: ${nextAttempts}` : 'Attempts depleted. Resetting...',
    );
    if (nextAttempts <= 0) {
      setTimeout(() => setRunSeed(Date.now()), 400);
    }
  };

  // script hooks (minimal)
  const scriptApi = useMemo(
    () => ({
      autoPlace: () => {
        const unassigned = packets.filter((p) => assignments[p.id] == null);
        const candidate = unassigned.find((p) => p.eligible.length === 1);
        if (!candidate) return { ok: false, reason: 'no_singleton' };
        const binId = candidate.eligible[0];
        handleAssign(candidate.id, binId);
        return { ok: true };
      },
      getState: () => ({
        remaining: packets.length - Object.keys(assignments).length,
        bins: bins.map((b) => ({
          id: b.id,
          assigned: currentBinCount(assignments, b.id),
          required: requiredCounts[b.id],
        })),
      }),
    }),
    [packets, assignments, bins, requiredCounts, handleAssign, currentBinCount],
  );

  useEffect(() => {
    setScriptContext({ id: 'datastream', api: scriptApi });
    return () => setScriptContext({ id: null, api: {} });
  }, [setScriptContext, scriptApi]);

  return (
    <div className="puzzle-frame puzzle-signal datastream-puzzle">
      <h2 className="puzzle-title">[ Signal Rerouter ]</h2>
      <header className="datastream-header puzzle-header">
        <div className="datastream-stats">
          <div className="stat">
            <span className="stat-label">PACKETS</span>
            <span className="stat-value">
              {packets.length - Object.keys(assignments).length}/{packets.length} remaining
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">PORTS</span>
            <span className="stat-value">{bins.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">ATTEMPTS</span>
            <span className="stat-value">{attemptsLeft}</span>
          </div>
        </div>
      </header>

      <div className="datastream-progress">
        <div
          className="datastream-progress-fill"
          style={{ width: `${(Object.keys(assignments).length / packets.length) * 100}%` }}
        />
      </div>

      <div className="datastream-board">
        <div className="datastream-panel puzzle-panel">
          <div className="panel-title">Packet Pool</div>
          <div className="packet-grid">
            {unassignedPackets.map((p) => (
              <PacketCard
                key={p.id}
                packet={p}
                selected={selectedPacket === p.id}
                onClick={() => setSelectedPacket(selectedPacket === p.id ? null : p.id)}
                draggable
                onDragStart={onDragStart(p.id)}
              />
            ))}
            {unassignedPackets.length === 0 && <div className="empty-state">All packets routed</div>}
          </div>
        </div>
      </div>

      <div className="datastream-bin-grid">
        {bins.map((bin, idx) => {
          const assigned = assignedByBin[bin.id] || [];
          const isSelectedDrop = selectedPacket != null && rules[bin.id](packets.find((p) => p.id === selectedPacket));
          return (
            <div
              key={bin.id}
              className={`bin-dropzone puzzle-panel ${isSelectedDrop ? 'bin-ready' : ''}`}
              onClick={() => selectedPacket && handleAssign(selectedPacket, bin.id)}
              onDragOver={onDragOver}
              onDrop={onDrop(bin.id)}
            >
              <div className="bin-header">
                <div className="bin-title">Lane {idx + 1}</div>
                <div className="bin-sub">Lane filter</div>
                <div className="bin-cap">Needs {requiredCounts[bin.id]}</div>
              </div>
              <div className="bin-rule">
                <RuleTokens tokens={ruleTokens[idx]} />
              </div>
              {binFeedback[bin.id] && (
                <div className="bin-feedback">
                  Correct: {binFeedback[bin.id].correct}/{binFeedback[bin.id].required} (placed{' '}
                  {binFeedback[bin.id].total})
                </div>
              )}
              <div className="bin-body">
                {assigned.map((p) => (
                  <PacketCard
                    key={p.id}
                    packet={p}
                    compact
                    onDoubleClick={() => handleUnassign(p.id)}
                    draggable
                    onDragStart={onDragStart(p.id)}
                  />
                ))}
                {assigned.length === 0 && <div className="bin-empty">Drop packets here</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="datastream-actions">
        <button className="datastream-submit puzzle-button" onClick={handleSubmit} disabled={solved}>
          Submit Routing
        </button>
        <button className="datastream-reset puzzle-button" onClick={handleReset} disabled={solved}>
          RESET
        </button>
        {solved && <div className="solved-text">Bus stabilized. ICE rerouted.</div>}
        {statusMessage && !solved && <div className="status-text">{statusMessage}</div>}
      </div>
    </div>
  );
}

// ============================================================================
// UI Helpers
// ============================================================================
function PacketCard({ packet, selected, compact, onClick, onDoubleClick, draggable, onDragStart }) {
  const maskUrl = SHAPE_MASKS[packet.shape] || SHAPE_MASKS.triangle;
  return (
    <div
      className={`packet-chip ${selected ? 'selected' : ''} ${compact ? 'compact' : ''}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <span
        className="chip-shape-svg"
        style={{
          '--packet-color': packet.color,
          WebkitMaskImage: `url(${maskUrl})`,
          maskImage: `url(${maskUrl})`,
        }}
        aria-label={packet.shape}
      />
      <span className="chip-number">{packet.number}</span>
    </div>
  );
}

function RuleTokens({ tokens }) {
  if (!tokens) return null;
  return (
    <>
      {tokens.map((t, idx) => {
        if (t.type === 'color') {
          return <span key={idx} className="rule-color-dot" style={{ '--packet-color': t.value }} />;
        }
        if (t.type === 'shape') {
          const maskUrl = SHAPE_MASKS[t.value] || SHAPE_MASKS.triangle;
          return (
            <span
              key={idx}
              className="rule-shape-icon"
              style={{ WebkitMaskImage: `url(${maskUrl})`, maskImage: `url(${maskUrl})` }}
            />
          );
        }
        if (t.type === 'keyword') {
          return (
            <span key={idx} className="rule-keyword">
              {t.value}
            </span>
          );
        }
        return <span key={idx}>{t.value}</span>;
      })}
    </>
  );
}
