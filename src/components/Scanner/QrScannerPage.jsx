// QrScannerPage.jsx
import { useCallback } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';

function QrScannerPage() {
  // Called whenever the scanner detects one or more barcodes
  const handleScan = useCallback((detectedCodes) => {
    // detectedCodes is an array of objects: IDetectedBarcode[]
    // Each object has .rawValue, .format, cornerPoints, etc.
    if (!detectedCodes || detectedCodes.length === 0) return;

    // You might map over detectedCodes for all scanned results:
    const allValues = detectedCodes.map((code) => code.rawValue);
    console.log('Scanned codes:', allValues);

    // TODO: handle the scanned data
  }, []);

  // Called if there's an error while mounting or accessing the camera
  const handleError = useCallback((error) => {
    console.error('Scanner error:', error);
  }, []);

  return (
    <div style={{ padding: '1rem' }}>
      <h2>QR Scanner</h2>
      <p>Point your camera at a code to scan.</p>

      <Scanner
        onScan={handleScan}
        onError={handleError}
        // Example constraints: use the rear camera if available
        constraints={{ facingMode: 'environment' }}
        // Delay between scans in ms
        scanDelay={300}
        // Additional props you might want:
        // formats={['qr_code', 'ean_13']}  // Limit detection to certain formats
        // paused={false}                  // Pause scanning if needed
        // allowMultiple={false}           // If you want repeated codes quickly
      />
    </div>
  );
}

export default QrScannerPage;
