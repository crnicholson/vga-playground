// Simple test to verify VGA simulator functionality
console.log('Testing VGA Simulator...');

// Test pattern generation
function testPatterns() {
  const simulator = {
    currentX: 0,
    currentY: 0,
    frameCount: 0,
    patternType: 'stripes',
    H_DISPLAY: 640,
    V_DISPLAY: 480,
  };

  // Test stripes pattern
  function getStripesPattern(x, y, frameCount) {
    const counter = Math.floor(frameCount / 2);
    const moving_x = (x + counter) & 0x3ff;

    const r = (moving_x >> 3) & 3;
    const g = (y >> 3) & 3;
    const b = ((moving_x >> 2) ^ (y >> 2)) & 3;

    return { r, g, b };
  }

  // Test a few pixels
  for (let frame = 0; frame < 3; frame++) {
    console.log(`Frame ${frame}:`);
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        const pixel = getStripesPattern(x * 100, y * 100, frame);
        console.log(`  Pixel (${x * 100},${y * 100}): R=${pixel.r} G=${pixel.g} B=${pixel.b}`);
      }
    }
  }
}

testPatterns();
