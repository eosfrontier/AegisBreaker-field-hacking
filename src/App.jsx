import './App.css'
import SequencePuzzle from './SequencePuzzle';

function App() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh', 
      backgroundColor: '#0b0c10', 
      color: '#66fcf1', 
      fontFamily: 'sans-serif',
    }}>
      <h1>Alien System Hack</h1>
      <p>Stand by, initializing hacking interface...</p>

      <SequencePuzzle />
    </div>
  );
}

export default App;
