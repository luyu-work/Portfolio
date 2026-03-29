const EMAIL_ADDRESS = "lubu.lanfen@gmail.com";
const MAIL_ICON_PATH = "./src/icons/mail.svg";
const SUCCESS_ICON_PATH = "./src/icons/success.svg";

const MOBILE_PADDING_BREAKPOINT = 600;
const ACTIVE_CARD_WIDTH_MAX = 520;
const PADDING_MAX = 40;
const PAGE_ANCHOR_BREAKPOINT = 960;
const PAGE_ANCHOR_SIDE_OFFSET = 40;
const PAGE_ANCHOR_INITIAL_TOP = 335;
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

const cardStates = {
  0: [520, 520, 40, 0, 0, 4],
  1: [488.27, 488.27, 129.18, 2.59, 4, 3],
  2: [460.98, 460.98, 200.71, 4.27, 8, 2],
  3: [433.01, 433.01, 272.97, 10.05, 13, 1],
  "-1": [488.27, 488.27, -16.31, 35.36, -4, 3],
  "-2": [460.98, 460.98, -57.16, 68.82, -8, 2],
  "-3": [433.01, 433.01, -95.38, 105.32, -13, 1],
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const getCardStateScaled = (key, scaleFactor) => {
  const desktopState = cardStates[key];
  if (!desktopState) return null;

  const [width, height, left, top, rotate, zIndex] = desktopState;

  return [
    width * scaleFactor,
    height * scaleFactor,
    (left - PADDING_MAX) * scaleFactor + PADDING_MAX,
    top * scaleFactor,
    rotate,
    zIndex,
  ];
};

const getCardState = (key) => {
  const desktopState = cardStates[key];
  if (!desktopState) return null;

  if (window.innerWidth >= MOBILE_PADDING_BREAKPOINT) {
    return desktopState;
  }

  const availableWidth = Math.max(window.innerWidth - PADDING_MAX * 2, 0);
  const scaleFactor = availableWidth / ACTIVE_CARD_WIDTH_MAX;

  return getCardStateScaled(key, scaleFactor);
};

function setupCopyEmailButton() {
  const copyBtn = document.getElementById("copy-email");
  if (!copyBtn) return;

  const textEl = copyBtn.querySelector(".link-button-text");
  const iconEl = copyBtn.querySelector(".link-button-icon img");
  if (!textEl || !iconEl) return;

  const iconPreloadCache = new Map();
  let isAnimating = false;

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

  copyBtn.addEventListener("click", async () => {
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
      await animateButtonState(EMAIL_ADDRESS, MAIL_ICON_PATH);
    } finally {
      isAnimating = false;
    }
  });
}

function setupNonBreakingShortWords() {
  if (!document.body.classList.contains("story-builder")) return;

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

    const header = event.target.closest(".work-list__item-header");
    if (!header) return;

    const item = header.closest(".work-list__item");
    if (!item) return;

    const isExpanded = item.getAttribute("collapsed") === "no";
    item.setAttribute("collapsed", isExpanded ? "yes" : "no");
    item.classList.toggle("expanded", !isExpanded);
  });
}

