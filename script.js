(function initJewelleryExperience() {
  const section = document.querySelector(".jewellery-section");
  if (!section) {
    return;
  }

  const cards = Array.from(document.querySelectorAll(".grid .card"));
  const infoSets = Array.from(document.querySelectorAll(".info-set"));
  const prevButtons = Array.from(document.querySelectorAll(".jewel-control--prev"));
  const nextButtons = Array.from(document.querySelectorAll(".jewel-control--next"));
  const pieceOrder = ["top", "left", "bottom", "right"];
  const userAgent = window.navigator.userAgent || "";
  const isIOSWebKit =
    /iP(ad|hone|od)/.test(userAgent) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);

  if (isIOSWebKit) {
    section.classList.add("is-ios-webkit");
  }

  function setFallbackPiece(piece) {
    infoSets.forEach((el) => {
      el.classList.toggle("is-active", el.dataset.piece === piece);
    });

    cards.forEach((card) => {
      const isActiveCard =
        (piece === "top" && card.classList.contains("top")) ||
        (piece === "left" && card.classList.contains("left")) ||
        (piece === "bottom" && card.classList.contains("bottom")) ||
        (piece === "right" && card.classList.contains("right"));

      card.classList.toggle("is-highlighted", isActiveCard);
    });
  }

  function activateFallbackMode() {
    if (section.dataset.fallbackReady === "true") {
      return;
    }

    let currentIndex = 0;
    section.dataset.fallbackReady = "true";
    section.classList.add("is-fallback", "is-neutral-layout");

    const syncFallback = () => {
      setFallbackPiece(pieceOrder[currentIndex]);
    };

    const stepFallback = (direction) => {
      currentIndex = (currentIndex + direction + pieceOrder.length) % pieceOrder.length;
      syncFallback();
    };

    prevButtons.forEach((button) => {
      button.addEventListener("click", () => stepFallback(-1));
    });

    nextButtons.forEach((button) => {
      button.addEventListener("click", () => stepFallback(1));
    });

    syncFallback();
  }

  function shouldUseSimpleMobileMode() {
    return false;
  }

  if (shouldUseSimpleMobileMode()) {
    activateFallbackMode();
    return;
  }

  if (typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") {
    activateFallbackMode();
    return;
  }

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  if (typeof window.Lenis !== "undefined") {
    const lenis = new window.Lenis({
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
  }

  const grid = document.querySelector(".grid");
  const TOP_ZONE = 40;
  const PAUSE_READY_ZONE = 3;
  const STEP_DURATION = 2.1;
  const HIGHLIGHT_HOLD = 0.95;
  const LOOP_REPEAT_DELAY = 1.85;
  const MANUAL_NAV_DURATION = 1.8;
  const MANUAL_ARROW_PAUSE_DELAY = 5;
  const HOVER_SETTLE_DURATION = 1.05;
  const REST_RETURN_DURATION = 1.45;
  const REST_RETURN_DURATION_RANGE = 0.7;
  const REST_INFO_FADE_DURATION = 0.45;

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

  function createSelectorMap(className) {
    const map = {};
    cardAngles.forEach(({ selector }) => {
      map[selector] = document.querySelector(`${selector} ${className}`);
    });
    return map;
  }

  const leafMap = createSelectorMap(".leaf");
  const imageMap = createSelectorMap(".jewellery");

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

  function updateLeafOverflow(rotation, preferredSelector = null, preserveSelector = null) {
    const active = getActiveCardSelector(rotation);
    const visibleSelector = preferredSelector || active;
    const visibleOverflowSelectors = new Set();

    if (active) {
      visibleOverflowSelectors.add(active);
    }

    if (preferredSelector) {
      visibleOverflowSelectors.add(preferredSelector);
    }

    if (preserveSelector) {
      visibleOverflowSelectors.add(preserveSelector);
    }

    const visibleOverflowKey = Array.from(visibleOverflowSelectors).sort().join("|");

    if (activeLeafSelector === visibleOverflowKey) {
      return;
    }

    activeLeafSelector = visibleOverflowKey;

    cardAngles.forEach(({ selector }) => {
      const leafinner = leafMap[selector];
      if (leafinner) {
        leafinner.style.overflow = visibleOverflowSelectors.has(selector) ? "visible" : "hidden";
      }
    });

    cards.forEach((card) => {
      const isActiveCard =
        !!visibleSelector &&
        ((visibleSelector === ".top" && card.classList.contains("top")) ||
          (visibleSelector === ".left" && card.classList.contains("left")) ||
          (visibleSelector === ".bottom" && card.classList.contains("bottom")) ||
          (visibleSelector === ".right" && card.classList.contains("right")));

      card.classList.toggle("is-highlighted", isActiveCard);
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
        gridScale: 1.12,
        gridY: "24vh",
        imgOffset: size * 0.3,
        // imgScale: 1.22,
        imgScale: 1.57,
        necklaceScaleBoost: 1.28,
        slimNecklaceScaleBoost: 1.4,
      };
    }

    if (vw < 1024) {
      return {
        gridScale: 1.45,
        gridY: "48vh",
        imgOffset: size * 0.14,
        imgScale: 1.7,
        necklaceScaleBoost: 1.2,
        slimNecklaceScaleBoost: 1.3,
      };
    }

    return {
      gridScale: 1.6,
      gridY: "62vh",
      imgOffset: size * 0.155,
      imgScale: 2,
      necklaceScaleBoost: 1,
      slimNecklaceScaleBoost: 1,
    };
  }

  function createJewelleryTimeline(config) {
    const { gridScale, gridY, imgOffset, imgScale, necklaceScaleBoost, slimNecklaceScaleBoost } = config;
    const pieceToSelector = {
      top: ".top",
      left: ".left",
      bottom: ".bottom",
      right: ".right",
    };
    const pieceScaleMap = {
      top: imgScale * necklaceScaleBoost,
      left: imgScale * necklaceScaleBoost,
      bottom: imgScale,
      right: imgScale * slimNecklaceScaleBoost,
    };

    let currentIndex = 0;
    let rawRotation = 0;
    let pendingIndex = null;
    let pendingRotation = null;
    let activeTween = null;
    let autoAdvanceCall = null;
    let neutralResumeCall = null;
    let manualArrowResumeCall = null;
    let neutralReadyAt = null;
    let restTween = null;
    let isInView = false;
    let isHoverPaused = false;
    let isTouchPaused = false;
    let isArrowHovered = false;
    let isArrowTemporarilyPaused = false;
    let isNeutralState = true;

    const getPieceName = (index) => pieceOrder[(index + pieceOrder.length) % pieceOrder.length];

    const setNeutralLayout = (isNeutral) => {
      section.classList.toggle("is-neutral-layout", isNeutral);
    };

    const setManualPauseUI = (isPaused) => {
      section.classList.toggle("is-user-paused", isPaused);
    };

    const refreshPauseUI = () => {
      setManualPauseUI(isHoverPaused || isTouchPaused || isArrowHovered || isArrowTemporarilyPaused);
    };

    const clearAutoAdvance = () => {
      if (autoAdvanceCall) {
        autoAdvanceCall.kill();
        autoAdvanceCall = null;
      }
    };

    const clearNeutralResume = () => {
      if (neutralResumeCall) {
        neutralResumeCall.kill();
        neutralResumeCall = null;
      }
    };

    const clearManualArrowResume = () => {
      if (manualArrowResumeCall) {
        manualArrowResumeCall.kill();
        manualArrowResumeCall = null;
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
      clearNeutralResume();
      clearManualArrowResume();
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
          scale: piece === "top" ? pieceScaleMap.top : 1,
          x: 0,
          y: piece === "top" ? -imgOffset : 0,
          rotation: imageRotation,
        },
        left: {
          scale: piece === "left" ? pieceScaleMap.left : 1,
          x: piece === "left" ? -imgOffset : 0,
          y: 0,
          rotation: imageRotation,
        },
        bottom: {
          scale: piece === "bottom" ? pieceScaleMap.bottom : 1,
          x: 0,
          y: piece === "bottom" ? imgOffset : 0,
          rotation: imageRotation,
        },
        right: {
          scale: piece === "right" ? pieceScaleMap.right : 1,
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
      setNeutralLayout(false);
      neutralReadyAt = null;
      clearNeutralResume();
      applyPieceState(index, rotation);
      showInfoPieceImmediate(getPieceName(index));
    };

    const startTopHighlightFromNeutral = () => {
      if (
        !isInView ||
        !isNeutralState ||
        isTouchPaused ||
        isHoverPaused ||
        isArrowHovered ||
        isArrowTemporarilyPaused
      ) {
        return false;
      }

      neutralReadyAt = null;
      clearNeutralResume();
      animateToIndex(0, {
        direction: 1,
        duration: STEP_DURATION,
        autoDelay: HIGHLIGHT_HOLD,
      });
      return true;
    };

    const queueNeutralResume = (delaySeconds) => {
      neutralReadyAt = performance.now() + delaySeconds * 1000;
      clearNeutralResume();

      neutralResumeCall = gsap.delayedCall(delaySeconds, () => {
        neutralResumeCall = null;
        startTopHighlightFromNeutral();
      });
    };

    const resumeNeutralSequence = () => {
      if (!isNeutralState || neutralReadyAt === null) {
        return false;
      }

      const remainingSeconds = Math.max(0, (neutralReadyAt - performance.now()) / 1000);

      if (remainingSeconds === 0) {
        return startTopHighlightFromNeutral();
      }

      if (!neutralResumeCall) {
        neutralResumeCall = gsap.delayedCall(remainingSeconds, () => {
          neutralResumeCall = null;
          startTopHighlightFromNeutral();
        });
      }

      return true;
    };

    const watchNeutralSequence = () => {
      if (!isNeutralState || neutralReadyAt === null) {
        return;
      }

      if (!isInView || isTouchPaused || isHoverPaused || isArrowHovered || isArrowTemporarilyPaused) {
        return;
      }

      if (performance.now() < neutralReadyAt) {
        return;
      }

      startTopHighlightFromNeutral();
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
      setNeutralLayout(false);
      pendingIndex = index;
      pendingRotation = targetRotation;

      activeTween = gsap.timeline({
        defaults: { duration, ease },
        onUpdate: () => {
          updateLeafOverflow(
            gsap.getProperty(grid, "rotation"),
            `.${targetPiece}`,
            isIOSWebKit ? `.${getPieceName(currentIndex)}` : null
          );
        },
        onComplete: () => {
          activeTween = null;
          finalizePiece(index, targetRotation);

          if (
            autoDelay !== null &&
            isInView &&
            !isHoverPaused &&
            !isTouchPaused &&
            !isArrowHovered &&
            !isArrowTemporarilyPaused
          ) {
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
          updateLeafOverflow(
            gsap.getProperty(grid, "rotation"),
            `.${targetPiece}`,
            isIOSWebKit ? `.${getPieceName(currentIndex)}` : null
          );
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
      clearNeutralResume();
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
          setNeutralLayout(true);
          isHoverPaused = false;
          gsap.set(grid, { rotation: 0, scale: 1, y: 0 });
          gsap.set(".jewellery", { scale: 1, x: 0, y: 0, rotation: 0 });
          updateLeafOverflow(0);
          hideInfoPiecesImmediate();
          refreshPauseUI();

          if (isInView) {
            queueNeutralResume(delayBeforeTop);
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

      if (!isInView || isHoverPaused || isTouchPaused || isArrowHovered || isArrowTemporarilyPaused) {
        return;
      }

      autoAdvanceCall = gsap.delayedCall(delay, () => {
        autoAdvanceCall = null;

        if (!isInView || isHoverPaused || isTouchPaused || isArrowHovered || isArrowTemporarilyPaused) {
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
      clearNeutralResume();
      clearManualArrowResume();
      if (pendingIndex !== null) {
        settleToResolvedPiece();
      }
      refreshPauseUI();
    };

    const resumeAutoplay = (delay = HIGHLIGHT_HOLD) => {
      if (!isInView || isTouchPaused || isHoverPaused || isArrowHovered || isArrowTemporarilyPaused) {
        refreshPauseUI();
        return;
      }

      clearAutoAdvance();
      refreshPauseUI();

      if (isNeutralState) {
        if (resumeNeutralSequence()) {
          return;
        }

        startTopHighlightFromNeutral();
        return;
      }

      scheduleAutoAdvance(delay);
    };

    const animateToRest = () => {
      const visibleRotation = Number(gsap.getProperty(grid, "rotation")) || 0;
      let neutralDelta = -normalizeAngle(visibleRotation);
      if (neutralDelta > 180) {
        neutralDelta -= 360;
      }
      if (neutralDelta < -180) {
        neutralDelta += 360;
      }

      const neutralRotation = visibleRotation + neutralDelta;
      const neutralImageRotation = -neutralRotation;
      const restRotationDistance = Math.abs(neutralDelta);
      const restDuration =
        REST_RETURN_DURATION + (restRotationDistance / 180) * REST_RETURN_DURATION_RANGE;

      isInView = false;
      isHoverPaused = false;
      isTouchPaused = false;
      isArrowHovered = false;
      isArrowTemporarilyPaused = false;
      isNeutralState = true;
      currentIndex = 0;
      rawRotation = 0;
      pendingIndex = null;
      pendingRotation = null;
      neutralReadyAt = null;
      refreshPauseUI();
      stopAllMotion();

      restTween = gsap.timeline({
        onUpdate: () => {
          updateLeafOverflow(gsap.getProperty(grid, "rotation"));
        },
        onComplete: () => {
          restTween = null;
          setNeutralLayout(true);
          gsap.set(grid, { rotation: 0, scale: 1, y: 0 });
          gsap.set(".jewellery", { scale: 1, x: 0, y: 0, rotation: 0 });
          updateLeafOverflow(0);
          hideInfoPiecesImmediate();
        },
      });

      restTween.to(grid, {
        rotation: neutralRotation,
        scale: 1,
        y: 0,
        duration: restDuration,
        ease: "power2.inOut",
      });

      restTween.to(
        ".jewellery",
        {
          scale: 1,
          x: 0,
          y: 0,
          rotation: neutralImageRotation,
          duration: restDuration,
          ease: "power2.inOut",
        },
        "<"
      );

      restTween.to(
        ".info-box--right",
        { x: 24, opacity: 0, duration: REST_INFO_FADE_DURATION, ease: "power2.inOut" },
        0
      );
      restTween.to(
        ".info-box--left",
        { x: -24, opacity: 0, duration: REST_INFO_FADE_DURATION, ease: "power2.inOut" },
        0
      );
      restTween.to(
        ".info-set",
        { opacity: 0, visibility: "hidden", duration: REST_INFO_FADE_DURATION, ease: "power2.inOut" },
        0
      );
    };

    const playLoop = () => {
      isInView = true;
      clearRestTween();
      clearAutoAdvance();
      clearNeutralResume();

      if (pendingIndex !== null && pendingRotation !== null) {
        finalizePiece(pendingIndex, pendingRotation);
      } else if (isNeutralState) {
        setNeutralLayout(true);
        isHoverPaused = false;
        gsap.set(grid, { rotation: 0, scale: 1, y: 0 });
        gsap.set(".jewellery", { scale: 1, x: 0, y: 0, rotation: 0 });
        updateLeafOverflow(0);
        hideInfoPiecesImmediate();
      } else {
        applyPieceState(currentIndex, rawRotation);
        showInfoPieceImmediate(getPieceName(currentIndex));
      }

      refreshPauseUI();

      if (!isTouchPaused && !isHoverPaused && !isArrowHovered && !isArrowTemporarilyPaused) {
        if (isNeutralState) {
          if (!resumeNeutralSequence()) {
            startTopHighlightFromNeutral();
          }
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

    const isPointerOverAnyArrow = () =>
      [...prevButtons, ...nextButtons].some((button) => button.matches(":hover"));

    const usesTimedArrowResume = () =>
      window.innerWidth < 1024 || window.matchMedia("(hover: none)").matches;

    const stepPiece = (direction) => {
      const baseIndex = pendingIndex !== null ? pendingIndex : currentIndex;
      const nextIndex = (baseIndex + direction + pieceOrder.length) % pieceOrder.length;
      const shouldUseTimedResume = usesTimedArrowResume();
      const shouldKeepArrowHover = shouldUseTimedResume ? false : isPointerOverAnyArrow();

      clearManualArrowResume();
      clearAutoAdvance();
      isTouchPaused = false;
      isHoverPaused = false;
      isArrowHovered = shouldKeepArrowHover;
      isArrowTemporarilyPaused = shouldUseTimedResume;
      refreshPauseUI();

      animateToIndex(nextIndex, {
        direction,
        duration: MANUAL_NAV_DURATION,
        autoDelay: shouldUseTimedResume ? null : 1.2,
        forcePending: pendingIndex !== null,
      });

      if (!shouldUseTimedResume) {
        return;
      }

      manualArrowResumeCall = gsap.delayedCall(MANUAL_ARROW_PAUSE_DELAY, () => {
        manualArrowResumeCall = null;
        isArrowHovered = false;
        isArrowTemporarilyPaused = false;
        refreshPauseUI();
        resumeAutoplay();
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
    setNeutralLayout(true);

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

    gsap.ticker.add(watchNeutralSequence);

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
      gsap.ticker.remove(watchNeutralSequence);
      stopAllMotion();
    };
  }

  ScrollTrigger.matchMedia({
    "(max-width: 767px)": () => createJewelleryTimeline(getMetrics()),
    "(min-width: 768px) and (max-width: 1023px)": () => createJewelleryTimeline(getMetrics()),
    "(min-width: 1024px)": () => createJewelleryTimeline(getMetrics()),
  });
})();
