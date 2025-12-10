import '@testing-library/jest-dom';

// ---- DOM stubs ----
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
}

// Provide a basic canvas stub so libraries that touch getContext do not warn during tests.
const canvasStub = () => ({
  // minimal no-op context API used by common libs (Chart.js, QR code)
  fillRect: () => {},
  clearRect: () => {},
  getImageData: () => ({ data: [] }),
  putImageData: () => {},
  createImageData: () => [],
  setTransform: () => {},
  drawImage: () => {},
  save: () => {},
  restore: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  closePath: () => {},
  stroke: () => {},
  fill: () => {},
  rect: () => {},
  arc: () => {},
  fillText: () => {},
  measureText: () => ({ width: 0 }),
  translate: () => {},
  scale: () => {},
  rotate: () => {},
  transform: () => {},
  setLineDash: () => {},
  clear: () => {},
});

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: canvasStub,
  writable: true,
  configurable: true,
});