function setupCardSwipe() {
  const container = document.querySelector(".card-container");
  if (!container) return;

  const cards = Array.from(container.querySelectorAll(".card-item"));
  const totalCards = cards.length;
  if (!totalCards) return;

  const savedIndex = Number.parseInt(
    new URLSearchParams(window.location.search).get("card") ?? "",
    10
  );

  let currentCardIndex =
    Number.isInteger(savedIndex) && savedIndex >= 0 && savedIndex < totalCards
      ? savedIndex
      : 0;

  const SWIPE_THRESHOLD = 50;
  let startX = 0;
  let isDragging = false;
  let cardDragging = null;
  let activePointerId = null;

  const getActiveCard = () => cards[currentCardIndex];

  function resetDragState() {
    const draggingCard = cardDragging;
    const pointerId = activePointerId;

    isDragging = false;
    cardDragging = null;
    activePointerId = null;
    container.classList.remove("is-swiping");

    if (draggingCard) {
      draggingCard.style.transform = "";
    }

    if (
      draggingCard &&
      pointerId !== null &&
      draggingCard.hasPointerCapture?.(pointerId)
    ) {
      try {
        draggingCard.releasePointerCapture(pointerId);
      } catch (error) {
        console.error(error);
      }
    }

    syncCardLayout();
  }

  function updateCardStyles() {
    cards.forEach((card, index) => {
      let stateShift = index - currentCardIndex;

      if (stateShift < -totalCards + 1) {
        stateShift += totalCards;
      }
      if (stateShift > totalCards - 1) {
        stateShift -= totalCards;
      }

      const state = getCardState(String(stateShift));
      if (!state) return;

      const [width, height, left, top, rotate, zIndex] = state;

      card.style.width = `${width}px`;
      card.style.height = `${height}px`;
      card.style.left = `${left}px`;
      card.style.top = `${top}px`;
      card.style.transform = `rotate(${rotate}deg)`;
      card.style.zIndex = zIndex;
      card.style.opacity = "1";
      card.style.pointerEvents = index === currentCardIndex ? "auto" : "none";
    });
  }

  function updateContainerHeight() {
    let maxBottom = 0;

    for (
      let stateShift = -totalCards + 1;
      stateShift <= totalCards - 1;
      stateShift += 1
    ) {
      const state = getCardState(String(stateShift));
      if (!state) continue;

      const [, height, , top] = state;
      maxBottom = Math.max(maxBottom, top + height);
    }

    container.style.height = `${Math.ceil(maxBottom)}px`;
  }

  function syncCardLayout() {
    updateCardStyles();
    updateContainerHeight();
  }

  function handleStart(event) {
    if (!event.isPrimary) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    if (isDragging) {
      resetDragState();
    }

    if (event.currentTarget !== getActiveCard()) {
      return;
    }

    isDragging = true;
    startX = event.clientX;
    cardDragging = event.currentTarget;
    activePointerId = event.pointerId;
    container.classList.add("is-swiping");

    if (cardDragging.setPointerCapture) {
      cardDragging.setPointerCapture(event.pointerId);
    }

    event.preventDefault();
  }

  function handleMove(event) {
    if (!isDragging || event.pointerId !== activePointerId) return;

    if (event.pointerType === "mouse" && (event.buttons & 1) === 0) {
      resetDragState();
      return;
    }

    if (cardDragging === getActiveCard()) {
      const deltaX = event.clientX - startX;
      cardDragging.style.transform = `translateX(${deltaX * 0.5}px) rotate(0deg) scale(1)`;
    }

    event.preventDefault();
  }

  function handleEnd(event) {
    if (!isDragging || event.pointerId !== activePointerId) return;

    const diffX = startX - event.clientX;

    if (Math.abs(diffX) < 5) {
      const targetUrl = cardDragging?.getAttribute("data-href");

      resetDragState();

      if (targetUrl) {
        window.location.href = targetUrl;
      }
      return;
    }

    const direction =
      diffX > SWIPE_THRESHOLD ? 1 : diffX < -SWIPE_THRESHOLD ? -1 : 0;

    if (direction) {
      currentCardIndex =
        (currentCardIndex + direction + totalCards) % totalCards;
    }

    resetDragState();
  }

  function handleCancel(event) {
    if (!isDragging || event.pointerId !== activePointerId) return;
    resetDragState();
  }

  function handleGlobalReset() {
    if (isDragging) {
      resetDragState();
    }
  }

  cards.forEach((card) => {
    card.addEventListener("pointerdown", handleStart);
    card.addEventListener("lostpointercapture", handleCancel);
    card.addEventListener("dragstart", (event) => event.preventDefault());
  });

  document.addEventListener("pointermove", handleMove, { passive: false });
  document.addEventListener("pointerup", handleEnd);
  document.addEventListener("pointercancel", handleCancel);

  window.addEventListener("mouseleave", handleGlobalReset);
  window.addEventListener("blur", handleGlobalReset);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      handleGlobalReset();
    }
  });

  syncCardLayout();
  window.addEventListener("resize", syncCardLayout);
}

