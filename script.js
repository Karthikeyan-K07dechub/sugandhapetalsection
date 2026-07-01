gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({
  duration: 1.9,
  easing: (t) => 1 - Math.pow(1 - t, 3),
  smooth: true,
  direction: "vertical",
  touchMultiplier: 20.9,
});

lenis.on("scroll", ScrollTrigger.update);




gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

const grid = document.querySelector(".grid");
const section = document.querySelector(".jewellery-section");
const cards = Array.from(document.querySelectorAll(".grid .card"));
const infoSets = Array.from(document.querySelectorAll(".info-set"));
const prevButtons = Array.from(document.querySelectorAll(".jewel-control--prev"));
const nextButtons = Array.from(document.querySelectorAll(".jewel-control--next"));
const TOP_ZONE = 40;
const PAUSE_READY_ZONE = 3;
const STEP_DURATION = 2.1;
const HIGHLIGHT_HOLD = 0.95;
const LOOP_REPEAT_DELAY = 1.85;
const MANUAL_NAV_DURATION = 1.8;
const HOVER_SETTLE_DURATION = 1.05;
const RESUME_OFFSET = 0.04;

const cardAngles = [
  { selector: ".top", angle: 0 },
  { selector: ".left", angle: 90 },
  { selector: ".bottom", angle: 180 },
  { selector: ".right", angle: 270 },
];

const selectorToPiece = {
  ".top": "top",
  ".left": "left",
  ".bottom": "bottom",
  ".right": "right",
};

const pieceOrder = ["top", "left", "bottom", "right"];

const leafMap = Object.fromEntries(
  cardAngles.map(({ selector }) => [selector, document.querySelector(`${selector} .leaf`)])
);

const imageMap = Object.fromEntries(
  cardAngles.map(({ selector }) => [selector, document.querySelector(`${selector} .jewellery`)])
);

let activeLeafSelector = null;
let activeInfoPiece = null;

function normalizeAngle(deg) {
  return ((deg % 360) + 360) % 360;
}

function angleDistance(a, b) {
  const diff = Math.abs(normalizeAngle(a) - normalizeAngle(b));
  return Math.min(diff, 360 - diff);
}

function getActiveCardSelector(rotation) {
  const r = normalizeAngle(rotation);

  for (const { selector, angle } of cardAngles) {
    if (angleDistance(r, angle) <= TOP_ZONE) {
      return selector;
    }
  }

  return null;
}

function isPauseReady(rotation, selector) {
  const card = cardAngles.find((item) => item.selector === selector);
  if (!card) {
    return false;
  }

  return angleDistance(rotation, card.angle) <= PAUSE_READY_ZONE;
}

function isPointerInsideImage(selector, clientX, clientY) {
  const image = imageMap[selector];
  if (!image) {
    return false;
  }

  const rect = image.getBoundingClientRect();
  const insetX = rect.width * 0.28;
  const insetY = rect.height * 0.08;
  return (
    clientX >= rect.left + insetX &&
    clientX <= rect.right - insetX &&
    clientY >= rect.top + insetY &&
    clientY <= rect.bottom - insetY
  );
}

function updateLeafOverflow(rotation) {
  const active = getActiveCardSelector(rotation);

  if (activeLeafSelector === active) {
    return;
  }

  activeLeafSelector = active;

  cardAngles.forEach(({ selector }) => {
    const leafinner = leafMap[selector];
    if (leafinner) {
      leafinner.style.overflow = active === selector ? "visible" : "hidden";
    }
  });
}

function setActiveInfoPiece(piece) {
  if (activeInfoPiece === piece) {
    return;
  }

  activeInfoPiece = piece;

  infoSets.forEach((el) => {
    el.classList.toggle("is-active", !!piece && el.dataset.piece === piece);
  });
}

function getCurrentActivePiece(rotation) {
  const selector = getActiveCardSelector(rotation);
  return selector ? selectorToPiece[selector] : null;
}

