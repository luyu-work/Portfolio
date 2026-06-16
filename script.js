const EMAIL_ADDRESS = "lubu.lanfen@gmail.com";
const MAIL_ICON_PATH = "./src/icons/mail.svg";
const SUCCESS_ICON_PATH = "./src/icons/success.svg";
const MOBILE_PADDING_BREAKPOINT = 600;
const PAGE_ANCHOR_BREAKPOINT = 960;
const PAGE_ANCHOR_SIDE_OFFSET = 40;
const PAGE_ANCHOR_INITIAL_TOP = 177;
const PAGE_ANCHOR_STICKY_TOP = 40;
const NON_BREAKING_SPACE = "\u00A0";
const NON_BREAKING_WORDS = [
  "а",
  "без",
  "б",
  "бы",
  "в",
  "во",
  "да",
  "для",
  "до",
  "же",
  "за",
  "и",
  "из",
  "изо",
  "или",
  "к",
  "ко",
  "ли",
  "на",
  "над",
  "не",
  "ни",
  "но",
  "о",
  "об",
  "обо",
  "от",
  "по",
  "под",
  "при",
  "про",
  "с",
  "со",
  "у",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createRafScheduler = (callback) => {
  let isScheduled = false;

  return () => {
    if (isScheduled) return;

    isScheduled = true;
    requestAnimationFrame(() => {
      isScheduled = false;
      callback();
    });
  };
};

let pageLifecycle = new AbortController();

const resetPageLifecycle = () => {
  pageLifecycle.abort();
  pageLifecycle = new AbortController();
  return pageLifecycle.signal;
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const nonBreakingWordPattern = new RegExp(
  `(^|[\\s([{"«])(${NON_BREAKING_WORDS.map(escapeRegExp).join("|")})\\s+(?=\\S)`,
  "giu"
);

const handleInitialHashScroll = () => {
  const { hash } = window.location;
  if (!hash) return;

  let targetElement = document.getElementById(hash.slice(1));

  if (!targetElement) {
    try {
      targetElement = document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch (error) {
      console.error(error);
    }
  }

  if (!targetElement) return;

  document.body.classList.add("no-anim", "no-transition");

  setTimeout(() => {
    targetElement.scrollIntoView({ behavior: "auto", block: "start" });
  }, 0);

  setTimeout(() => {
    document.body.classList.remove("no-transition");
  }, 100);
};

const easeInOutCubic = (t, b, c, d) => {
  let time = t / (d / 2);
  if (time < 1) return (c / 2) * time * time * time + b;
  time -= 2;
  return (c / 2) * (time * time * time + 2) + b;
};

const smoothScrollToY = (targetY, duration = 360) => {
  const safeTargetY = Math.max(targetY, 0);
  const start = window.scrollY;
  const distance = safeTargetY - start;

  if (
    Math.abs(distance) < 1 ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    window.scrollTo(0, safeTargetY);
    return;
  }

  let startTime = 0;

  const step = (timestamp) => {
    if (!startTime) startTime = timestamp;

    const progress = Math.min(timestamp - startTime, duration);
    window.scrollTo(0, easeInOutCubic(progress, start, distance, duration));

    if (progress < duration) {
      requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
};

function setupCopyEmailButton() {
  const copyBtn = document.getElementById("copy-email");
  if (!copyBtn) return;

  const textEl =
    copyBtn.querySelector(".link-button-text") ||
    copyBtn.querySelector(".contact-button__text");
  const iconEl = copyBtn.querySelector(".link-button-icon img");
  if (!textEl || !iconEl) return;

  const iconPreloadCache = new Map();
  let isAnimating = false;

  const originalText = (textEl.textContent || EMAIL_ADDRESS).trim();

  const preloadIcon = (src) => {
    if (!src) {
      return Promise.resolve("");
    }

    if (iconPreloadCache.has(src)) {
      return iconPreloadCache.get(src);
    }

    const preloadPromise = new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(src);
      image.onerror = reject;
      image.src = src;
    }).catch((error) => {
      iconPreloadCache.delete(src);
      console.error(error);
      return "";
    });

    iconPreloadCache.set(src, preloadPromise);
    return preloadPromise;
  };

  void preloadIcon(MAIL_ICON_PATH);
  void preloadIcon(SUCCESS_ICON_PATH);

  const animateButtonState = async (text, iconPath) => {
    textEl.classList.add("slide-out-right");
    iconEl.classList.add("zoom-out");
    await Promise.all([sleep(300), preloadIcon(iconPath)]);

    textEl.textContent = text;
    if (iconEl.getAttribute("src") !== iconPath) {
      iconEl.src = iconPath;
    }
    textEl.classList.remove("slide-out-right");
    iconEl.classList.remove("zoom-out");
    textEl.classList.add("slide-in-left");
    iconEl.classList.add("zoom-in");
    await sleep(300);

    textEl.classList.remove("slide-in-left");
    iconEl.classList.remove("zoom-in");
  };

  copyBtn.addEventListener("click", async (event) => {
    event.preventDefault();

    if (isAnimating) return;
    isAnimating = true;

    try {
      await navigator.clipboard.writeText(EMAIL_ADDRESS);
    } catch (error) {
      console.error(error);
    }

    try {
      await animateButtonState(
        "\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u043e",
        SUCCESS_ICON_PATH
      );
      await sleep(1000);
      await animateButtonState(originalText, MAIL_ICON_PATH);
    } finally {
      isAnimating = false;
    }
  });
}

function setupNonBreakingShortWords() {
  if (!document.body.classList.contains("case-study")) return;

  const textSelectors = [
    ".story-content__description",
    ".story-section__title",
    ".story-section__description",
    ".job-stories-list__text",
    ".job-stories-list__caption",
    ".image-block__caption",
  ];

  const walkerFilter = {
    acceptNode(node) {
      if (!node.textContent || !node.textContent.trim()) {
        return NodeFilter.FILTER_REJECT;
      }

      if (!(node.parentElement instanceof HTMLElement)) {
        return NodeFilter.FILTER_REJECT;
      }

      if (
        node.parentElement.closest(
          "script, style, noscript, .back-button, .link-button-text"
        )
      ) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  };

  document.querySelectorAll(textSelectors.join(", ")).forEach((element) => {
    const textWalker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      walkerFilter
    );

    let currentNode = textWalker.nextNode();

    while (currentNode) {
      currentNode.textContent = currentNode.textContent.replace(
        nonBreakingWordPattern,
        (_, prefix, word) => `${prefix}${word}${NON_BREAKING_SPACE}`
      );
      currentNode = textWalker.nextNode();
    }
  });
}

function setupWorkListToggles() {
  const workList = document.querySelector(".work-list");
  if (!workList) return;

  const syncItemState = (item) => {
    item.classList.toggle("expanded", item.getAttribute("collapsed") === "no");
  };

  workList.querySelectorAll(".work-list__item").forEach(syncItemState);

  workList.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest(".work-list__company-link")) return;

    const header = event.target.closest(".work-list__item-header");
    if (!header) return;

    const item = header.closest(".work-list__item");
    if (!item) return;

    const isExpanded = item.getAttribute("collapsed") === "no";
    item.setAttribute("collapsed", isExpanded ? "yes" : "no");
    item.classList.toggle("expanded", !isExpanded);
  });
}

