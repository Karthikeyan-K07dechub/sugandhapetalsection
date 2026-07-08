(function initCategorySlider() {
  if (typeof window.gsap === "undefined") return;

  const gsap = window.gsap;
  const section = document.querySelector(".category-section");
  if (!section) return;

  const viewport = section.querySelector(".category-viewport");
  const hoverBoundary = viewport;
  const track = section.querySelector(".category-track");
  const slides = gsap.utils.toArray(".category-slide", section);
  const prevBtn = section.querySelector(".cat-nav--prev");
  const nextBtn = section.querySelector(".cat-nav--next");

  let currentIndex = 0;
  let slidesPerView = 3;
  let gap = 20;
  let activeSlide = null;
  let isExpanded = false;
  let hoverLockActive = false;

  function usesTapLayout() {
    return window.innerWidth < 1024 || window.matchMedia("(hover: none)").matches;
  }

  function isFanMobileLayout() {
    return window.innerWidth <= 479;
  }

  function getWrappedIndex(index) {
    const total = slides.length;
    if (!total) return 0;
    return (index % total + total) % total;
  }

  function lockHoverUntilPointerLeaves() {
    hoverLockActive = true;
  }

  function releaseHoverLock() {
    hoverLockActive = false;
  }

  function isHoverLocked() {
    return hoverLockActive;
  }

  function collapseIfPointerOutside(clientX, clientY) {
    const rect = hoverBoundary.getBoundingClientRect();
    const isInside =
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom;

    if (!isInside && hoverLockActive) {
      releaseHoverLock();
    }

    if (!isExpanded || window.matchMedia("(hover: none)").matches) return;

    if (!isInside) {
      collapseAll();
    }
  }

  function ensureCollapsedWhenUnhovered() {
    if (!isExpanded || window.matchMedia("(hover: none)").matches || isFanMobileLayout()) return;
    if (!hoverBoundary.matches(":hover")) {
      collapseAll();
    }
  }

  function getSlidesPerView() {
    const w = window.innerWidth;
    if (w < 640) return 1;
    if (w < 1024) return 2;
    return 3;
  }

  function getSlideWidth() {
    const vw = viewport.offsetWidth;
    const count = slidesPerView;
    return (vw - gap * (count - 1)) / count;
  }

  function getExpandedWidths() {
    const vw = viewport.offsetWidth;
    if (slidesPerView === 1) {
      return { active: vw, inactive: vw };
    }
    if (slidesPerView === 2) {
      return { active: vw * 0.72, inactive: vw * 0.28 - gap };
    }
    return { active: vw * 0.68, inactive: (vw - vw * 0.68 - gap * 2) / 2 };
  }

  function maxIndex() {
    return Math.max(0, slides.length - slidesPerView);
  }

  function setTrackPosition(animate = true) {
    if (isFanMobileLayout()) {
      gsap.set(track, { x: 0 });
      return;
    }

    const offset = currentIndex * (getSlideWidth() + gap);
    if (animate) {
      gsap.to(track, { x: -offset, duration: 0.65, ease: "power3.inOut" });
    } else {
      gsap.set(track, { x: -offset });
    }
  }

  function resetSlideWidths(animate = true) {
    if (isFanMobileLayout()) {
      slides.forEach((slide) => gsap.set(slide, { clearProps: "width" }));
      return;
    }

    const w = getSlideWidth();
    const tween = animate
      ? (el, val) => gsap.to(el, { width: val, duration: 0.55, ease: "power3.inOut" })
      : (el, val) => gsap.set(el, { width: val });

    slides.forEach((slide) => tween(slide, w));
  }

  function stopContentTweens(slide) {
    const def = slide.querySelector(".slide-card--default");
    const exp = slide.querySelector(".slide-card--expanded");
    const inact = slide.querySelector(".slide-card--inactive");
    const products = exp.querySelectorAll(".product-card");

    gsap.killTweensOf([def, exp, inact]);
    gsap.killTweensOf(products);
  }

  function showDefaultContent(slide, animate = true) {
    const def = slide.querySelector(".slide-card--default");
    const exp = slide.querySelector(".slide-card--expanded");
    const inact = slide.querySelector(".slide-card--inactive");
    const dur = animate ? 0.35 : 0;

    stopContentTweens(slide);
    gsap.to(def, { autoAlpha: 1, duration: dur, ease: "power2.out" });
    gsap.to(exp, { autoAlpha: 0, duration: dur * 0.8, ease: "power2.in" });
    gsap.to(inact, { autoAlpha: 0, duration: dur * 0.8, ease: "power2.in" });
  }

  function showExpandedContent(slide) {
    const def = slide.querySelector(".slide-card--default");
    const exp = slide.querySelector(".slide-card--expanded");
    const inact = slide.querySelector(".slide-card--inactive");
    const products = exp.querySelectorAll(".product-card");

    stopContentTweens(slide);
    gsap.to(def, { autoAlpha: 0, duration: 0.25, ease: "power2.in" });
    gsap.to(inact, { autoAlpha: 0, duration: 0.2, ease: "power2.in" });
    gsap.to(exp, { autoAlpha: 1, duration: 0.4, ease: "power2.out", delay: 0.08 });
    gsap.fromTo(
      products,
      { autoAlpha: 0, y: 16 },
      { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.06, ease: "power2.out", delay: 0.18 }
    );
  }

  function showInactiveContent(slide) {
    const def = slide.querySelector(".slide-card--default");
    const exp = slide.querySelector(".slide-card--expanded");
    const inact = slide.querySelector(".slide-card--inactive");

    stopContentTweens(slide);
    gsap.to(def, { autoAlpha: 0, duration: 0.22, ease: "power2.in" });
    gsap.to(exp, { autoAlpha: 0, duration: 0.2, ease: "power2.in" });
    gsap.to(inact, { autoAlpha: 1, duration: 0.35, ease: "power2.out", delay: 0.06 });
  }

  function resetFanMobileClasses() {
    section.classList.remove("is-fan-mobile");
    slides.forEach((slide) => {
      slide.classList.remove("is-left", "is-right", "is-center", "is-hidden", "is-open");
    });
  }

  function renderFanMobile(animate = true) {
    if (!slides.length) return;

    section.classList.add("is-fan-mobile");
    currentIndex = getWrappedIndex(currentIndex);

    const centerSlide = slides[currentIndex];
    const leftIndex = slides.length > 2 ? getWrappedIndex(currentIndex - 1) : -1;
    const rightIndex = slides.length > 1 ? getWrappedIndex(currentIndex + 1) : -1;

    gsap.set(track, { x: 0 });

    slides.forEach((slide, index) => {
      slide.classList.remove("is-active", "is-inactive", "is-left", "is-right", "is-center", "is-hidden", "is-open");
      gsap.set(slide, { clearProps: "width" });

      if (index === currentIndex) {
        slide.classList.add("is-center");
        if (isExpanded) {
          slide.classList.add("is-open");
          showExpandedContent(slide);
        } else {
          showDefaultContent(slide, animate);
        }
        return;
      }

      showDefaultContent(slide, animate);

      if (!isExpanded && index === leftIndex) {
        slide.classList.add("is-left");
      } else if (!isExpanded && index === rightIndex) {
        slide.classList.add("is-right");
      } else {
        slide.classList.add("is-hidden");
      }
    });

    activeSlide = isExpanded ? centerSlide : null;
    prevBtn.disabled = false;
    nextBtn.disabled = false;
  }

  function collapseAll(animate = true) {
    isExpanded = false;
    activeSlide = null;
    section.classList.remove("has-active");

    if (isFanMobileLayout()) {
      renderFanMobile(animate);
      return;
    }

    resetFanMobileClasses();
    resetSlideWidths(animate);
    slides.forEach((slide) => {
      slide.classList.remove("is-active", "is-inactive");
      showDefaultContent(slide, animate);
    });
  }

  function expandSlide(slide) {
    if (isFanMobileLayout()) {
      currentIndex = slides.indexOf(slide);
      isExpanded = true;
      activeSlide = slide;
      section.classList.add("has-active");
      renderFanMobile(true);
      return;
    }

    if (isHoverLocked()) return;
    if (!usesTapLayout() && !hoverBoundary.matches(":hover") && window.matchMedia("(hover: hover)").matches) return;
    if (isExpanded && activeSlide === slide) return;

    const visibleStart = currentIndex;
    const visibleEnd = currentIndex + slidesPerView - 1;
    const slideIndex = slides.indexOf(slide);

    if (slideIndex < visibleStart || slideIndex > visibleEnd) return;

    isExpanded = true;
    activeSlide = slide;
    section.classList.add("has-active");

    const { active, inactive } = getExpandedWidths();
    const visibleSlides = slides.slice(visibleStart, visibleEnd + 1);

    visibleSlides.forEach((s) => {
      const w = s === slide ? active : inactive;
      gsap.to(s, { width: w, duration: 0.55, ease: "power3.inOut" });
      s.classList.toggle("is-active", s === slide);
      s.classList.toggle("is-inactive", s !== slide);

      if (s === slide) showExpandedContent(s);
      else showInactiveContent(s);
    });
  }

  function refreshLayout(animate = false) {
    slidesPerView = getSlidesPerView();
    gap = parseFloat(getComputedStyle(track).gap) || 20;
    releaseHoverLock();

    if (isFanMobileLayout()) {
      renderFanMobile(animate);
      return;
    }

    currentIndex = Math.min(currentIndex, maxIndex());
    resetFanMobileClasses();
    collapseAll();
    resetSlideWidths(animate);
    setTrackPosition(animate);
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex >= maxIndex();
  }

  function handleTapSlideClick(event, slide) {
    if (!usesTapLayout()) {
      return;
    }

    const exploreButton = event.target.closest(".explore-btn");
    if (exploreButton) {
      return;
    }

    event.preventDefault();

    if (isFanMobileLayout()) {
      const slideIndex = slides.indexOf(slide);
      const centerIndex = getWrappedIndex(currentIndex);
      const isCenterSlide = slideIndex === centerIndex;

      if (isCenterSlide && isExpanded && activeSlide === slide) {
        collapseAll();
        return;
      }

      expandSlide(slide);
      return;
    }

    if (isExpanded && activeSlide === slide) {
      collapseAll();
      return;
    }

    expandSlide(slide);
  }

  function handleSlideMouseEnter(slide) {
    if (usesTapLayout() || isFanMobileLayout()) {
      return;
    }

    expandSlide(slide);
  }

  slides.forEach((slide) => {
    slide.addEventListener("mouseenter", () => handleSlideMouseEnter(slide));
    slide.addEventListener("click", (event) => handleTapSlideClick(event, slide));
  });

  const handleDocumentPress = (event) => {
    if (!usesTapLayout() || !isExpanded) return;
    if (section.contains(event.target)) return;
    collapseAll();
  };

  ["pointerdown", "touchstart", "mousedown"].forEach((eventName) => {
    document.addEventListener(eventName, handleDocumentPress);
  });

  section.addEventListener("click", (event) => {
    const actionLink = event.target.closest(".explore-btn");
    if (!actionLink) {
      return;
    }
  });

  hoverBoundary.addEventListener("mouseleave", () => {
    if (isFanMobileLayout()) {
      return;
    }

    releaseHoverLock();
    requestAnimationFrame(() => {
      if (!hoverBoundary.matches(":hover")) {
        collapseAll();
      }
    });
  });

  const handleDocumentMouseMove = (event) => {
    if (isFanMobileLayout()) {
      return;
    }
    collapseIfPointerOutside(event.clientX, event.clientY);
  };

  document.addEventListener("mousemove", handleDocumentMouseMove);
  gsap.ticker.add(ensureCollapsedWhenUnhovered);

  prevBtn.addEventListener("click", () => {
    if (isFanMobileLayout()) {
      currentIndex = getWrappedIndex(currentIndex - 1);
      if (isExpanded) {
        activeSlide = slides[currentIndex];
        section.classList.add("has-active");
      }
      renderFanMobile(true);
      return;
    }

    if (currentIndex > 0) {
      currentIndex--;
      collapseAll();
      setTrackPosition(true);
      prevBtn.disabled = currentIndex === 0;
      nextBtn.disabled = currentIndex >= maxIndex();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (isFanMobileLayout()) {
      currentIndex = getWrappedIndex(currentIndex + 1);
      if (isExpanded) {
        activeSlide = slides[currentIndex];
        section.classList.add("has-active");
      }
      renderFanMobile(true);
      return;
    }

    if (currentIndex < maxIndex()) {
      currentIndex++;
      collapseAll();
      setTrackPosition(true);
      prevBtn.disabled = currentIndex === 0;
      nextBtn.disabled = currentIndex >= maxIndex();
    }
  });

  slides.forEach((slide) => {
    gsap.set(slide.querySelector(".slide-card--expanded"), { autoAlpha: 0 });
    gsap.set(slide.querySelector(".slide-card--inactive"), { autoAlpha: 0 });
  });

  window.addEventListener("resize", () => refreshLayout(false));
  refreshLayout(false);
})();