function setupInfoAnimations(tl) {
  const FADE = 0.42;
  const SHOW_OFFSET = 0.08;
  const HIDE_LAG = 0.22;
  const topStart = 0;
  const leftStart = STEP_DURATION + HIGHLIGHT_HOLD;
  const bottomStart = leftStart + STEP_DURATION + HIGHLIGHT_HOLD;
  const rightStart = bottomStart + STEP_DURATION + HIGHLIGHT_HOLD;
  const resetStart = rightStart + STEP_DURATION + HIGHLIGHT_HOLD;

  gsap.set(".info-set", { opacity: 0, visibility: "hidden" });
  gsap.set(".info-box--left", { x: -32, opacity: 0 });
  gsap.set(".info-box--right", { x: 32, opacity: 0 });

  const showPiece = (piece, at) => {
    const set = `.info-set[data-piece="${piece}"]`;
    tl.to(
      set,
      { opacity: 1, visibility: "visible", duration: FADE, ease: "power2.out" },
      at
    );
    tl.to(
      `${set} .info-box--left`,
      { x: 0, opacity: 1, duration: FADE, ease: "power2.out" },
      at
    );
    tl.to(
      `${set} .info-box--right`,
      { x: 0, opacity: 1, duration: FADE, ease: "power2.out" },
      at
    );
  };

  const hidePiece = (piece, at) => {
    const set = `.info-set[data-piece="${piece}"]`;
    tl.to(
      `${set} .info-box--right`,
      { x: 24, opacity: 0, duration: FADE, ease: "power2.in" },
      at
    );
    tl.to(
      `${set} .info-box--left`,
      { x: -24, opacity: 0, duration: FADE, ease: "power2.in" },
      at
    );
    tl.to(
      set,
      { opacity: 0, visibility: "hidden", duration: FADE, ease: "power2.in" },
      at
    );
  };

  // Keep info timing aligned with the slower automatic loop.
  tl.call(() => setActiveInfoPiece("top"), null, topStart + SHOW_OFFSET);
  showPiece("top", topStart + SHOW_OFFSET);

  tl.call(() => setActiveInfoPiece("left"), null, leftStart + SHOW_OFFSET);
  showPiece("left", leftStart + SHOW_OFFSET);
  hidePiece("top", leftStart + HIDE_LAG);

  tl.call(() => setActiveInfoPiece("bottom"), null, bottomStart + SHOW_OFFSET);
  showPiece("bottom", bottomStart + SHOW_OFFSET);
  hidePiece("left", bottomStart + HIDE_LAG);

  tl.call(() => setActiveInfoPiece("right"), null, rightStart + SHOW_OFFSET);
  showPiece("right", rightStart + SHOW_OFFSET);
  hidePiece("bottom", rightStart + HIDE_LAG);

  // Fade out during the reset phase after the right-side highlight.
  hidePiece("right", resetStart + HIDE_LAG);
  tl.call(() => setActiveInfoPiece(null), null, resetStart + HIDE_LAG + 0.02);
}

function getMetrics() {
  const size = grid.offsetWidth;
  const vw = window.innerWidth;

  if (vw < 768) {
    return {
      gridScale: 1.2,
      gridY: "38vh",
      imgOffset: size * 0.12,
      imgScale: 1.35,
    };
  }

  if (vw < 1024) {
    return {
      gridScale: 1.45,
      gridY: "48vh",
      imgOffset: size * 0.14,
      imgScale: 1.7,
    };
  }

  return {
    gridScale: 1.6,
    gridY: "53vh",
    imgOffset: size * 0.155,
    imgScale: 2,
  };
}