function setupScrollToTop() {
  const scrollBtn = document.querySelector(".scroll-to-top");
  const actionBlock = document.querySelector(".action-block");
  const mainContainer = document.querySelector(".main");
  const CONTRAST_SAMPLE_CANVAS_SIZE = 12;
  const CONTRAST_SAMPLE_AREA_SIZE = 24;

  if (!scrollBtn || !actionBlock || !mainContainer) return;

  const contrastCanvas = document.createElement("canvas");
  const contrastContext = contrastCanvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (contrastContext) {
    contrastCanvas.width = CONTRAST_SAMPLE_CANVAS_SIZE;
    contrastCanvas.height = CONTRAST_SAMPLE_CANVAS_SIZE;
  }

  const isIOSWebKit = () => {
    const userAgent = navigator.userAgent || "";
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isWebKitBrowser =
      /WebKit/i.test(userAgent) &&
      !/CriOS|Chrome|EdgiOS|Firefox|FxiOS|OPiOS/i.test(userAgent);

    return isIOSDevice && isWebKitBrowser;
  };

  const updateScrollButtonMode = () => {
    const supportsBlendMode =
      typeof CSS !== "undefined" &&
      CSS.supports?.("mix-blend-mode", "difference");
    const useFallbackMode =
      !supportsBlendMode ||
      isIOSWebKit() ||
      window.innerWidth < MOBILE_PADDING_BREAKPOINT;

    scrollBtn.classList.toggle("scroll-to-top--fallback", useFallbackMode);
  };

  const getUnderlyingMediaAtPoint = (clientX, clientY) => {
    const previousPointerEvents = scrollBtn.style.pointerEvents;
    scrollBtn.style.pointerEvents = "none";

    const elements = document.elementsFromPoint(clientX, clientY);

    scrollBtn.style.pointerEvents = previousPointerEvents;

    for (const element of elements) {
      if (!(element instanceof Element)) continue;
      if (element === actionBlock || actionBlock.contains(element)) continue;

      if (
        element.matches(".preview-block__image, .image-block__image, .image-block__video")
      ) {
        return element;
      }
    }

    return null;
  };

  const getMediaLuminanceAtPoint = (media, clientX, clientY) => {
    if (!contrastContext) return null;

    const mediaRect = media.getBoundingClientRect();
    if (!mediaRect.width || !mediaRect.height) return null;

    const offsetX = clientX - mediaRect.left;
    const offsetY = clientY - mediaRect.top;

    if (
      offsetX < 0 ||
      offsetY < 0 ||
      offsetX > mediaRect.width ||
      offsetY > mediaRect.height
    ) {
      return null;
    }

    let sourceWidth = 0;
    let sourceHeight = 0;

    if (media instanceof HTMLImageElement) {
      if (!media.complete || !media.naturalWidth || !media.naturalHeight) {
        return null;
      }

      sourceWidth = media.naturalWidth;
      sourceHeight = media.naturalHeight;
    } else if (media instanceof HTMLVideoElement) {
      if (!media.videoWidth || !media.videoHeight || media.readyState < 2) {
        return null;
      }

      sourceWidth = media.videoWidth;
      sourceHeight = media.videoHeight;
    } else {
      return null;
    }

    const sourceCenterX = (offsetX / mediaRect.width) * sourceWidth;
    const sourceCenterY = (offsetY / mediaRect.height) * sourceHeight;
    const sourceSampleWidth = Math.min(
      sourceWidth,
      Math.max(
        1,
        Math.round((CONTRAST_SAMPLE_AREA_SIZE / mediaRect.width) * sourceWidth)
      )
    );
    const sourceSampleHeight = Math.min(
      sourceHeight,
      Math.max(
        1,
        Math.round((CONTRAST_SAMPLE_AREA_SIZE / mediaRect.height) * sourceHeight)
      )
    );
    const sourceX = Math.max(
      0,
      Math.min(sourceWidth - sourceSampleWidth, sourceCenterX - sourceSampleWidth / 2)
    );
    const sourceY = Math.max(
      0,
      Math.min(sourceHeight - sourceSampleHeight, sourceCenterY - sourceSampleHeight / 2)
    );

    try {
      contrastContext.clearRect(
        0,
        0,
        CONTRAST_SAMPLE_CANVAS_SIZE,
        CONTRAST_SAMPLE_CANVAS_SIZE
      );
      contrastContext.drawImage(
        media,
        sourceX,
        sourceY,
        sourceSampleWidth,
        sourceSampleHeight,
        0,
        0,
        CONTRAST_SAMPLE_CANVAS_SIZE,
        CONTRAST_SAMPLE_CANVAS_SIZE
      );

      const imageData = contrastContext.getImageData(
        0,
        0,
        CONTRAST_SAMPLE_CANVAS_SIZE,
        CONTRAST_SAMPLE_CANVAS_SIZE
      ).data;

      let weightedLuminanceSum = 0;
      let alphaSum = 0;

      for (let index = 0; index < imageData.length; index += 4) {
        const red = imageData[index];
        const green = imageData[index + 1];
        const blue = imageData[index + 2];
        const alpha = imageData[index + 3] / 255;
        const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

        weightedLuminanceSum += luminance * alpha;
        alphaSum += alpha;
      }

      if (!alphaSum) return null;

      return weightedLuminanceSum / alphaSum;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const updateScrollButtonContrast = () => {
    const isFallbackMode = scrollBtn.classList.contains("scroll-to-top--fallback");
    const isVisible =
      scrollBtn.classList.contains("visible") && scrollBtn.classList.contains("fixed");

    if (!isFallbackMode || !isVisible) {
      scrollBtn.classList.remove("scroll-to-top--dark-foreground");
      return;
    }

    const buttonRect = scrollBtn.getBoundingClientRect();
    const samplePoints = [0.2, 0.4, 0.6, 0.8].flatMap((xRatio) =>
      [0.3, 0.5, 0.7].map((yRatio) => ({
        x: buttonRect.left + buttonRect.width * xRatio,
        y: buttonRect.top + buttonRect.height * yRatio,
      }))
    );

    const luminanceValues = samplePoints
      .map(({ x, y }) => {
        const media = getUnderlyingMediaAtPoint(x, y);
        if (!media) return null;

        return getMediaLuminanceAtPoint(media, x, y);
      })
      .filter((value) => typeof value === "number");

    if (!luminanceValues.length) {
      scrollBtn.classList.remove("scroll-to-top--dark-foreground");
      return;
    }

    const sortedLuminanceValues = [...luminanceValues].sort((a, b) => a - b);
    const medianLuminance =
      sortedLuminanceValues[Math.floor(sortedLuminanceValues.length / 2)];
    const brightSamplesCount = luminanceValues.filter((value) => value >= 210).length;
    const brightSamplesRatio = brightSamplesCount / luminanceValues.length;
    const averageLuminance =
      luminanceValues.reduce((sum, value) => sum + value, 0) /
      luminanceValues.length;

    scrollBtn.classList.toggle(
      "scroll-to-top--dark-foreground",
      brightSamplesRatio >= 0.6 && medianLuminance >= 185 && averageLuminance >= 180
    );
  };

  scrollBtn.addEventListener("click", () => {
    smoothScrollToY(0);
  });

  const updateStickyPosition = () => {
    const shouldFixButton =
      actionBlock.getBoundingClientRect().top > window.innerHeight - 80;

    scrollBtn.classList.toggle("fixed", shouldFixButton);

    if (shouldFixButton) {
      const { right } = mainContainer.getBoundingClientRect();
      scrollBtn.style.left = `${right - 40 - scrollBtn.offsetWidth}px`;
      scrollBtn.style.right = "auto";
    } else {
      scrollBtn.style.left = "";
      scrollBtn.style.right = "";
    }

    scrollBtn.classList.toggle("visible", window.scrollY >= 200);
    updateScrollButtonContrast();
  };

  const requestStickyUpdate = createRafScheduler(updateStickyPosition);

  window.addEventListener("scroll", requestStickyUpdate, {
    passive: true,
    signal: pageLifecycle.signal,
  });
  window.addEventListener(
    "resize",
    () => {
      updateScrollButtonMode();
      requestStickyUpdate();
    },
    { signal: pageLifecycle.signal }
  );

  updateScrollButtonMode();
  requestStickyUpdate();
}

function setupPageAnchorNav() {
  const nav = document.querySelector("[data-anchor-nav]");
  const mainContainer = document.querySelector(".main");
  if (!nav || !mainContainer) return;

  const initialTop =
    Number.parseInt(nav.getAttribute("data-anchor-initial-top") ?? "", 10) ||
    PAGE_ANCHOR_INITIAL_TOP;

  const links = Array.from(nav.querySelectorAll("[data-anchor-link]"));
  const activeLine = nav.querySelector(".page-anchor__active-line");
  const items = links
    .map((link) => {
      const targetId = link.getAttribute("data-target-id");
      if (!targetId) return null;

      const target = document.getElementById(targetId);
      if (!target) return null;

      return { link, target, targetId };
    })
    .filter(Boolean);

  if (!items.length) return;

  const setActiveItem = (nextLink) => {
    if (!nextLink) return;

    links.forEach((link) => {
      link.classList.toggle("page-anchor__item--active", link === nextLink);
    });

    if (!activeLine) return;

    activeLine.style.transform = `translateY(${nextLink.offsetTop}px)`;
    activeLine.style.height = `${nextLink.offsetHeight}px`;
  };

  const getCurrentItem = () => {
    // === Original logic (unchanged) for ALL items except the very last one ===
    const threshold = window.scrollY + PAGE_ANCHOR_STICKY_TOP + 80;
    let currentItem = items[0];

    items.forEach((item) => {
      if (item.target.offsetTop <= threshold) {
        currentItem = item;
      }
    });

    // === Special override ONLY for the last navigation item (e.g. "Итог" / #ac-result) ===
    // Activate the last item as soon as its заголовок reaches the center of the screen.
    // This allows the final short section to become active even when its container top
    // never reaches the normal top threshold because there's not enough content below it.
    if (items.length > 1) {
      const lastItem = items[items.length - 1];
      const lastTarget = lastItem.target;

      // Use the actual heading element inside the last section for "in the center of the screen" check
      const lastHeading =
        lastTarget.querySelector(".story-section__title, .story-content__title, h1, h2, h3") ||
        lastTarget;

      const centerThreshold = window.scrollY + (window.innerHeight || 800) / 2;

      if (lastHeading.offsetTop <= centerThreshold) {
        currentItem = lastItem;
      }
    }

    return currentItem;
  };

  const updateAnchorPosition = () => {
    if (window.innerWidth < PAGE_ANCHOR_BREAKPOINT) {
      nav.style.removeProperty("left");
      nav.style.removeProperty("top");
      return;
    }

    const { right } = mainContainer.getBoundingClientRect();
    nav.style.left = `${Math.round(right + PAGE_ANCHOR_SIDE_OFFSET)}px`;
    nav.style.top = `${Math.max(
      PAGE_ANCHOR_STICKY_TOP,
      initialTop - window.scrollY
    )}px`;
  };

  const updateAnchorNav = () => {
    updateAnchorPosition();
    setActiveItem(getCurrentItem().link);
  };

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();

      const targetId = link.getAttribute("data-target-id");
      if (!targetId) return;

      const target = document.getElementById(targetId);
      if (!target) return;

      const targetY =
        target.getBoundingClientRect().top +
        window.scrollY -
        PAGE_ANCHOR_STICKY_TOP;

      smoothScrollToY(targetY);
      setActiveItem(link);

      if (window.location.hash !== `#${targetId}`) {
        window.history.replaceState(null, "", `#${targetId}`);
      }
    });
  });

  const requestAnchorUpdate = createRafScheduler(updateAnchorNav);

  window.addEventListener("scroll", requestAnchorUpdate, {
    passive: true,
    signal: pageLifecycle.signal,
  });
  window.addEventListener("resize", requestAnchorUpdate, {
    signal: pageLifecycle.signal,
  });

  requestAnimationFrame(requestAnchorUpdate);
  setTimeout(requestAnchorUpdate, 0);
}

