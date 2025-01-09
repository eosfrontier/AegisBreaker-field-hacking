import { useState, useEffect } from 'react';
import { db } from '../../firebaseConfig';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

const ITEMS = ['A', 'B', 'C', 'D'];
  // We'll store the item set outside the component to avoid re-creations

const puzzleDoc = doc(db, 'puzzles', 'sequencePuzzle'); 
// ^ This references the Firestore document for your puzzle.

function SequencePuzzle() {
  const [sequence, setSequence] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState('IN_PROGRESS');


  useEffect(() => {
    // Shuffle once on mount
    const shuffled = [...ITEMS].sort(() => Math.random() - 0.5);
    setSequence(shuffled);

    // 1) Listen to Firestore changes for this puzzle
    const unsubscribe = onSnapshot(puzzleDoc, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        // We can sync the puzzle status with Firestore if we want
        console.log("Data from Firestore:", data);
        // For instance, if we want to respect remote updates:
        if (data.status && data.status !== status) {
          setStatus(data.status);
        }
      }
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only once on mount

  // 2) A helper function to write status to Firestore
  async function updatePuzzleStatus(newStatus) {
    setStatus(newStatus);
    await setDoc(puzzleDoc, {
      status: newStatus,
      lastUpdated: Date.now()
    }, { merge: true });
  }

  const handleClick = async (letter) => {
    // If puzzle is already solved or failed, ignore clicks
    if (status !== 'IN_PROGRESS') return;

    // Check if the clicked letter matches the current needed letter
    if (letter === sequence[currentIndex]) {
      // Correct
      if (currentIndex === sequence.length - 1) {
        // That was the last letter
        await updatePuzzleStatus('SOLVED');
      } else {
        setCurrentIndex(currentIndex + 1);
      }
    } else {
      // Wrong
      await updatePuzzleStatus('FAILED');
    }
  };

  return (
    <div style={{ textAlign: 'center', margin: '2rem' }}>
      <h2>Sequence Puzzle</h2>

      {status === 'IN_PROGRESS' && (
        <p>
          Please click the letters in this order: 
          <strong> {sequence.join(' - ')} </strong>
        </p>
      )}
      {status === 'SOLVED' && (
        <p style={{ color: 'limegreen', fontWeight: 'bold' }}>
          Puzzle solved!
        </p>
      )}
      {status === 'FAILED' && (
        <p style={{ color: 'red', fontWeight: 'bold' }}>
          Wrong sequence! Try again or reset.
        </p>
      )}

      <div style={{ marginTop: '1rem' }}>
        {ITEMS.map((letter) => (
          <button
            key={letter}
            onClick={() => handleClick(letter)}
            style={{
              margin: '0.5rem',
              padding: '1rem 2rem',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            {letter}
          </button>
        ))}
      </div>

      {(status === 'FAILED' || status === 'SOLVED') && (
        <div style={{ marginTop: '1rem' }}>
          <button
            onClick={async () => {
              // Reset puzzle
              const shuffled = [...ITEMS].sort(() => Math.random() - 0.5);
              setSequence(shuffled);
              setCurrentIndex(0);
              await updatePuzzleStatus('IN_PROGRESS');
            }}
          >
            Reset Puzzle
          </button>
        </div>
      )}
    </div>
  );
}

export default SequencePuzzle;
