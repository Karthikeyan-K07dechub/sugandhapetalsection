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

function hideInfoPiecesImmediate() {
  gsap.set(".info-set", { opacity: 0, visibility: "hidden" });
  gsap.set(".info-box--left", { x: -32, opacity: 0 });
  gsap.set(".info-box--right", { x: 32, opacity: 0 });
  setActiveInfoPiece(null);
}

function showInfoPieceImmediate(piece) {
  if (!piece) {
    hideInfoPiecesImmediate();
    return;
  }

  hideInfoPiecesImmediate();
  gsap.set(`.info-set[data-piece="${piece}"]`, { opacity: 1, visibility: "visible" });
  gsap.set(`.info-set[data-piece="${piece}"] .info-box--left`, { x: 0, opacity: 1 });
  gsap.set(`.info-set[data-piece="${piece}"] .info-box--right`, { x: 0, opacity: 1 });
  setActiveInfoPiece(piece);
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
  const pieceToSelector = {
    top: ".top",
    left: ".left",
    bottom: ".bottom",
    right: ".right",
  };

  let currentIndex = 0;
  let rawRotation = 0;
  let pendingIndex = null;
  let pendingRotation = null;
  let activeTween = null;
  let autoAdvanceCall = null;
  let restTween = null;
  let isInView = false;
  let isHoverPaused = false;
  let isTouchPaused = false;
  let isArrowHovered = false;
  let isNeutralState = true;

  const getPieceName = (index) => pieceOrder[(index + pieceOrder.length) % pieceOrder.length];

  const setManualPauseUI = (isPaused) => {
    section.classList.toggle("is-user-paused", isPaused);
  };

  const refreshPauseUI = () => {
    setManualPauseUI(isHoverPaused || isTouchPaused || isArrowHovered);
  };

  const clearAutoAdvance = () => {
    if (autoAdvanceCall) {
      autoAdvanceCall.kill();
      autoAdvanceCall = null;
    }
  };

  const clearActiveTween = () => {
    if (activeTween) {
      activeTween.kill();
      activeTween = null;
    }
  };

  const clearRestTween = () => {
    if (restTween) {
      restTween.kill();
      restTween = null;
    }
  };

  const stopAllMotion = () => {
    clearAutoAdvance();
    clearActiveTween();
    clearRestTween();
  };

  const getPieceState = (piece, rotation) => {
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

  const applyPieceState = (index, rotation) => {
    const piece = getPieceName(index);
    const state = getPieceState(piece, rotation);
    gsap.set(grid, state.grid);
    gsap.set(".topimg", state.top);
    gsap.set(".leftimg", state.left);
    gsap.set(".bottomimg", state.bottom);
    gsap.set(".rightimg", state.right);
    updateLeafOverflow(rotation);
  };

  const finalizePiece = (index, rotation) => {
    currentIndex = index;
    rawRotation = rotation;
    pendingIndex = null;
    pendingRotation = null;
    isNeutralState = false;
    applyPieceState(index, rotation);
    showInfoPieceImmediate(getPieceName(index));
  };

  const getTargetRotation = (fromIndex, fromRotation, toIndex, direction = 1) => {
    const total = pieceOrder.length;
    const forwardSteps = (toIndex - fromIndex + total) % total;
    const backwardSteps = (fromIndex - toIndex + total) % total;

    if (direction < 0) {
      return fromRotation - backwardSteps * 90;
    }

    return fromRotation + forwardSteps * 90;
  };

  const animateToIndex = (index, options = {}) => {
    const {
      direction = 1,
      duration = MANUAL_NAV_DURATION,
      ease = "power2.inOut",
      autoDelay = null,
      forcePending = false,
    } = options;

    clearAutoAdvance();
    clearRestTween();

    const baseIndex = forcePending && pendingIndex !== null ? pendingIndex : currentIndex;
    const baseRotation = forcePending && pendingRotation !== null ? pendingRotation : rawRotation;
    const targetRotation = getTargetRotation(baseIndex, baseRotation, index, direction);
    const targetPiece = getPieceName(index);
    const state = getPieceState(targetPiece, targetRotation);

    clearActiveTween();
    pendingIndex = index;
    pendingRotation = targetRotation;

    activeTween = gsap.timeline({
      defaults: { duration, ease },
      onUpdate: () => {
        updateLeafOverflow(gsap.getProperty(grid, "rotation"));
      },
      onComplete: () => {
        activeTween = null;
        finalizePiece(index, targetRotation);

        if (autoDelay !== null && isInView && !isHoverPaused && !isTouchPaused && !isArrowHovered) {
          scheduleAutoAdvance(autoDelay);
        }
      },
    });

    activeTween.to(grid, state.grid, 0);
    activeTween.to(".topimg", state.top, 0);
    activeTween.to(".leftimg", state.left, 0);
    activeTween.to(".bottomimg", state.bottom, 0);
    activeTween.to(".rightimg", state.right, 0);
  };

  const settleToResolvedPiece = (duration = HOVER_SETTLE_DURATION) => {
    if (pendingIndex === null || pendingRotation === null) {
      applyPieceState(currentIndex, rawRotation);
      showInfoPieceImmediate(getPieceName(currentIndex));
      return;
    }

    const targetIndex = pendingIndex;
    const targetRotation = pendingRotation;
    const targetPiece = getPieceName(targetIndex);
    const state = getPieceState(targetPiece, targetRotation);

    clearActiveTween();

    activeTween = gsap.timeline({
      defaults: { duration, ease: "power2.inOut" },
      onUpdate: () => {
        updateLeafOverflow(gsap.getProperty(grid, "rotation"));
      },
      onComplete: () => {
        activeTween = null;
        finalizePiece(targetIndex, targetRotation);
      },
    });

    activeTween.to(grid, state.grid, 0);
    activeTween.to(".topimg", state.top, 0);
    activeTween.to(".leftimg", state.left, 0);
    activeTween.to(".bottomimg", state.bottom, 0);
    activeTween.to(".rightimg", state.right, 0);
  };

  const animateToNeutralState = (options = {}) => {
    const {
      duration = STEP_DURATION,
      ease = "power2.inOut",
      delayBeforeTop = LOOP_REPEAT_DELAY,
    } = options;

    clearAutoAdvance();
    clearRestTween();
    clearActiveTween();
    pendingIndex = null;
    pendingRotation = null;

    const resetRotation = rawRotation + 90;

    activeTween = gsap.timeline({
      defaults: { duration, ease },
      onUpdate: () => {
        updateLeafOverflow(gsap.getProperty(grid, "rotation"));
      },
      onComplete: () => {
        activeTween = null;
        currentIndex = 0;
        rawRotation = 0;
        isNeutralState = true;
        gsap.set(grid, { rotation: 0, scale: 1, y: 0 });
        gsap.set(".jewellery", { scale: 1, x: 0, y: 0, rotation: 0 });
        updateLeafOverflow(0);
        hideInfoPiecesImmediate();

        if (isInView && !isHoverPaused && !isTouchPaused && !isArrowHovered) {
          autoAdvanceCall = gsap.delayedCall(delayBeforeTop, () => {
            autoAdvanceCall = null;

            if (!isInView || isHoverPaused || isTouchPaused || isArrowHovered) {
              return;
            }

            animateToIndex(0, {
              direction: 1,
              duration: STEP_DURATION,
              autoDelay: HIGHLIGHT_HOLD,
            });
          });
        }
      },
    });

    activeTween.to(
      grid,
      {
        rotation: resetRotation,
        scale: 1,
        y: 0,
      },
      0
    );
    activeTween.to(
      ".jewellery",
      {
        scale: 1,
        x: 0,
        y: 0,
        rotation: -resetRotation,
      },
      0
    );
    activeTween.to(".info-box--right", { x: 24, opacity: 0, duration: 0.35, ease: "power2.in" }, 0);
    activeTween.to(".info-box--left", { x: -24, opacity: 0, duration: 0.35, ease: "power2.in" }, 0);
    activeTween.to(".info-set", { opacity: 0, visibility: "hidden", duration: 0.35, ease: "power2.in" }, 0);
  };

  const scheduleAutoAdvance = (delay = HIGHLIGHT_HOLD) => {
    clearAutoAdvance();

    if (!isInView || isHoverPaused || isTouchPaused || isArrowHovered) {
      return;
    }

    autoAdvanceCall = gsap.delayedCall(delay, () => {
      autoAdvanceCall = null;

      if (!isInView || isHoverPaused || isTouchPaused || isArrowHovered) {
        return;
      }

      const nextIndex = (currentIndex + 1) % pieceOrder.length;
      if (nextIndex === 0) {
        animateToNeutralState();
        return;
      }

      animateToIndex(nextIndex, {
        direction: 1,
        duration: STEP_DURATION,
        autoDelay: HIGHLIGHT_HOLD,
      });
    });
  };

  const pauseAutoplay = () => {
    clearAutoAdvance();
    if (pendingIndex !== null) {
      settleToResolvedPiece();
    }
    refreshPauseUI();
  };

  const resumeAutoplay = (delay = HIGHLIGHT_HOLD) => {
    if (!isInView || isTouchPaused || isHoverPaused || isArrowHovered) {
      refreshPauseUI();
      return;
    }

    clearAutoAdvance();
    refreshPauseUI();

    if (isNeutralState) {
      animateToIndex(0, {
        direction: 1,
        duration: STEP_DURATION,
        autoDelay: HIGHLIGHT_HOLD,
      });
      return;
    }

    scheduleAutoAdvance(delay);
  };

  const animateToRest = () => {
    isInView = false;
    isHoverPaused = false;
    isTouchPaused = false;
    isArrowHovered = false;
    refreshPauseUI();
    stopAllMotion();

    restTween = gsap.timeline({
      onUpdate: () => {
        updateLeafOverflow(gsap.getProperty(grid, "rotation"));
      },
      onComplete: () => {
        restTween = null;
        gsap.set(grid, { rotation: 0, scale: 1, y: 0 });
        gsap.set(".jewellery", { scale: 1, x: 0, y: 0, rotation: 0 });
        updateLeafOverflow(0);
        hideInfoPiecesImmediate();
      },
    });

    restTween.to(grid, {
      rotation: 0,
      scale: 1,
      y: 0,
      duration: 0.9,
      ease: "power2.out",
    });

    restTween.to(
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

    restTween.to(".info-box--right", { x: 24, opacity: 0, duration: 0.35, ease: "power2.in" }, 0);
    restTween.to(".info-box--left", { x: -24, opacity: 0, duration: 0.35, ease: "power2.in" }, 0);
    restTween.to(".info-set", { opacity: 0, visibility: "hidden", duration: 0.35, ease: "power2.in" }, 0);
  };

  const playLoop = () => {
    isInView = true;
    clearRestTween();
    clearAutoAdvance();

    if (pendingIndex !== null && pendingRotation !== null) {
      finalizePiece(pendingIndex, pendingRotation);
    } else if (isNeutralState) {
      gsap.set(grid, { rotation: 0, scale: 1, y: 0 });
      gsap.set(".jewellery", { scale: 1, x: 0, y: 0, rotation: 0 });
      updateLeafOverflow(0);
      hideInfoPiecesImmediate();
    } else {
      applyPieceState(currentIndex, rawRotation);
      showInfoPieceImmediate(getPieceName(currentIndex));
    }

    refreshPauseUI();

    if (!isTouchPaused && !isHoverPaused && !isArrowHovered) {
      if (isNeutralState) {
        animateToIndex(0, {
          direction: 1,
          duration: STEP_DURATION,
          autoDelay: HIGHLIGHT_HOLD,
        });
      } else {
        scheduleAutoAdvance(HIGHLIGHT_HOLD);
      }
    }
  };

  const getCardSelectorFromElement = (card) => {
    const positionClass = Array.from(card.classList).find((name) =>
      ["top", "left", "bottom", "right"].includes(name)
    );

    return positionClass ? `.${positionClass}` : null;
  };

  const handlePointerMove = (event) => {
    if (!isInView || window.matchMedia("(hover: none)").matches || isArrowHovered || isNeutralState) {
      return;
    }

    const piece = getPieceName(currentIndex);
    const selector = pieceToSelector[piece];
    const isInsideActiveImage =
      selector &&
      isPauseReady(gsap.getProperty(grid, "rotation"), selector) &&
      isPointerInsideImage(selector, event.clientX, event.clientY);

    if (isInsideActiveImage) {
      if (!isHoverPaused && !isTouchPaused) {
        isHoverPaused = true;
        pauseAutoplay();
      }
      return;
    }

    if (isHoverPaused && !isTouchPaused) {
      isHoverPaused = false;
      resumeAutoplay();
    }
  };

  const handleSectionMouseLeave = () => {
    const wasArrowHovered = isArrowHovered;
    isArrowHovered = false;

    if (isHoverPaused && !isTouchPaused) {
      isHoverPaused = false;
      resumeAutoplay();
      return;
    }

    if (wasArrowHovered && !isTouchPaused) {
      resumeAutoplay();
      return;
    }

    refreshPauseUI();
  };

  const handleArrowHoverEnter = () => {
    if (!isInView || window.matchMedia("(hover: none)").matches || isTouchPaused) {
      return;
    }

    isArrowHovered = true;
    pauseAutoplay();
  };

  const handleArrowHoverLeave = () => {
    if (!isArrowHovered) {
      return;
    }

    requestAnimationFrame(() => {
      const stillHoveringArrow = [...prevButtons, ...nextButtons].some((button) => button.matches(":hover"));
      if (stillHoveringArrow) {
        return;
      }

      isArrowHovered = false;
      resumeAutoplay();
    });
  };

  const stepPiece = (direction) => {
    const baseIndex = pendingIndex !== null ? pendingIndex : currentIndex;
    const nextIndex = (baseIndex + direction + pieceOrder.length) % pieceOrder.length;

    isHoverPaused = false;
    isArrowHovered = false;
    refreshPauseUI();

    animateToIndex(nextIndex, {
      direction,
      duration: MANUAL_NAV_DURATION,
      autoDelay: 1.2,
      forcePending: pendingIndex !== null,
    });
  };

  const handleCardTap = (event) => {
    if (window.matchMedia("(hover: hover)").matches || !isInView) {
      return;
    }

    const card = event.currentTarget;
    const activePiece = getPieceName(currentIndex);
    const activeSelector = pieceToSelector[activePiece];
    const cardSelector = getCardSelectorFromElement(card);

    if (!cardSelector || cardSelector !== activeSelector) {
      return;
    }

    event.preventDefault();

    if (isTouchPaused) {
      isTouchPaused = false;
      resumeAutoplay();
      return;
    }

    isTouchPaused = true;
    pauseAutoplay();
  };

  const handlePrevClick = () => {
    stepPiece(-1);
  };

  const handleNextClick = () => {
    stepPiece(1);
  };

  gsap.set(grid, { rotation: 0, scale: 1, y: 0 });
  gsap.set(".jewellery", { scale: 1, x: 0, y: 0, rotation: 0 });
  updateLeafOverflow(0);
  hideInfoPiecesImmediate();
  isNeutralState = true;

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
    stopAllMotion();
  };
}

ScrollTrigger.matchMedia({
  "(max-width: 767px)": () => createJewelleryTimeline(getMetrics()),
  "(min-width: 768px) and (max-width: 1023px)": () => createJewelleryTimeline(getMetrics()),
  "(min-width: 1024px)": () => createJewelleryTimeline(getMetrics()),
});