function getResultMobileSrc(src) {
  if (!src) return src;

  if (src.includes("@4x")) {
    return src.replace("@4x", "-mobile@4x");
  }

  return src.replace(/\.png$/i, "-mobile.png");
}

function setupResultImageResponsive() {
  // Special handling for ".image-block.result" (d-result in agreement-card, s-result in story-builder).
  // On screens < 600px we serve mobile-optimized assets for both the visible preview and the full-size modal.
  const resultBlock = document.querySelector(".image-block.result");
  if (!resultBlock) return;

  const img = resultBlock.querySelector(".image-block__image");
  if (!img) return;

  const DESKTOP_SMALL_SRC = img.getAttribute("src");
  const DESKTOP_FULL_SRC = resultBlock.getAttribute("data-full-src");
  if (!DESKTOP_SMALL_SRC || !DESKTOP_FULL_SRC) return;

  const MOBILE_SMALL_SRC = getResultMobileSrc(DESKTOP_SMALL_SRC);
  const MOBILE_FULL_SRC = getResultMobileSrc(DESKTOP_FULL_SRC);

  let lastIsMobile = null;

  const updateSources = () => {
    const isMobile = window.innerWidth < MOBILE_PADDING_BREAKPOINT;
    if (lastIsMobile === isMobile) return;

    const smallSrc = isMobile ? MOBILE_SMALL_SRC : DESKTOP_SMALL_SRC;
    const fullSrc = isMobile ? MOBILE_FULL_SRC : DESKTOP_FULL_SRC;

    // Swap the visible thumbnail image
    if (img.getAttribute("src") !== smallSrc) {
      img.src = smallSrc;
    }

    // Swap the data-full-src so that clicking to open the full modal loads the correct high-res version
    if (resultBlock.getAttribute("data-full-src") !== fullSrc) {
      resultBlock.setAttribute("data-full-src", fullSrc);
    }

    lastIsMobile = isMobile;
  };

  // Initial setup based on current viewport
  updateSources();

  // Keep in sync when the window is resized across the breakpoint
  let resizeScheduled = false;
  window.addEventListener(
    "resize",
    () => {
      if (resizeScheduled) return;
      resizeScheduled = true;
      requestAnimationFrame(() => {
        resizeScheduled = false;
        updateSources();
      });
    },
    { signal: pageLifecycle.signal }
  );
}

