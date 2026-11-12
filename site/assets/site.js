/* PLAY/ARCHIVE — site.js
   Small, dependency-free enhancements. All content remains readable without it. */
(() => {
  "use strict";

  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const header = document.querySelector("[data-header]");
  const progress = document.querySelector("[data-progress]");
  const about = document.getElementById("about");
  const ticker = document.querySelector(".ticker-track");

  let ticking = false;
  let headerHeight = header ? header.offsetHeight : 0;

  const measure = () => {
    headerHeight = header ? header.offsetHeight : 0;
  };

  const paintPageState = () => {
    const y = window.scrollY || window.pageYOffset || 0;

    if (header) {
      header.classList.toggle("is-scrolled", y > 24);

      if (about) {
        const rect = about.getBoundingClientRect();
        const probe = headerHeight * 0.62;
        const onPaper = rect.top <= probe && rect.bottom > probe;
        header.classList.toggle("on-paper", onPaper);
      }
    }

    if (progress) {
      const max = root.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      progress.style.transform = `scaleX(${ratio.toFixed(4)})`;
    }
  };

  const requestPaint = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      paintPageState();
      ticking = false;
    });
  };

  if (header || progress || about) {
    paintPageState();
    window.addEventListener("scroll", requestPaint, { passive: true });
    window.addEventListener("resize", () => {
      measure();
      requestPaint();
    }, { passive: true });
    window.addEventListener("load", () => {
      measure();
      paintPageState();
    }, { once: true });
  }

  /* Reveal content on scroll, but only ever hide it after JS has armed it. */
  const revealItems = Array.from(document.querySelectorAll("[data-reveal]"));

  if (revealItems.length) {
    if (!("IntersectionObserver" in window) || reduceMotion.matches) {
      revealItems.forEach((el) => el.classList.add("is-visible"));
    } else {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

      revealItems.forEach((el) => {
        el.classList.add("reveal-armed");
        observer.observe(el);
      });

      // Anything already above the fold should not wait for a scroll gesture.
      window.requestAnimationFrame(() => {
        revealItems.forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
            el.classList.add("is-visible");
            observer.unobserve(el);
          }
        });
      });
    }
  }

  /* A soft light that follows the pointer across the hero. */
  const hero = document.querySelector("[data-hero]");
  const spot = document.querySelector("[data-hero-spot]");

  if (hero && spot && finePointer.matches) {
    let frame = 0;
    let targetX = 0;
    let targetY = 0;

    const applySpot = () => {
      frame = 0;
      spot.style.setProperty("--mx", `${targetX}%`);
      spot.style.setProperty("--my", `${targetY}%`);
    };

    hero.addEventListener("pointermove", (event) => {
      if (reduceMotion.matches) return;
      const rect = hero.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width) * 100;
      targetY = ((event.clientY - rect.top) / rect.height) * 100;
      spot.classList.add("is-active");
      if (!frame) frame = window.requestAnimationFrame(applySpot);
    }, { passive: true });

    hero.addEventListener("pointerleave", () => {
      spot.classList.remove("is-active");
    }, { passive: true });
  }

  /* Pause the marquee when it is off-screen; reduces needless work. */
  if (ticker && "IntersectionObserver" in window && !reduceMotion.matches) {
    const tickerObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        ticker.style.animationPlayState = entry.isIntersecting ? "running" : "paused";
      });
    }, { threshold: 0 });
    tickerObserver.observe(ticker);
  }

  /* Copy the contact address, with a fallback for non-secure local previews. */
  const copyButtons = document.querySelectorAll("[data-copy]");

  const legacyCopy = (text) => {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, area.value.length);

    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (error) {
      ok = false;
    }

    area.remove();
    return ok;
  };

  copyButtons.forEach((button) => {
    const feedback = button.parentElement
      ? button.parentElement.querySelector(".copy-feedback")
      : null;
    let resetTimer = 0;
    const originalLabel = button.textContent;

    const showFeedback = (message) => {
      if (!feedback) return;
      window.clearTimeout(resetTimer);
      feedback.textContent = message;
      button.textContent = "已复制";
      resetTimer = window.setTimeout(() => {
        feedback.textContent = "";
        button.textContent = originalLabel;
      }, 2600);
    };

    button.addEventListener("click", async () => {
      const text = button.getAttribute("data-copy") || "";
      if (!text) return;

      let copied = false;
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text);
          copied = true;
        } catch (error) {
          copied = false;
        }
      }

      if (!copied) copied = legacyCopy(text);

      if (copied) {
        showFeedback("已复制到剪贴板");
      } else if (feedback) {
        feedback.textContent = "复制失败，请手动选择邮箱";
      }
    });
  });
})();