function setupScrollToTop() {
  const scrollBtn = document.querySelector(".scroll-to-top");
  const actionBlock = document.querySelector(".action-block");
  const mainContainer = document.querySelector(".main");

  if (!scrollBtn || !actionBlock || !mainContainer) return;

  const contrastCanvas = document.createElement("canvas");
  const contrastContext = contrastCanvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (contrastContext) {
    contrastCanvas.width = 1;
    contrastCanvas.height = 1;
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

    const sourceX = Math.max(
      0,
      Math.min(sourceWidth - 1, (offsetX / mediaRect.width) * sourceWidth)
    );
    const sourceY = Math.max(
      0,
      Math.min(sourceHeight - 1, (offsetY / mediaRect.height) * sourceHeight)
    );

    try {
      contrastContext.clearRect(0, 0, 1, 1);
      contrastContext.drawImage(media, sourceX, sourceY, 1, 1, 0, 0, 1, 1);
      const [red, green, blue] = contrastContext.getImageData(0, 0, 1, 1).data;

      return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
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
    const samplePoints = [
      {
        x: buttonRect.left + buttonRect.width * 0.25,
        y: buttonRect.top + buttonRect.height * 0.5,
      },
      {
        x: buttonRect.left + buttonRect.width * 0.5,
        y: buttonRect.top + buttonRect.height * 0.5,
      },
      {
        x: buttonRect.left + buttonRect.width * 0.75,
        y: buttonRect.top + buttonRect.height * 0.5,
      },
    ];

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

    const brightSamplesCount = luminanceValues.filter((value) => value >= 210).length;
    const averageLuminance =
      luminanceValues.reduce((sum, value) => sum + value, 0) /
      luminanceValues.length;

    scrollBtn.classList.toggle(
      "scroll-to-top--dark-foreground",
      brightSamplesCount >= 2 && averageLuminance >= 190
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

  let isTicking = false;
  const requestStickyUpdate = () => {
    if (isTicking) return;

    isTicking = true;
    requestAnimationFrame(() => {
      isTicking = false;
      updateStickyPosition();
    });
  };

  window.addEventListener("scroll", requestStickyUpdate, { passive: true });
  window.addEventListener("resize", () => {
    updateScrollButtonMode();
    requestStickyUpdate();
  });

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
      const isActive = link === nextLink;
      link.classList.toggle("anchor-item-active", isActive);
      link.classList.toggle("anchor-item", !isActive);
    });

    if (!activeLine) return;

    activeLine.style.transform = `translateY(${nextLink.offsetTop}px)`;
    activeLine.style.height = `${nextLink.offsetHeight}px`;
  };

  const getCurrentItem = () => {
    const threshold = window.scrollY + PAGE_ANCHOR_STICKY_TOP + 80;
    let currentItem = items[0];

    items.forEach((item) => {
      if (item.target.offsetTop <= threshold) {
        currentItem = item;
      }
    });

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

  let isTicking = false;
  const requestAnchorUpdate = () => {
    if (isTicking) return;

    isTicking = true;
    requestAnimationFrame(() => {
      isTicking = false;
      updateAnchorNav();
    });
  };

  window.addEventListener("scroll", requestAnchorUpdate, { passive: true });
  window.addEventListener("resize", requestAnchorUpdate);

  requestAnimationFrame(requestAnchorUpdate);
  setTimeout(requestAnchorUpdate, 0);
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
    <button class="image-modal__close" type="button" aria-label="Закрыть медиа">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 18L12 12M12 12L6 6M12 12L18 6M12 12L6 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <img class="image-modal__image" alt="" />
    <video class="image-modal__video" controls playsinline preload="metadata"></video>
  `;

  document.body.append(modal);
  return modal;
}

function setupPreviewZoom() {
  const zoomTriggers = document.querySelectorAll(".preview-block, .image-block");
  if (!zoomTriggers.length) return;

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
      !modal.classList.contains("image-modal--image") ||
      modalImage.dataset.fullSrcTarget !== fullSrc
    ) {
      return;
    }

    if (modalImage.getAttribute("src") !== fullSrc) {
      modalImage.src = fullSrc;
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
      void swapModalImageToFullRes(fullSrc);
    }

    modal.classList.add("is-active");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("image-modal-open");
    document.documentElement.classList.add("image-modal-open");
    requestAnimationFrame(updateModalClosePosition);
  };

  const closeModal = () => {
    if (modal.contains(document.activeElement)) {
      document.activeElement.blur();
    }

    modal.classList.remove("is-active", "image-modal--image", "image-modal--video");
    modal.classList.remove("image-modal--zoom-enabled", "image-modal--zoomed");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("image-modal-open");
    document.documentElement.classList.remove("image-modal-open");
    document.body.style.removeProperty("padding-right");

    modalImage.removeAttribute("src");
    delete modalImage.dataset.fullSrcTarget;
    modalVideo.pause();
    modalVideo.removeAttribute("src");
    modalVideo.load();
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

      if (event.touches.length === 1 && zoomState.scale > 1) {
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
          1,
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

      if (event.touches.length === 1 && zoomState.scale > 1) {
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

      if (event.touches.length === 1 && zoomState.scale > 1) {
        const [touch] = event.touches;

        zoomState.panStartX = touch.clientX;
        zoomState.panStartY = touch.clientY;
        zoomState.panStartTranslateX = zoomState.translateX;
        zoomState.panStartTranslateY = zoomState.translateY;
        return;
      }

      if (event.touches.length === 0 && zoomState.scale <= 1) {
        resetModalImageZoom();
      }
    },
    { passive: true }
  );

  zoomTriggers.forEach((trigger) => {
    const preloadOnIntent = () => primeTriggerFullImage(trigger, "high");

    trigger.addEventListener("pointerenter", preloadOnIntent, { passive: true });
    trigger.addEventListener("focusin", preloadOnIntent);
    trigger.addEventListener("touchstart", preloadOnIntent, { passive: true });
    trigger.addEventListener("click", () => openModal(trigger));
  });

  modalImage.addEventListener("load", () => {
    applyModalImageZoom();
    updateModalClosePosition();
  });
  modalVideo.addEventListener("loadedmetadata", updateModalClosePosition);
  window.addEventListener("resize", () => {
    if (modal.classList.contains("image-modal--image")) {
      if (isMobileImageZoomEnabled()) {
        applyModalImageZoom();
      } else {
        resetModalImageZoom();
      }
    }

    updateModalClosePosition();
  });

  modalOverlay.addEventListener("click", closeModal);
  modalClose.addEventListener("click", closeModal);
  modalOverlay.addEventListener("wheel", (event) => event.preventDefault(), {
    passive: false,
  });
  modalOverlay.addEventListener(
    "touchmove",
    (event) => event.preventDefault(),
    { passive: false }
  );

  if (!prefersReducedData()) {
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
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-active")) {
      closeModal();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  handleInitialHashScroll();
  setupNonBreakingShortWords();
  setupCopyEmailButton();
  setupWorkListToggles();
  setupCardSwipe();
  setupScrollToTop();
  setupPageAnchorNav();
  setupPreviewZoom();
});
