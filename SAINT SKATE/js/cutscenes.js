/* ═══════════════════════════════════════════════
   SAINT SKATE — Cutscene & Dialogue System
═══════════════════════════════════════════════ */

const Cutscenes = (() => {

  let overlay, lineEl;
  let sequence   = [];
  let seqIdx     = 0;
  let onDoneCb   = null;
  let lineTimer  = 0;
  let autoAdvance = false;
  let isActive   = false;

  function init() {
    overlay = document.getElementById('cutscene-overlay');
    lineEl  = document.getElementById('cutscene-line');

    document.addEventListener('keydown', e => {
      if (e.code === 'Space' && isActive) { e.preventDefault(); advance(); }
    });
  }

  // ─── Play a sequence of lines ──────────────────
  // sequence = [ { text, duration, camPos, camLook }, ... ]
  function play(seq, onDone, auto) {
    sequence   = seq;
    seqIdx     = 0;
    onDoneCb   = onDone;
    autoAdvance = auto || false;
    isActive   = true;
    GameState.setPhase('cutscene');
    overlay.classList.remove('hidden');
    showLine(seqIdx);
  }

  function showLine(idx) {
    const line = sequence[idx];
    if (!line) { end(); return; }

    lineEl.textContent = line.text;
    lineTimer = line.duration || 0; // 0 = wait for space

    // Optional camera placement
    if (line.camPos && line.camLook) {
      CameraController.startCutscene(line.camPos, line.camLook);
    }
    // Auto type-in effect
    typeIn(line.text);
  }

  function typeIn(text) {
    lineEl.textContent = '';
    let i = 0;
    const iv = setInterval(() => {
      lineEl.textContent += text[i] || '';
      i++;
      if (i >= text.length) clearInterval(iv);
    }, 30);
    lineEl._typeIv = iv;
  }

  function advance() {
    if (!isActive) return;
    clearInterval(lineEl._typeIv);
    lineEl.textContent = sequence[seqIdx]?.text || '';
    seqIdx++;
    if (seqIdx >= sequence.length) { end(); return; }
    showLine(seqIdx);
  }

  function end() {
    overlay.classList.add('hidden');
    isActive = false;
    CameraController.endCutscene();
    GameState.setPhase('playing');
    if (onDoneCb) { const cb = onDoneCb; onDoneCb = null; cb(); }
  }

  // ─── Simple dialogue popup (NPC speech) ────────
  function showDialogue(lines) {
    play(lines.map(t => ({ text: t, duration: 0 })));
  }

  // ─── Pre-built cutscenes ───────────────────────

  function playOpening(onDone) {
    const seq = [
      {
        text: '"They say this place used to be legendary."',
        camPos: [-22, 8, -10], camLook: [-22, 0, -28],
        duration: 0
      },
      {
        text: 'You step off the bus. The skatepark is empty. Rails are cracked. Paint is peeling.',
        camPos: [-30, 4, -18], camLook: [-22, 0, -30],
        duration: 0
      },
      {
        text: 'Corporate security pushed everyone out two years ago.',
        camPos: [-25, 3, -40], camLook: [-25, 1, -25],
        duration: 0
      },
      {
        text: 'But you just moved here.\nAnd you didn\'t come to watch.',
        camPos: [-20, 2, -20], camLook: [-22, 1, -28],
        duration: 0
      },
      {
        text: 'This is your district now.',
        camPos: [-22, 5, 0], camLook: [-22, 0, -35],
        duration: 0
      },
    ];
    play(seq, onDone);
  }

  function playMission3Success(onDone) {
    const seq = [
      {
        text: 'The alley lights up.',
        camPos: [-25, 6, 10], camLook: [-25, 0, 30],
        duration: 0
      },
      {
        text: 'Three skaters appear at the far end. They watched the whole thing.',
        camPos: [-20, 3, 35], camLook: [-25, 1, 25],
        duration: 0
      },
      {
        text: '"Okay. You\'re one of us now."',
        camPos: [-22, 2, 28], camLook: [-25, 1, 35],
        duration: 0
      },
    ];
    play(seq, onDone);
  }

  function playFinalCutscene(onDone) {
    const seq = [
      {
        text: 'You reach the rooftop.\nThe city stretches out below.',
        camPos: [25, 18, 0], camLook: [25, 8, 30],
        duration: 0
      },
      {
        text: 'One by one, skaters fill the streets again.',
        camPos: [30, 14, 20], camLook: [25, 0, 25],
        duration: 0
      },
      {
        text: 'The skatepark — alive. The plaza — claimed. The alley — tagged.',
        camPos: [-10, 20, -10], camLook: [0, 0, 0],
        duration: 0
      },
      {
        text: '"Not all legends skate stadiums."',
        camPos: [25, 12, -10], camLook: [25, 5, 25],
        duration: 0
      },
      {
        text: '— CONCRETE REVIVAL COMPLETE —',
        camPos: [0, 25, 0], camLook: [0, 5, 0],
        duration: 0
      },
    ];
    play(seq, onDone);
  }

  function update(dt) {
    if (!isActive) return;
    if (autoAdvance && lineTimer > 0) {
      lineTimer -= dt;
      if (lineTimer <= 0) advance();
    }
  }

  return {
    init, play, advance, end, showDialogue, update,
    playOpening, playMission3Success, playFinalCutscene
  };
})();