function getOrCreateImageModal() {
  let modal = document.querySelector(".image-modal");

  if (modal) {
    return modal;
  }

  modal = document.createElement("div");
  modal.className = "image-modal";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="image-modal__overlay" aria-hidden="true"></div>
    <img class="image-modal__image" alt="" />
    <video class="image-modal__video" controls playsinline preload="metadata"></video>
    <button class="image-modal__close" type="button" aria-label="Закрыть медиа">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 18L12 12M12 12L6 6M12 12L18 6M12 12L6 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  `;

  document.body.append(modal);
  return modal;
}

let previewZoomModalReady = false;

const IMAGE_MODAL_STATE_CLASSES = [
  "is-active",
  "image-modal--image",
  "image-modal--video",
  "image-modal--zoom-enabled",
  "image-modal--zoomed",
];

const clearImageModalMedia = (modalImage, modalVideo) => {
  if (modalImage) {
    modalImage.removeAttribute("src");
    delete modalImage.dataset.fullSrcTarget;
    modalImage.style.width = "";
    modalImage.style.height = "";
    modalImage.style.maxWidth = "";
    modalImage.style.maxHeight = "";
    modalImage.style.transform = "";
  }

  if (modalVideo) {
    modalVideo.pause();
    modalVideo.removeAttribute("src");
    modalVideo.load();
  }
};

const closeImageModalElement = (modal, { blurActive = false } = {}) => {
  if (!modal) return;

  if (blurActive && modal.contains(document.activeElement)) {
    document.activeElement.blur();
  }

  modal.classList.remove(...IMAGE_MODAL_STATE_CLASSES);
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("image-modal-open");
  document.documentElement.classList.remove("image-modal-open");
  document.body.style.removeProperty("padding-right");
  clearImageModalMedia(
    modal.querySelector(".image-modal__image"),
    modal.querySelector(".image-modal__video")
  );
};

function setupPreviewZoom() {
  const zoomTriggers = document.querySelectorAll(".preview-block, .image-block");
  if (!zoomTriggers.length && !previewZoomModalReady) return;

  const modal = getOrCreateImageModal();
  const modalImage = modal.querySelector(".image-modal__image");
  const modalVideo = modal.querySelector(".image-modal__video");
  const modalOverlay = modal.querySelector(".image-modal__overlay");
  const modalClose = modal.querySelector(".image-modal__close");

  if (!modalImage || !modalVideo || !modalOverlay || !modalClose) {
    return;
  }

  const MAX_MODAL_IMAGE_SCALE = 4;
  const MODAL_IMAGE_PRELOAD_ROOT_MARGIN = "800px 0px";
  const zoomState = {
    scale: 1,
    translateX: 0,
    translateY: 0,
    pinchStartDistance: 0,
    pinchStartScale: 1,
    pinchStartTranslateX: 0,
    pinchStartTranslateY: 0,
    pinchStartMidpointX: 0,
    pinchStartMidpointY: 0,
    panStartX: 0,
    panStartY: 0,
    panStartTranslateX: 0,
    panStartTranslateY: 0,
  };

  const getActiveModalMedia = () =>
    modal.classList.contains("image-modal--video") ? modalVideo : modalImage;

  const prefersReducedData = () => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return Boolean(connection?.saveData);
  };

  const isMobileImageZoomEnabled = () =>
    window.innerWidth < MOBILE_PADDING_BREAKPOINT &&
    modal.classList.contains("image-modal--image");

  const imagePreloadCache = new Map();

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const getTouchDistance = (firstTouch, secondTouch) =>
    Math.hypot(
      secondTouch.clientX - firstTouch.clientX,
      secondTouch.clientY - firstTouch.clientY
    );

  const getTouchMidpoint = (firstTouch, secondTouch) => ({
    x: (firstTouch.clientX + secondTouch.clientX) / 2,
    y: (firstTouch.clientY + secondTouch.clientY) / 2,
  });

  const clampModalImageTranslation = () => {
    if (!isMobileImageZoomEnabled()) {
      zoomState.translateX = 0;
      zoomState.translateY = 0;
      return;
    }

    const modalStyles = window.getComputedStyle(modal);
    const availableWidth =
      modal.clientWidth -
      Number.parseFloat(modalStyles.paddingLeft) -
      Number.parseFloat(modalStyles.paddingRight);
    const availableHeight =
      modal.clientHeight -
      Number.parseFloat(modalStyles.paddingTop) -
      Number.parseFloat(modalStyles.paddingBottom);
    const scaledWidth = modalImage.offsetWidth * zoomState.scale;
    const scaledHeight = modalImage.offsetHeight * zoomState.scale;
    const maxTranslateX = Math.max((scaledWidth - availableWidth) / 2, 0);
    const maxTranslateY = Math.max((scaledHeight - availableHeight) / 2, 0);

    zoomState.translateX = clamp(
      zoomState.translateX,
      -maxTranslateX,
      maxTranslateX
    );
    zoomState.translateY = clamp(
      zoomState.translateY,
      -maxTranslateY,
      maxTranslateY
    );
  };

  const applyModalImageZoom = () => {
    const isZoomEnabled = isMobileImageZoomEnabled();
    const isZoomed = isZoomEnabled && zoomState.scale > 1;

    modal.classList.toggle("image-modal--zoom-enabled", isZoomEnabled);
    modal.classList.toggle("image-modal--zoomed", isZoomed);

    if (!isZoomEnabled) {
      modalImage.style.transform = "";
      modalImage.style.width = '';
      modalImage.style.height = '';
      modalImage.style.maxWidth = '';
      modalImage.style.maxHeight = '';
      return;
    }

    clampModalImageTranslation();
    modalImage.style.transform = `translate3d(${zoomState.translateX}px, ${zoomState.translateY}px, 0) scale(${zoomState.scale})`;
  };

  const resetModalImageZoom = () => {
    zoomState.scale = 1;
    zoomState.translateX = 0;
    zoomState.translateY = 0;
    zoomState.pinchStartDistance = 0;
    zoomState.pinchStartScale = 1;
    zoomState.pinchStartTranslateX = 0;
    zoomState.pinchStartTranslateY = 0;
    zoomState.pinchStartMidpointX = 0;
    zoomState.pinchStartMidpointY = 0;
    zoomState.panStartX = 0;
    zoomState.panStartY = 0;
    zoomState.panStartTranslateX = 0;
    zoomState.panStartTranslateY = 0;
    applyModalImageZoom();
  };

  const resetModalClosePosition = () => {
    modalClose.classList.remove("is-ready");
    modalClose.style.removeProperty("top");
    modalClose.style.removeProperty("left");
    modalClose.style.removeProperty("right");
  };

  const updateModalClosePosition = () => {
    if (!modal.classList.contains("is-active")) {
      resetModalClosePosition();
      return;
    }

    if (window.innerWidth < MOBILE_PADDING_BREAKPOINT) {
      modalClose.style.removeProperty("top");
      modalClose.style.removeProperty("left");
      modalClose.style.removeProperty("right");
      modalClose.classList.add("is-ready");
      return;
    }

    const activeMedia = getActiveModalMedia();

    if (!activeMedia.getAttribute("src")) {
      resetModalClosePosition();
      return;
    }

    const rect = activeMedia.getBoundingClientRect();
    if (!rect.width && !rect.height) {
      resetModalClosePosition();
      return;
    }

    const desiredLeft = rect.right + 8;
    const maxLeft = window.innerWidth - 16 - modalClose.offsetWidth;

    modalClose.style.removeProperty("right");
    modalClose.style.top = `${rect.top}px`;
    modalClose.style.left = `${Math.min(desiredLeft, maxLeft)}px`;
    modalClose.classList.add("is-ready");
  };

  const getTriggerType = (trigger) =>
    trigger.classList.contains("video") || Boolean(trigger.querySelector("video"))
      ? "video"
      : "image";

  const getTriggerPreviewSrc = (trigger) =>
    trigger.querySelector("img")?.getAttribute("src") || "";

  const getTriggerFullSrc = (trigger) =>
    trigger.getAttribute("data-full-src") ||
    trigger.getAttribute("src") ||
    trigger.querySelector("video, img")?.getAttribute("src");

  const preloadImageAsset = (src, fetchPriority = "low") => {
    if (!src) {
      return Promise.resolve("");
    }

    if (imagePreloadCache.has(src)) {
      return imagePreloadCache.get(src);
    }

    const preloadPromise = new Promise((resolve, reject) => {
      const preloader = new Image();
      preloader.decoding = "async";
      preloader.fetchPriority = fetchPriority;
      preloader.onload = () => resolve(src);
      preloader.onerror = reject;
      preloader.src = src;
    }).catch((error) => {
      imagePreloadCache.delete(src);
      console.error(error);
      return "";
    });

    imagePreloadCache.set(src, preloadPromise);
    return preloadPromise;
  };

  const swapModalImageToFullRes = async (fullSrc) => {
    if (!fullSrc) return;

    const loadedSrc = await preloadImageAsset(fullSrc, "high");
    if (!loadedSrc) return;

    if (
      !modal.classList.contains("is-active") ||
      !modal.classList.contains("image-modal--image")
    ) {
      return;
    }

    // Guard: if meanwhile another image was opened (different full target set),
    // don't overwrite it with a stale upgrade.
    const currentTarget = modalImage.dataset.fullSrcTarget;
    if (currentTarget && currentTarget !== fullSrc) {
      return;
    }

    if (modalImage.getAttribute("src") !== fullSrc) {
      modalImage.src = fullSrc;
      // Ensure the target is recorded as the high-res one (helps with mobile zoom state and guards)
      modalImage.dataset.fullSrcTarget = fullSrc;
    }
  };

  const primeTriggerFullImage = (trigger, fetchPriority = "low") => {
    if (getTriggerType(trigger) !== "image") return;

    const fullSrc = getTriggerFullSrc(trigger);
    const previewSrc = getTriggerPreviewSrc(trigger);

    if (!fullSrc || fullSrc === previewSrc) return;
    void preloadImageAsset(fullSrc, fetchPriority);
  };

  const openModal = (trigger) => {
    const fullSrc = getTriggerFullSrc(trigger);
    if (!fullSrc) return;

    const isVideo = getTriggerType(trigger) === "video";
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.paddingRight = `${Math.max(scrollbarWidth, 0)}px`;
    modal.classList.remove("image-modal--image", "image-modal--video");
    resetModalImageZoom();
    resetModalClosePosition();

    if (isVideo) {
      modalVideo.src = fullSrc;
      modalVideo.currentTime = 0;
      modal.classList.add("image-modal--video");
      void modalVideo.play().catch(() => {});
    } else {
      const previewSrc = getTriggerPreviewSrc(trigger);
      modalImage.dataset.fullSrcTarget = fullSrc;
      modalImage.src = previewSrc || fullSrc;
      modal.classList.add("image-modal--image");
      // Always upgrade to the high-res version from data-full-src (the @4x or mobile@4x).
      // The relaxed guard in swapModalImageToFullRes ensures this reliably happens even on mobile.
      void swapModalImageToFullRes(fullSrc);
    }

    modal.classList.add("is-active");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("image-modal-open");
    document.documentElement.classList.add("image-modal-open");
    requestAnimationFrame(updateModalClosePosition);
  };

  const closeModal = () => {
    closeImageModalElement(modal, { blurActive: true });
    resetModalImageZoom();
    resetModalClosePosition();
  };

  modalImage.addEventListener(
    "touchstart",
    (event) => {
      if (!isMobileImageZoomEnabled()) return;

      if (event.touches.length === 2) {
        const [firstTouch, secondTouch] = event.touches;
        const midpoint = getTouchMidpoint(firstTouch, secondTouch);

        zoomState.pinchStartDistance = getTouchDistance(firstTouch, secondTouch);
        zoomState.pinchStartScale = zoomState.scale;
        zoomState.pinchStartTranslateX = zoomState.translateX;
        zoomState.pinchStartTranslateY = zoomState.translateY;
        zoomState.pinchStartMidpointX = midpoint.x;
        zoomState.pinchStartMidpointY = midpoint.y;
        event.preventDefault();
        return;
      }

      if (event.touches.length === 1) {
        // Relaxed: allow pan in mobile zoom mode even at initial scale < 1
        // (large raster box + low initial scale for sharp @4x on pinch zoom)
        const [touch] = event.touches;

        zoomState.panStartX = touch.clientX;
        zoomState.panStartY = touch.clientY;
        zoomState.panStartTranslateX = zoomState.translateX;
        zoomState.panStartTranslateY = zoomState.translateY;
        event.preventDefault();
      }
    },
    { passive: false }
  );

  modalImage.addEventListener(
    "touchmove",
    (event) => {
      if (!isMobileImageZoomEnabled()) return;

      if (event.touches.length === 2) {
        const [firstTouch, secondTouch] = event.touches;
        const midpoint = getTouchMidpoint(firstTouch, secondTouch);
        const nextDistance = getTouchDistance(firstTouch, secondTouch);
        const distanceRatio = zoomState.pinchStartDistance
          ? nextDistance / zoomState.pinchStartDistance
          : 1;

        zoomState.scale = clamp(
          zoomState.pinchStartScale * distanceRatio,
          0.1,
          MAX_MODAL_IMAGE_SCALE
        );
        zoomState.translateX =
          zoomState.pinchStartTranslateX +
          (midpoint.x - zoomState.pinchStartMidpointX);
        zoomState.translateY =
          zoomState.pinchStartTranslateY +
          (midpoint.y - zoomState.pinchStartMidpointY);
        applyModalImageZoom();
        event.preventDefault();
        return;
      }

      if (event.touches.length === 1) {
        // Relaxed for initial scale < 1 with large high-res raster box
        const [touch] = event.touches;

        zoomState.translateX =
          zoomState.panStartTranslateX + (touch.clientX - zoomState.panStartX);
        zoomState.translateY =
          zoomState.panStartTranslateY + (touch.clientY - zoomState.panStartY);
        applyModalImageZoom();
        event.preventDefault();
      }
    },
    { passive: false }
  );

  modalImage.addEventListener(
    "touchend",
    (event) => {
      if (!modal.classList.contains("image-modal--image")) return;

      if (event.touches.length === 1) {
        // Relaxed for initial scale < 1 with large high-res raster box
        const [touch] = event.touches;

        zoomState.panStartX = touch.clientX;
        zoomState.panStartY = touch.clientY;
        zoomState.panStartTranslateX = zoomState.translateX;
        zoomState.panStartTranslateY = zoomState.translateY;
        return;
      }

      if (event.touches.length === 0 && zoomState.scale <= 0.2) {
        // Only auto-reset when zoomed way out (our "normal" on mobile can be <1)
        resetModalImageZoom();
      }
    },
    { passive: true }
  );

  const scheduleModalImagePreloads = () => {
    if (prefersReducedData()) return;

    const previewTrigger = document.querySelector(".preview-block[data-full-src]");
    if (previewTrigger) {
      const schedulePreviewPreload = () =>
        window.setTimeout(() => primeTriggerFullImage(previewTrigger, "high"), 250);

      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(schedulePreviewPreload, { timeout: 1000 });
      } else {
        schedulePreviewPreload();
      }
    }

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries, currentObserver) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            primeTriggerFullImage(entry.target, "low");
            currentObserver.unobserve(entry.target);
          });
        },
        { rootMargin: MODAL_IMAGE_PRELOAD_ROOT_MARGIN }
      );

      zoomTriggers.forEach((trigger) => {
        if (getTriggerType(trigger) === "image") {
          observer.observe(trigger);
        }
      });
    }
  };

  zoomTriggers.forEach((trigger) => {
    const preloadOnIntent = () => primeTriggerFullImage(trigger, "high");

    trigger.addEventListener("pointerenter", preloadOnIntent, {
      passive: true,
      signal: pageLifecycle.signal,
    });
    trigger.addEventListener("focusin", preloadOnIntent, {
      signal: pageLifecycle.signal,
    });
    trigger.addEventListener("touchstart", preloadOnIntent, {
      passive: true,
      signal: pageLifecycle.signal,
    });
    trigger.addEventListener("click", () => openModal(trigger), {
      signal: pageLifecycle.signal,
    });
  });

  scheduleModalImagePreloads();

  if (previewZoomModalReady) {
    return;
  }

  previewZoomModalReady = true;

  modalImage.addEventListener("load", () => {
    applyModalImageZoom();
    updateModalClosePosition();

    // On mobile zoom mode, after high-res loads, size the <img> element
    // based on its natural dimensions (from the @4x source) to give the
    // browser enough pixel data for sharp pinch-to-zoom. We use a large
    // CSS box + initial scale < 1 so the visual "1x" still fits the modal.
    if (isMobileImageZoomEnabled() && modalImage.naturalWidth && modalImage.naturalHeight) {
      const natW = modalImage.naturalWidth;
      const natH = modalImage.naturalHeight;

      // Large box (half natural is a good sweet spot for 4x sources)
      // This makes the rasterization target much higher resolution than the viewport.
      const boxW = natW / 2;
      const boxH = natH / 2;

      modalImage.style.width = `${boxW}px`;
      modalImage.style.height = `${boxH}px`;
      modalImage.style.maxWidth = 'none';
      modalImage.style.maxHeight = 'none';

      // Compute what scale makes this large box visually fit the current modal area
      const modalStyles = window.getComputedStyle(modal);
      const availW =
        modal.clientWidth -
        Number.parseFloat(modalStyles.paddingLeft || 0) -
        Number.parseFloat(modalStyles.paddingRight || 0);
      const availH =
        modal.clientHeight -
        Number.parseFloat(modalStyles.paddingTop || 0) -
        Number.parseFloat(modalStyles.paddingBottom || 0);

      const fitScale = Math.min(availW / boxW, availH / boxH);
      zoomState.scale = Math.max(0.05, Math.min(fitScale || 1, 1));

      // Re-apply transform + clamp with the new box size and initial scale
      applyModalImageZoom();
    }
  });
  modalVideo.addEventListener("loadedmetadata", updateModalClosePosition);
  window.addEventListener(
    "resize",
    () => {
      if (modal.classList.contains("image-modal--image")) {
        if (isMobileImageZoomEnabled()) {
          applyModalImageZoom();
        } else {
          resetModalImageZoom();
        }
      }

      updateModalClosePosition();

      // If the special result image-block is currently open in the modal,
      // and the viewport crossed the mobile breakpoint, live-swap the asset in the modal too.
      const resultBlock = document.querySelector(".image-block.result");
      if (resultBlock && modal.classList.contains("image-modal--image")) {
        const currentFullTarget = modalImage.dataset.fullSrcTarget;
        const latestFull = resultBlock.getAttribute("data-full-src");
        const latestPreview = resultBlock
          .querySelector(".image-block__image")
          ?.getAttribute("src");

        if (
          currentFullTarget &&
          latestFull &&
          currentFullTarget !== latestFull &&
          /(?:d|s)-result/.test(currentFullTarget)
        ) {
          modalImage.dataset.fullSrcTarget = latestFull;
          if (latestPreview) {
            modalImage.src = latestPreview;
          }
          void swapModalImageToFullRes(latestFull);
        }
      }
    }
  );

  modalOverlay.addEventListener("click", closeModal);
  modalClose.addEventListener("click", closeModal);

  // Clicking anywhere outside the actual media (gutters around tall/wide images, etc.)
  // should also close the modal. This makes the X reliable even if its positioned
  // hit box is temporarily affected by tall content or stacking.
  modal.addEventListener("click", (event) => {
    if (!modal.classList.contains("is-active")) return;
    const target = event.target;
    if (target.closest(".image-modal__close")) return;
    if (target.closest(".image-modal__image, .image-modal__video")) return;
    closeModal();
  });

  modalOverlay.addEventListener("wheel", (event) => event.preventDefault(), {
    passive: false,
  });
  modalOverlay.addEventListener(
    "touchmove",
    (event) => event.preventDefault(),
    { passive: false }
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-active")) {
      closeModal();
    }
  });
}

function setupSaveFileButton() {
  const saveFileButton = document.getElementById("save-file-button");
  if (!(saveFileButton instanceof HTMLButtonElement)) return;

  const { downloadUrl = "", downloadName = "" } = saveFileButton.dataset;
  if (!downloadUrl) return;

  const fallbackDownload = () => {
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = downloadName || "";
    link.rel = "noopener";
    document.body.append(link);
    link.click();
    link.remove();
  };

  saveFileButton.addEventListener("click", async () => {
    const suggestedName =
      downloadName || downloadUrl.split("/").filter(Boolean).pop() || "download";

    if (!window.showSaveFilePicker || !window.isSecureContext) {
      fallbackDownload();
      return;
    }

    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error("Download source is unavailable");
      }

      const fileBlob = await response.blob();
      const fileHandle = await window.showSaveFilePicker({ suggestedName });
      const writable = await fileHandle.createWritable();

      await writable.write(fileBlob);
      await writable.close();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      console.error(error);
      fallbackDownload();
    }
  });
}

const closeActiveImageModal = () => {
  closeImageModalElement(document.querySelector(".image-modal.is-active"));
};

function initPortfolioPage() {
  resetPageLifecycle();
  closeActiveImageModal();

  handleInitialHashScroll();
  setupNonBreakingShortWords();
  setupCopyEmailButton();
  setupWorkListToggles();
  setupScrollToTop();
  setupPageAnchorNav();
  setupResultImageResponsive();
  setupPreviewZoom();
  setupSaveFileButton();
}

window.initPortfolioPage = initPortfolioPage;

document.addEventListener("DOMContentLoaded", initPortfolioPage);
