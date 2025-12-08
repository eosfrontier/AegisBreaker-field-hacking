import { useCallback } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useNavigate } from 'react-router-dom';

function QrScannerPage() {
  const navigate = useNavigate();

  const handleScan = useCallback((detectedCodes) => {
    if (!detectedCodes || detectedCodes.length === 0) return;

    const allValues = detectedCodes.map((code) => code.rawValue);
    const parsePath = (value) => {
      if (!value) return null;
      try {
        const url = new URL(value);
        if (url.origin === window.location.origin) return `${url.pathname}${url.search}`;
      } catch {
        // value is not an absolute URL
      }
      if (value.startsWith('/')) return value;
      if (value.startsWith('puzzle')) return `/${value}`;
      return null;
    };

    const path = allValues.map(parsePath).find(Boolean);
    if (path) {
      navigate(path);
      return;
    }

    console.log('Scanned codes:', allValues);
  }, [navigate]);

  const handleError = useCallback((error) => {
    console.error('Scanner error:', error);
  }, []);

  return (
    <div className="main">
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '0.5rem' }}>
        <button className="qh-btn secondary" onClick={() => navigate('/')} style={{ minWidth: '120px' }}>
          Back
        </button>
      </div>
      <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>QR Scanner</h2>
      <p style={{ textAlign: 'center' }}>Point your camera at a QR or barcode to scan.</p>

      <div style={{ margin: '0 auto', textAlign: 'center' }}>
        {/* The Scanner itself */}
        <Scanner
          onScan={handleScan}
          onError={handleError}
          constraints={{ facingMode: 'environment' }}
          scanDelay={300}
          style={{
            // For small screens, let's limit the width
            maxWidth: '300px',
            margin: '0 auto',
            // You can add borders or backgrounds if desired
          }}
        />
      </div>
    </div>
  );
}

export default QrScannerPage;