function createJewelleryTimeline(config) {
  const { gridScale, gridY, imgOffset, imgScale } = config;
  let resetTween = null;
  let hoverTween = null;
  let navTween = null;
  let resumeCall = null;
  let incomingHighlightPiece = "top";
  let settledHighlightPiece = null;
  let isInView = false;
  let isHoverPaused = false;
  let isTouchPaused = false;
  let isArrowHoverPaused = false;
  let activeHoverCard = null;
  let isPauseEligible = false;
  let lastPointer = { x: -1, y: -1 };
  const cycleDuration = STEP_DURATION * 5 + HIGHLIGHT_HOLD * 4;
  const pieceTimes = {
    top: STEP_DURATION,
    left: STEP_DURATION * 2 + HIGHLIGHT_HOLD,
    bottom: STEP_DURATION * 3 + HIGHLIGHT_HOLD * 2,
    right: STEP_DURATION * 4 + HIGHLIGHT_HOLD * 3,
  };
  const piecePauseTimes = {
    top: pieceTimes.top + HIGHLIGHT_HOLD * 0.5,
    left: pieceTimes.left + HIGHLIGHT_HOLD * 0.5,
    bottom: pieceTimes.bottom + HIGHLIGHT_HOLD * 0.5,
    right: pieceTimes.right + HIGHLIGHT_HOLD * 0.5,
  };

  gsap.set(grid, { rotation: 0, scale: 1, y: 0 });
  gsap.set(".jewellery", { scale: 1, x: 0, y: 0, rotation: 0 });

  updateLeafOverflow(0);
  setActiveInfoPiece(null);

  const tl = gsap.timeline({
    paused: true,
    repeat: -1,
    repeatDelay: LOOP_REPEAT_DELAY,
    onUpdate: () => {
      updateLeafOverflow(gsap.getProperty(grid, "rotation"));
    },
  });

  const setPauseEligibility = (value) => {
    isPauseEligible = value;

    if (value) {
      maybePauseFromPointer();
    }
  };

  const setHoverPhase = (incoming, settled = null) => {
    incomingHighlightPiece = incoming;
    settledHighlightPiece = settled;
  };

  const stopAuxTweens = () => {
    if (hoverTween) {
      hoverTween.kill();
      hoverTween = null;
    }

    if (navTween) {
      navTween.kill();
      navTween = null;
    }

    if (resumeCall) {
      resumeCall.kill();
      resumeCall = null;
    }
  };

  const maybePauseFromPointer = () => {
    if (
      !isInView ||
      isHoverPaused ||
      isTouchPaused ||
      !activeInfoPiece ||
      !isPauseEligible ||
      lastPointer.x < 0 ||
      lastPointer.y < 0
    ) {
      return;
    }

    const rotation = gsap.getProperty(grid, "rotation");
    const activeSelector = getActiveCardSelector(rotation);

    if (
      !activeSelector ||
      !isPauseReady(rotation, activeSelector) ||
      !isPointerInsideImage(activeSelector, lastPointer.x, lastPointer.y)
    ) {
      return;
    }

    activeHoverCard = activeSelector;
    isHoverPaused = true;
    smoothPauseLoop();
  };

  // STEP 1 → zoom section + highlight TOP
  tl.to(grid, {
    scale: gridScale,
    y: gridY,
    duration: STEP_DURATION,
  });

  tl.to(
    ".topimg",
    {
      scale: imgScale,
      y: -imgOffset,
      duration: STEP_DURATION,
    },
    "<"
  );
  tl.call(() => setHoverPhase("left", "top"));
  tl.call(() => setPauseEligibility(true));
  tl.to({}, { duration: HIGHLIGHT_HOLD });
  tl.call(() => setPauseEligibility(false));

  // STEP 2 → rotate + highlight LEFT
  tl.to(grid, {
    rotation: 90,
    duration: STEP_DURATION,
  });

  tl.to(".topimg", { scale: 1, y: 0, duration: 0.9, rotation: -90 }, "<");
  tl.to(
    ".leftimg",
    { scale: imgScale, x: -imgOffset, duration: STEP_DURATION, rotation: -90 },
    "<"
  );
  tl.to(".bottomimg", { rotation: -90 }, "<");
  tl.to(".rightimg", { rotation: -90 }, "<");
  tl.call(() => setHoverPhase("bottom", "left"));
  tl.call(() => setPauseEligibility(true));
  tl.to({}, { duration: HIGHLIGHT_HOLD });
  tl.call(() => setPauseEligibility(false));

  // STEP 3 → highlight BOTTOM
  tl.to(grid, {
    rotation: 180,
    duration: STEP_DURATION,
  });

  tl.to(".topimg", { rotation: -180 }, "<");
  tl.to(".rightimg", { rotation: -180 }, "<");
  tl.to(".bottomimg", { rotation: -180, y: imgOffset }, "<");
  tl.to(".leftimg", { scale: 1, duration: 0.9, rotation: -180, x: 0 }, "<");
  tl.to(".bottomimg", { scale: imgScale, duration: STEP_DURATION }, "<");
  tl.call(() => setHoverPhase("right", "bottom"));
  tl.call(() => setPauseEligibility(true));
  tl.to({}, { duration: HIGHLIGHT_HOLD });
  tl.call(() => setPauseEligibility(false));

  // STEP 4 → highlight RIGHT
  tl.to(grid, {
    rotation: 270,
    duration: STEP_DURATION,
  });

  tl.to(".topimg", { rotation: -270 }, "<");
  tl.to(".leftimg", { rotation: -270 }, "<");
  tl.to(".bottomimg", { rotation: -270, y: 0 }, "<");
  tl.to(".rightimg", { rotation: -270, x: imgOffset }, "<");
  tl.to(".bottomimg", { scale: 1, duration: 0.9 }, "<");
  tl.to(".rightimg", { scale: imgScale, duration: STEP_DURATION }, "<");
  tl.call(() => setHoverPhase("top", "right"));
  tl.call(() => setPauseEligibility(true));
  tl.to({}, { duration: HIGHLIGHT_HOLD });
  tl.call(() => setPauseEligibility(false));

  // STEP 5 → RESET
  tl.to(grid, {
    rotation: 360,
    scale: 1,
    y: 0,
    duration: STEP_DURATION,
  });

  tl.to(".topimg", { rotation: -360 }, "<");
  tl.to(".leftimg", { rotation: -360, x: 0 }, "<");
  tl.to(".bottomimg", { rotation: -360 }, "<");
  tl.to(".rightimg", { rotation: -360 }, "<");
  tl.to(".rightimg", { scale: 1, x: 0, duration: 0.9 }, "<");

  setupInfoAnimations(tl);

  const setManualPauseUI = (isPaused) => {
    section.classList.toggle("is-user-paused", isPaused);
  };

  const pauseLoop = (manual = false) => {
    if (resetTween) {
      resetTween.kill();
      resetTween = null;
    }

    stopAuxTweens();

    tl.pause();
    if (manual) {
      setManualPauseUI(true);
    }
  };

  const resumeLoop = () => {
    if (!isInView) {
      return;
    }

    if (resetTween) {
      resetTween.kill();
      resetTween = null;
    }

    if (isTouchPaused) {
      return;
    }

    stopAuxTweens();

    setManualPauseUI(false);
    tl.play();
  };

  const smoothPauseLoop = () => {
    if (resetTween) {
      resetTween.kill();
      resetTween = null;
    }

    if (isTouchPaused) {
      return;
    }

    stopAuxTweens();

    setManualPauseUI(true);
    hoverTween = gsap.to(tl, {
      timeScale: 0.01,
      duration: 0.45,
      ease: "power2.out",
      onComplete: () => {
        tl.pause();
        tl.timeScale(1);
        hoverTween = null;
      },
    });
  };

  const smoothResumeLoop = () => {
    if (!isInView) {
      return;
    }

    if (resetTween) {
      resetTween.kill();
      resetTween = null;
    }

    if (isTouchPaused) {
      return;
    }

    stopAuxTweens();

    setManualPauseUI(false);
    tl.timeScale(1);

    if (activeInfoPiece && typeof pieceTimes[activeInfoPiece] === "number") {
      const syncedState = getTimelinePieceState(activeInfoPiece);
      gsap.set(grid, syncedState.grid);
      gsap.set(".topimg", syncedState.top);
      gsap.set(".leftimg", syncedState.left);
      gsap.set(".bottomimg", syncedState.bottom);
      gsap.set(".rightimg", syncedState.right);

      const resumeFromTime = Math.min(
        pieceTimes[activeInfoPiece] + HIGHLIGHT_HOLD - RESUME_OFFSET,
        tl.duration() - RESUME_OFFSET
      );
      tl.pause(resumeFromTime);

      resumeCall = gsap.delayedCall(0.03, () => {
        resumeCall = null;
        if (!isInView || isTouchPaused || isHoverPaused || isArrowHoverPaused) {
          return;
        }

        tl.play();
      });
      return;
    }

    tl.play();
  };

  const animateToRest = () => {
    isInView = false;
    isHoverPaused = false;
    isTouchPaused = false;
    isArrowHoverPaused = false;
    setManualPauseUI(false);

    stopAuxTweens();

    tl.pause();

    if (resetTween) {
      resetTween.kill();
    }

    resetTween = gsap.timeline({
      onUpdate: () => {
        updateLeafOverflow(gsap.getProperty(grid, "rotation"));
      },
      onComplete: () => {
        tl.pause(0);
        updateLeafOverflow(0);
        setActiveInfoPiece(null);
        setPauseEligibility(false);
        resetTween = null;
      },
    });

    resetTween.to(grid, {
      rotation: 0,
      scale: 1,
      y: 0,
      duration: 0.9,
      ease: "power2.out",
    });

    resetTween.to(
      ".jewellery",
      {
        scale: 1,
        x: 0,
        y: 0,
        rotation: 0,
        duration: 0.9,
        ease: "power2.out",
      },
      "<"
    );

    resetTween.to(
      ".info-box--right",
      { x: 24, opacity: 0, duration: 0.35, ease: "power2.in" },
      0
    );
    resetTween.to(
      ".info-box--left",
      { x: -24, opacity: 0, duration: 0.35, ease: "power2.in" },
      0
    );
    resetTween.to(
      ".info-set",
      { opacity: 0, visibility: "hidden", duration: 0.35, ease: "power2.in" },
      0
    );
    setActiveInfoPiece(null);
  };

  const restartAutoplayFromReset = () => {
    if (!isInView || isTouchPaused) {
      return;
    }

    stopAuxTweens();
    setPauseEligibility(false);
    setManualPauseUI(false);
    activeHoverCard = null;
    lastPointer = { x: -1, y: -1 };

    if (resetTween) {
      resetTween.kill();
    }

    tl.pause();
    tl.timeScale(1);

    resetTween = gsap.timeline({
      onUpdate: () => {
        updateLeafOverflow(gsap.getProperty(grid, "rotation"));
      },
      onComplete: () => {
        tl.pause(0);
        tl.timeScale(1);
        gsap.set(grid, { rotation: 0, scale: 1, y: 0 });
        gsap.set(".jewellery", { scale: 1, x: 0, y: 0, rotation: 0 });
        updateLeafOverflow(0);
        setActiveInfoPiece(null);
        setHoverPhase("top", null);
        setPauseEligibility(false);
        resetTween = null;

        resumeCall = gsap.delayedCall(LOOP_REPEAT_DELAY, () => {
          resumeCall = null;

          if (!isInView || isTouchPaused || isHoverPaused || isArrowHoverPaused) {
            return;
          }

          playLoop();
        });
      },
    });

    resetTween.to(grid, {
      rotation: 0,
      scale: 1,
      y: 0,
      duration: STEP_DURATION,
      ease: "power2.inOut",
    });

    resetTween.to(
      ".jewellery",
      {
        scale: 1,
        x: 0,
        y: 0,
        rotation: 0,
        duration: STEP_DURATION,
        ease: "power2.inOut",
      },
      "<"
    );

    resetTween.to(
      ".info-box--right",
      { x: 24, opacity: 0, duration: 0.35, ease: "power2.in" },
      0
    );
    resetTween.to(
      ".info-box--left",
      { x: -24, opacity: 0, duration: 0.35, ease: "power2.in" },
      0
    );
    resetTween.to(
      ".info-set",
      { opacity: 0, visibility: "hidden", duration: 0.35, ease: "power2.in" },
      0
    );
  };

  const playLoop = () => {
    isInView = true;
    activeHoverCard = null;
    setPauseEligibility(false);
    setHoverPhase("top", null);

    if (resetTween) {
      resetTween.kill();
      resetTween = null;
    }

    if (isHoverPaused || isTouchPaused) {
      pauseLoop(true);
      return;
    }

    gsap.set(grid, { rotation: 0, scale: 1, y: 0 });
    gsap.set(".jewellery", { scale: 1, x: 0, y: 0, rotation: 0 });
    updateLeafOverflow(0);

    gsap.set(".info-set", { opacity: 0, visibility: "hidden" });
    gsap.set(".info-box--left", { x: -32, opacity: 0 });
    gsap.set(".info-box--right", { x: 32, opacity: 0 });
    setActiveInfoPiece(null);
    setManualPauseUI(false);

    tl.pause(0);
    tl.invalidate();
    tl.restart();
  };

  const getCardSelectorFromElement = (card) => {
    const positionClass = Array.from(card.classList).find((name) =>
      ["top", "left", "bottom", "right"].includes(name)
    );

    return positionClass ? `.${positionClass}` : null;
  };

  const getCurrentPieceIndex = () => {
    const piece = activeInfoPiece || getCurrentActivePiece(gsap.getProperty(grid, "rotation")) || "top";
    const index = pieceOrder.indexOf(piece);
    return index === -1 ? 0 : index;
  };

  const getHoverTargetPiece = () => {
    return incomingHighlightPiece || "top";
  };

  const getDirectionalPieceState = (piece, direction = 1) => {
    const currentRotation = Number(gsap.getProperty(grid, "rotation")) || 0;
    const currentIndex = getCurrentPieceIndex();
    const targetIndex = pieceOrder.indexOf(piece);
    const clockwiseSteps = (targetIndex - currentIndex + pieceOrder.length) % pieceOrder.length;
    const anticlockwiseSteps =
      (currentIndex - targetIndex + pieceOrder.length) % pieceOrder.length;
    const stepCount =
      direction < 0 ? -anticlockwiseSteps : clockwiseSteps;
    const rotation = currentRotation + stepCount * 90;

    return getPieceStateAtRotation(piece, rotation);
  };

  const getTimelinePieceState = (piece) => {
    const rotationMap = {
      top: 0,
      left: 90,
      bottom: 180,
      right: 270,
    };

    const rotation = rotationMap[piece] ?? 0;
    const imageRotation = -rotation;

    return {
      grid: {
        rotation,
        scale: gridScale,
        y: gridY,
      },
      top: {
        scale: piece === "top" ? imgScale : 1,
        x: 0,
        y: piece === "top" ? -imgOffset : 0,
        rotation: imageRotation,
      },
      left: {
        scale: piece === "left" ? imgScale : 1,
        x: piece === "left" ? -imgOffset : 0,
        y: 0,
        rotation: imageRotation,
      },
      bottom: {
        scale: piece === "bottom" ? imgScale : 1,
        x: 0,
        y: piece === "bottom" ? imgOffset : 0,
        rotation: imageRotation,
      },
      right: {
        scale: piece === "right" ? imgScale : 1,
        x: piece === "right" ? imgOffset : 0,
        y: 0,
        rotation: imageRotation,
      },
    };
  };

  const getPieceStateAtRotation = (piece, rotation) => {
    const imageRotation = -rotation;

    return {
      grid: {
        rotation,
        scale: gridScale,
        y: gridY,
      },
      top: {
        scale: piece === "top" ? imgScale : 1,
        x: 0,
        y: piece === "top" ? -imgOffset : 0,
        rotation: imageRotation,
      },
      left: {
        scale: piece === "left" ? imgScale : 1,
        x: piece === "left" ? -imgOffset : 0,
        y: 0,
        rotation: imageRotation,
      },
      bottom: {
        scale: piece === "bottom" ? imgScale : 1,
        x: 0,
        y: piece === "bottom" ? imgOffset : 0,
        rotation: imageRotation,
      },
      right: {
        scale: piece === "right" ? imgScale : 1,
        x: piece === "right" ? imgOffset : 0,
        y: 0,
        rotation: imageRotation,
      },
    };
  };

  const getAutoplayTargetState = (piece, options = {}) => {
    const { freshStart = false } = options;
    const baseRotationMap = {
      top: 0,
      left: 90,
      bottom: 180,
      right: 270,
    };

    if (freshStart) {
      return getPieceStateAtRotation(piece, baseRotationMap[piece] ?? 0);
    }

    const currentRotation = Number(gsap.getProperty(grid, "rotation")) || 0;
    let targetRotation = baseRotationMap[piece] ?? 0;

    while (targetRotation < currentRotation - 0.01) {
      targetRotation += 360;
    }

    return getPieceStateAtRotation(piece, targetRotation);
  };

  const resumeAutoplayFromArrowPause = () => {
    if (!isInView || isTouchPaused) {
      return;
    }

    stopAuxTweens();
    tl.timeScale(1);
    setPauseEligibility(false);
    setManualPauseUI(false);
    activeHoverCard = null;
    lastPointer = { x: -1, y: -1 };

    const currentPiece =
      activeInfoPiece && pieceOrder.includes(activeInfoPiece) ? activeInfoPiece : "top";
    const currentIndex = pieceOrder.indexOf(currentPiece);
    const nextIndex = (currentIndex + 1) % pieceOrder.length;
    const nextPiece = pieceOrder[nextIndex];
    const nextRotation = currentPiece === "right" ? 360 : (currentIndex + 1) * 90;

    const currentState = getTimelinePieceState(currentPiece);
    const nextState = getPieceStateAtRotation(nextPiece, nextRotation);

    gsap.set(grid, currentState.grid);
    gsap.set(".topimg", currentState.top);
    gsap.set(".leftimg", currentState.left);
    gsap.set(".bottomimg", currentState.bottom);
    gsap.set(".rightimg", currentState.right);
    tl.pause(piecePauseTimes[currentPiece]);

    if (currentPiece === "right") {
      setActiveInfoPiece("right");
      setHoverPhase("top", "right");
      tl.pause(piecePauseTimes.right);

      resumeCall = gsap.delayedCall(0.03, () => {
        resumeCall = null;
        if (!isInView || isTouchPaused || isHoverPaused || isArrowHoverPaused) {
          return;
        }

        tl.play();
      });
      return;
    }

    navTween = gsap.timeline({
      defaults: {
        duration: STEP_DURATION,
        ease: "power2.inOut",
      },
      onUpdate: () => {
        updateLeafOverflow(gsap.getProperty(grid, "rotation"));
      },
      onComplete: () => {
        navTween = null;

        if (!isInView || isTouchPaused || isHoverPaused || isArrowHoverPaused) {
          return;
        }

        const syncedNextState = getTimelinePieceState(nextPiece);
        gsap.set(grid, syncedNextState.grid);
        gsap.set(".topimg", syncedNextState.top);
        gsap.set(".leftimg", syncedNextState.left);
        gsap.set(".bottomimg", syncedNextState.bottom);
        gsap.set(".rightimg", syncedNextState.right);

        setActiveInfoPiece(nextPiece);
        setHoverPhase(pieceOrder[(nextIndex + 1) % pieceOrder.length], nextPiece);
        tl.pause(pieceTimes[nextPiece]);
        tl.play();
      },
    });

    navTween.to(grid, nextState.grid, 0);
    navTween.to(".topimg", nextState.top, 0);
    navTween.to(".leftimg", nextState.left, 0);
    navTween.to(".bottomimg", nextState.bottom, 0);
    navTween.to(".rightimg", nextState.right, 0);
  };

  const goToPiece = (piece, options = {}) => {
    const { direction = 1 } = options;
    const targetTime = piecePauseTimes[piece];

    if (typeof targetTime !== "number") {
      return;
    }

    if (resetTween) {
      resetTween.kill();
      resetTween = null;
    }

    stopAuxTweens();
    tl.pause();
    tl.timeScale(1);
    if (!isArrowHoverPaused) {
      isHoverPaused = false;
    }
    setPauseEligibility(false);

    const finishAtPiece = () => {
      navTween = null;
      const syncedState = getTimelinePieceState(piece);
      gsap.set(grid, syncedState.grid);
      gsap.set(".topimg", syncedState.top);
      gsap.set(".leftimg", syncedState.left);
      gsap.set(".bottomimg", syncedState.bottom);
      gsap.set(".rightimg", syncedState.right);
      setActiveInfoPiece(piece);
      setPauseEligibility(true);
      tl.pause(targetTime);
      setManualPauseUI(isTouchPaused || isHoverPaused || isArrowHoverPaused);
    };

    const state = getDirectionalPieceState(piece, direction);

    navTween = gsap.timeline({
      defaults: {
        duration: MANUAL_NAV_DURATION,
        ease: "power2.inOut",
      },
      onUpdate: () => {
        updateLeafOverflow(gsap.getProperty(grid, "rotation"));
      },
      onComplete: () => {
        tl.pause(targetTime);
        finishAtPiece();
      },
    });

    navTween.to(grid, state.grid, 0);
    navTween.to(".topimg", state.top, 0);
    navTween.to(".leftimg", state.left, 0);
    navTween.to(".bottomimg", state.bottom, 0);
    navTween.to(".rightimg", state.right, 0);
  };

  const stepPiece = (direction) => {
    const currentIndex = getCurrentPieceIndex();
    const nextIndex = (currentIndex + direction + pieceOrder.length) % pieceOrder.length;
    goToPiece(pieceOrder[nextIndex], { direction });
  };

  const isPointerOverAnyArrow = () =>
    [...prevButtons, ...nextButtons].some((button) => button.matches(":hover"));

  const resetToFreshIterationStart = () => {
    stopAuxTweens();
    tl.pause(0);
    tl.timeScale(1);
    gsap.set(grid, { rotation: 0, scale: 1, y: 0 });
    gsap.set(".jewellery", { scale: 1, x: 0, y: 0, rotation: 0 });
    updateLeafOverflow(0);
    setActiveInfoPiece(null);
    setPauseEligibility(false);
    setHoverPhase("top", null);
    activeHoverCard = null;
  };

  const handleArrowHoverEnter = () => {
    if (!isInView || window.matchMedia("(hover: none)").matches || isTouchPaused || isArrowHoverPaused) {
      return;
    }
    const piece = getHoverTargetPiece();
    const targetTime = piecePauseTimes[piece];

    if (typeof targetTime !== "number") {
      return;
    }

    if (resetTween) {
      resetTween.kill();
      resetTween = null;
    }

    stopAuxTweens();
    tl.pause();
    isHoverPaused = true;
    isArrowHoverPaused = true;
    activeHoverCard = null;
    setPauseEligibility(false);
    setManualPauseUI(true);

    const state = getAutoplayTargetState(piece);

    navTween = gsap.timeline({
      defaults: {
        duration: HOVER_SETTLE_DURATION,
        ease: "power2.inOut",
      },
      onUpdate: () => {
        updateLeafOverflow(gsap.getProperty(grid, "rotation"));
      },
      onComplete: () => {
        navTween = null;
        const syncedState = getTimelinePieceState(piece);
        gsap.set(grid, syncedState.grid);
        gsap.set(".topimg", syncedState.top);
        gsap.set(".leftimg", syncedState.left);
        gsap.set(".bottomimg", syncedState.bottom);
        gsap.set(".rightimg", syncedState.right);
        tl.pause(targetTime);
        setActiveInfoPiece(piece);
        setHoverPhase(pieceOrder[(pieceOrder.indexOf(piece) + 1) % pieceOrder.length], piece);
        setPauseEligibility(true);
      },
    });

    navTween.to(grid, state.grid, 0);
    navTween.to(".topimg", state.top, 0);
    navTween.to(".leftimg", state.left, 0);
    navTween.to(".bottomimg", state.bottom, 0);
    navTween.to(".rightimg", state.right, 0);
  };

  const handleArrowHoverLeave = () => {
    if (!isArrowHoverPaused) {
      return;
    }

    requestAnimationFrame(() => {
      if (isPointerOverAnyArrow()) {
        return;
      }

      isArrowHoverPaused = false;

      if (isTouchPaused || !isInView) {
        return;
      }

      isHoverPaused = false;
      activeHoverCard = null;
      resumeAutoplayFromArrowPause();
    });
  };

  const handlePointerMove = (event) => {
    if (!isInView || window.matchMedia("(hover: none)").matches) {
      return;
    }

    if (isArrowHoverPaused) {
      return;
    }

    lastPointer = { x: event.clientX, y: event.clientY };

    if (!activeInfoPiece) {
      activeHoverCard = null;

      if (isHoverPaused && !isTouchPaused) {
        isHoverPaused = false;
        smoothResumeLoop();
      }

      return;
    }

    const rotation = gsap.getProperty(grid, "rotation");
    const activeSelector = getActiveCardSelector(rotation);

    if (
      !activeSelector ||
      !isPauseEligible ||
      !isPauseReady(rotation, activeSelector) ||
      !isPointerInsideImage(activeSelector, event.clientX, event.clientY)
    ) {
      activeHoverCard = null;

      if (isHoverPaused && !isTouchPaused) {
        isHoverPaused = false;
        smoothResumeLoop();
      }

      return;
    }

    if (activeHoverCard === activeSelector) {
      return;
    }

    activeHoverCard = activeSelector;

    if (!isHoverPaused) {
      isHoverPaused = true;
      smoothPauseLoop();
    }
  };

  const handleSectionMouseLeave = () => {
    activeHoverCard = null;
    lastPointer = { x: -1, y: -1 };

    const wasArrowHoverPaused = isArrowHoverPaused;
    isArrowHoverPaused = false;

    if (wasArrowHoverPaused && !isTouchPaused) {
      isHoverPaused = false;
      resumeAutoplayFromArrowPause();
      return;
    }

    if (!isHoverPaused) {
      return;
    }

    isHoverPaused = false;
    if (!isTouchPaused) {
      smoothResumeLoop();
    }
  };

  const handleCardTap = (event) => {
    if (window.matchMedia("(hover: hover)").matches || !isInView) {
      return;
    }

    const card = event.currentTarget;
    const activeSelector = getActiveCardSelector(gsap.getProperty(grid, "rotation"));
    const cardSelector = getCardSelectorFromElement(card);

    if (!cardSelector || cardSelector !== activeSelector) {
      return;
    }

    event.preventDefault();

    if (isTouchPaused) {
      isTouchPaused = false;
      resumeLoop();
      return;
    }

    isTouchPaused = true;
    const piece = selectorToPiece[cardSelector];

    if (piece) {
      gsap.set(".info-set", { opacity: 0, visibility: "hidden" });
      gsap.set(".info-box--left", { x: -24, opacity: 0 });
      gsap.set(".info-box--right", { x: 24, opacity: 0 });
      gsap.set(`.info-set[data-piece="${piece}"]`, { opacity: 1, visibility: "visible" });
      gsap.set(`.info-set[data-piece="${piece}"] .info-box--left`, { x: 0, opacity: 1 });
      gsap.set(`.info-set[data-piece="${piece}"] .info-box--right`, { x: 0, opacity: 1 });
      setActiveInfoPiece(piece);
    }

    pauseLoop(true);
  };

  const handlePrevClick = () => {
    stepPiece(-1);
  };

  const handleNextClick = () => {
    stepPiece(1);
  };

  section.addEventListener("mousemove", handlePointerMove);
  section.addEventListener("mouseleave", handleSectionMouseLeave);
  cards.forEach((card) => card.addEventListener("click", handleCardTap));
  prevButtons.forEach((button) => {
    button.addEventListener("click", handlePrevClick);
    button.addEventListener("mouseenter", handleArrowHoverEnter);
    button.addEventListener("mouseleave", handleArrowHoverLeave);
  });
  nextButtons.forEach((button) => {
    button.addEventListener("click", handleNextClick);
    button.addEventListener("mouseenter", handleArrowHoverEnter);
    button.addEventListener("mouseleave", handleArrowHoverLeave);
  });

  const visibilityTrigger = ScrollTrigger.create({
    trigger: ".jewellery-section",
    start: "top 85%",
    end: "bottom 70%",
    onEnter: playLoop,
    onEnterBack: playLoop,
    onLeave: animateToRest,
    onLeaveBack: animateToRest,
  });

  return () => {
    section.removeEventListener("mousemove", handlePointerMove);
    section.removeEventListener("mouseleave", handleSectionMouseLeave);
    cards.forEach((card) => card.removeEventListener("click", handleCardTap));
    prevButtons.forEach((button) => {
      button.removeEventListener("click", handlePrevClick);
      button.removeEventListener("mouseenter", handleArrowHoverEnter);
      button.removeEventListener("mouseleave", handleArrowHoverLeave);
    });
    nextButtons.forEach((button) => {
      button.removeEventListener("click", handleNextClick);
      button.removeEventListener("mouseenter", handleArrowHoverEnter);
      button.removeEventListener("mouseleave", handleArrowHoverLeave);
    });
    visibilityTrigger.kill();
    tl.kill();
  };
}

ScrollTrigger.matchMedia({
  "(max-width: 767px)": () => createJewelleryTimeline(getMetrics()),
  "(min-width: 768px) and (max-width: 1023px)": () => createJewelleryTimeline(getMetrics()),
  "(min-width: 1024px)": () => createJewelleryTimeline(getMetrics()),
});
