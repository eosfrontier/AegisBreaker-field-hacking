import { useState, useEffect, useRef } from 'react';
import { useScriptContext } from '../scripts/ScriptProvider';
import './styles/ByteStream.css';

const ByteStreamPuzzle = ({ layerData, onLocalPuzzleComplete }) => {
  const difficulty = layerData?.difficulty || 5;

  // Calculate puzzle parameters based on difficulty
  const getParams = (diff) => {
    const length = Math.min(3 + Math.floor(diff / 2), 8);
    const speed = Math.max(3000 - diff * 200, 1000);
    const maxRounds = diff > 6 ? 4 : 3;
    const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff'];
    const availableColors = colors.slice(0, Math.min(3 + Math.floor(diff / 3), 5));

    return { length, speed, maxRounds, colors: availableColors };
  };

  const params = getParams(difficulty);

  const [round, setRound] = useState(1);
  const [currentSequence, setCurrentSequence] = useState([]);
  const [playerInput, setPlayerInput] = useState([]);
  const [phase, setPhase] = useState('viewing'); // 'viewing', 'input', 'feedback', 'complete'
  const [feedback, setFeedback] = useState('');
  const [streamPosition, setStreamPosition] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef(null);
  const streamSpeedRef = useRef(params.speed);

  // Generate a random sequence
  const generateSequence = () => {
    const sequence = [];
    for (let i = 0; i < params.length; i++) {
      sequence.push(params.colors[Math.floor(Math.random() * params.colors.length)]);
    }
    return sequence;
  };

  // Script hooks
  const scriptApi = {
    slowStream: () => {
      streamSpeedRef.current = streamSpeedRef.current * 1.5;
      return { success: true, message: 'Data stream slowed' };
    },
    highlightTarget: () => {
      if (phase === 'input') {
        setFeedback('Sequence: ' + currentSequence.map(() => `●`).join(' '));
        setTimeout(() => setFeedback(''), 2000);
        return { success: true, message: 'Target sequence highlighted' };
      }
      return { success: false, message: 'Can only highlight during input phase' };
    },
    skipRound: () => {
      if (phase === 'input') {
        handleRoundComplete(true);
        return { success: true, message: 'Round skipped' };
      }
      return { success: false, message: 'Can only skip during input phase' };
    },
  };

  useScriptContext('bytestream', scriptApi);

  // Initialize first round
  useEffect(() => {
    startRound();
  }, []);

  const startRound = () => {
    const sequence = generateSequence();
    setCurrentSequence(sequence);
    setPlayerInput([]);
    setPhase('viewing');
    setFeedback('');
    setStreamPosition(0);
    streamSpeedRef.current = params.speed;

    // Start animation
    setTimeout(() => {
      setIsAnimating(true);
      animateStream();
    }, 500);
  };

  const animateStream = () => {
    const startTime = Date.now();
    const duration = streamSpeedRef.current;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      setStreamPosition(progress * 100);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        setTimeout(() => {
          setPhase('input');
        }, 500);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const handleByteClick = (color) => {
    if (phase !== 'input') return;

    const newInput = [...playerInput, color];
    setPlayerInput(newInput);

    // Check if sequence is complete
    if (newInput.length === currentSequence.length) {
      setTimeout(() => checkMatch(newInput), 300);
    }
  };

  const checkMatch = (input) => {
    const isCorrect = input.every((color, idx) => color === currentSequence[idx]);

    if (isCorrect) {
      setPhase('feedback');
      setFeedback('✓ Sequence decoded!');
      setTimeout(() => handleRoundComplete(true), 1000);
    } else {
      setPhase('feedback');
      setFeedback('✗ Incorrect sequence');
      setTimeout(() => {
        setPlayerInput([]);
        setPhase('input');
        setFeedback('');
      }, 1500);
    }
  };

  const handleRoundComplete = (success) => {
    if (!success) return;

    if (round >= params.maxRounds) {
      setPhase('complete');
      setFeedback('🎯 All data streams decoded!');
      if (onLocalPuzzleComplete) {
        setTimeout(() => onLocalPuzzleComplete(), 1500);
      }
    } else {
      setRound(round + 1);
      setTimeout(() => startRound(), 1000);
    }
  };

  const getColorName = (color) => {
    const names = {
      '#ff4444': 'RED',
      '#44ff44': 'GREEN',
      '#4444ff': 'BLUE',
      '#ffff44': 'YELLOW',
      '#ff44ff': 'MAGENTA',
    };
    return names[color] || color;
  };

  return (
    <div className="puzzle-shell puzzle-bytestream puzzle-container byte-shell">
      <h2 className="puzzle-title">[ Bytestream Intercept ]</h2>
      <div className="byte-header">
        <div className="byte-round">
          Round {round} / {params.maxRounds}
        </div>
      </div>

      <div className="byte-viewport puzzle-panel">
        <div className="byte-instructions">
          {phase === 'viewing' && 'Memorizing data stream...'}
          {phase === 'input' && 'Reproduce the sequence:'}
          {phase === 'feedback' && feedback}
          {phase === 'complete' && feedback}
        </div>

        {phase === 'viewing' && (
          <div className="byte-stream-container">
            <div
              className="byte-stream"
              style={{
                transform: `translateY(${streamPosition}%)`,
                opacity: isAnimating ? 1 : Math.max(0, 1 - (streamPosition / 100) * 2),
              }}
            >
              {currentSequence.map((color, idx) => (
                <div key={idx} className="byte-block" style={{ '--byte-color': color }} />
              ))}
            </div>
          </div>
        )}

        {phase === 'input' && (
          <div className="byte-input-display">
            {playerInput.map((color, idx) => (
              <div key={idx} className="byte-input-block" style={{ '--byte-color': color }} />
            ))}
            {[...Array(currentSequence.length - playerInput.length)].map((_, idx) => (
              <div key={`empty-${idx}`} className="byte-empty" />
            ))}
          </div>
        )}
      </div>

      {phase === 'input' && (
        <div className="byte-button-grid">
          {params.colors.map((color) => (
            <button
              key={color}
              className="byte-color-button"
              style={{ '--byte-color': color }}
              onClick={() => handleByteClick(color)}
            >
              <span className="byte-color-label">{getColorName(color)}</span>
            </button>
          ))}
        </div>
      )}

      {phase === 'input' && playerInput.length > 0 && (
        <button className="puzzle-button byte-clear-button" onClick={() => setPlayerInput([])}>
          Clear Input
        </button>
      )}
    </div>
  );
};

export default ByteStreamPuzzle;
