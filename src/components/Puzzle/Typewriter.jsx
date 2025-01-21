// TypingEffect.js
import { useState, useEffect } from 'react';

function TypingEffect({ text, typingSpeed = 50 }) {
    const [displayedText, setDisplayedText] = useState('');
  
    useEffect(() => {
      let currentIndex = 0;
      const interval = setInterval(() => {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
        if (currentIndex >= text.length) {
          clearInterval(interval);
        }
      }, typingSpeed);
      return () => clearInterval(interval);
    }, [text, typingSpeed]);
  
    return (
        <pre style={{ whiteSpace: 'pre-wrap', lineHeight: '2.5' }}>
          {displayedText}
        </pre>
      );      
  }
  

export default TypingEffect;
