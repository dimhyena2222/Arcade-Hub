// ============================================================
//  INPUT MANAGER
//  Tracks keyboard and mouse state. Zero input delay.
// ============================================================
const Input = (() => {
  const keys     = {};       // currently held keys
  const justDown = {};       // pressed this frame
  const justUp   = {};       // released this frame
  const mouse    = { x: 0, y: 0, left: false, right: false,
                     leftJust: false, rightJust: false };

  // --- Keyboard ---
  window.addEventListener('keydown', e => {
    if (!keys[e.code]) justDown[e.code] = true;
    keys[e.code] = true;
    // prevent arrow keys / space scrolling page
    if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))
      e.preventDefault();
  });

  window.addEventListener('keyup', e => {
    keys[e.code]  = false;
    justUp[e.code] = true;
  });

  // --- Mouse ---
  const canvas = () => document.getElementById('gameCanvas');

  window.addEventListener('mousemove', e => {
    const c = canvas(); if (!c) return;
    const r = c.getBoundingClientRect();
    const scaleX = 800 / r.width;
    const scaleY = 600 / r.height;
    mouse.x = (e.clientX - r.left) * scaleX;
    mouse.y = (e.clientY - r.top)  * scaleY;
  });

  window.addEventListener('mousedown', e => {
    if (e.button === 0) { mouse.left  = true; mouse.leftJust  = true; }
    if (e.button === 2) { mouse.right = true; mouse.rightJust = true; }
    e.preventDefault();
  });

  window.addEventListener('mouseup', e => {
    if (e.button === 0) mouse.left  = false;
    if (e.button === 2) mouse.right = false;
  });

  window.addEventListener('contextmenu', e => e.preventDefault());

  // --- Public API ---
  return {
    // Raw state
    held(code)   { return !!keys[code]; },
    pressed(code){ const v = !!justDown[code]; return v; },
    released(code){ return !!justUp[code]; },

    // Helpers
    moveLeft()   { return keys['KeyA'] || keys['ArrowLeft']; },
    moveRight()  { return keys['KeyD'] || keys['ArrowRight']; },
    jump()       { return keys['KeyW'] || keys['ArrowUp']; },
    jumpJust()   { return justDown['KeyW'] || justDown['ArrowUp'] || justDown['Space']; },
    crouch()     { return keys['KeyS'] || keys['ArrowDown']; },
    cannon()     { return keys['KeyJ'] || mouse.left; },
    cannonJust() { return justDown['KeyJ'] || mouse.leftJust; },
    sword()      { return keys['KeyK'] || mouse.right; },
    swordJust()  { return justDown['KeyK'] || mouse.rightJust; },
    pause()      { return justDown['Escape']; },
    enter()      { return justDown['Enter'] || justDown['Space']; },
    dash()       { return justDown['ShiftLeft'] || justDown['ShiftRight']; },

    mouse,

    // Called at END of each frame to clear single-frame flags
    flush() {
      for (const k in justDown) delete justDown[k];
      for (const k in justUp)   delete justUp[k];
      mouse.leftJust  = false;
      mouse.rightJust = false;
    }
  };
})();
