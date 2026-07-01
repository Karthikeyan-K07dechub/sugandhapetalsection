(function initCategorySlider() {
  const section = document.querySelector(".category-section");
  if (!section) return;

  const viewport = section.querySelector(".category-viewport");
  const track = section.querySelector(".category-track");
  const slides = gsap.utils.toArray(".category-slide", section);
  const prevBtn = section.querySelector(".cat-nav--prev");
  const nextBtn = section.querySelector(".cat-nav--next");

  let currentIndex = 0;
  let slidesPerView = 3;
  let gap = 20;
  let activeSlide = null;
  let isExpanded = false;

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
    const offset = currentIndex * (getSlideWidth() + gap);
    if (animate) {
      gsap.to(track, { x: -offset, duration: 0.65, ease: "power3.inOut" });
    } else {
      gsap.set(track, { x: -offset });
    }
  }

  function resetSlideWidths(animate = true) {
    const w = getSlideWidth();
    const tween = animate
      ? (el, val) => gsap.to(el, { width: val, duration: 0.55, ease: "power3.inOut" })
      : (el, val) => gsap.set(el, { width: val });

    slides.forEach((slide) => tween(slide, w));
  }

  function showDefaultContent(slide, animate = true) {
    const def = slide.querySelector(".slide-card--default");
    const exp = slide.querySelector(".slide-card--expanded");
    const inact = slide.querySelector(".slide-card--inactive");
    const dur = animate ? 0.35 : 0;

    gsap.to(def, { autoAlpha: 1, duration: dur, ease: "power2.out" });
    gsap.to(exp, { autoAlpha: 0, duration: dur * 0.8, ease: "power2.in" });
    gsap.to(inact, { autoAlpha: 0, duration: dur * 0.8, ease: "power2.in" });
  }

  function showExpandedContent(slide) {
    const def = slide.querySelector(".slide-card--default");
    const exp = slide.querySelector(".slide-card--expanded");
    const inact = slide.querySelector(".slide-card--inactive");
    const products = exp.querySelectorAll(".product-card");

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

    gsap.to(def, { autoAlpha: 0, duration: 0.22, ease: "power2.in" });
    gsap.to(exp, { autoAlpha: 0, duration: 0.2, ease: "power2.in" });
    gsap.to(inact, { autoAlpha: 1, duration: 0.35, ease: "power2.out", delay: 0.06 });
  }

  function collapseAll() {
    isExpanded = false;
    activeSlide = null;
    section.classList.remove("has-active");
    resetSlideWidths(true);
    slides.forEach((slide) => {
      slide.classList.remove("is-active", "is-inactive");
      showDefaultContent(slide);
    });
  }

  function expandSlide(slide) {
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
    currentIndex = Math.min(currentIndex, maxIndex());
    collapseAll();
    resetSlideWidths(animate);
    setTrackPosition(animate);
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex >= maxIndex();
  }

  slides.forEach((slide) => {
    slide.addEventListener("mouseenter", () => expandSlide(slide));
    slide.addEventListener("click", () => {
      if (window.innerWidth < 1024) {
        if (isExpanded && activeSlide === slide) collapseAll();
        else expandSlide(slide);
      }
    });
  });

  section.addEventListener("mouseleave", collapseAll);

  prevBtn.addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      collapseAll();
      setTrackPosition(true);
      prevBtn.disabled = currentIndex === 0;
      nextBtn.disabled = currentIndex >= maxIndex();
    }
  });

  nextBtn.addEventListener("click", () => {
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
