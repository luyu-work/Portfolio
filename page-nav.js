(() => {
  const PORTFOLIO_PAGES = [
    "index.html",
    "pet-project.html",
    "agreement-card.html",
    "story-builder.html",
  ];

  const pageCache = new Map();

  const getPageUrl = (pageName) =>
    pageName === "index.html" ? "./index.html" : `./${pageName}`;

  const normalizePageName = (value) => {
    if (!value) return null;

    try {
      const url = new URL(value, window.location.href);

      if (url.origin !== window.location.origin) {
        return null;
      }

      let pageName = url.pathname.split("/").filter(Boolean).pop() || "index.html";

      if (pageName === "" || url.pathname.endsWith("/")) {
        pageName = "index.html";
      }

      return PORTFOLIO_PAGES.includes(pageName) ? pageName : null;
    } catch (error) {
      return null;
    }
  };

  const getCurrentPageName = () =>
    normalizePageName(window.location.pathname) || "index.html";

  const warmImageCacheForHtml = (html) => {
    const parsed = new DOMParser().parseFromString(html, "text/html");

    parsed.querySelectorAll("img[src]").forEach((image) => {
      const src = image.getAttribute("src");
      if (!src) return;

      const preloader = new Image();
      preloader.decoding = "async";
      preloader.src = new URL(src, window.location.href).href;
    });

    parsed.querySelectorAll("[style]").forEach((element) => {
      const style = element.getAttribute("style") || "";
      const match = style.match(/background-image:\s*url\((['"]?)([^'")]+)\1\)/i);
      if (!match?.[2]) return;

      const preloader = new Image();
      preloader.decoding = "async";
      preloader.src = new URL(match[2], window.location.href).href;
    });
  };

  const fetchPageHtml = async (pageName) => {
    const response = await fetch(`./${pageName}`, { cache: "force-cache" });
    if (!response.ok) {
      throw new Error(`Failed to preload ${pageName}`);
    }

    return response.text();
  };

  const ensurePageCached = async (pageName) => {
    if (pageCache.has(pageName)) {
      return pageCache.get(pageName);
    }

    const html = await fetchPageHtml(pageName);
    pageCache.set(pageName, html);
    warmImageCacheForHtml(html);
    return html;
  };

  const cacheCurrentDocument = () => {
    const currentPage = getCurrentPageName();
    pageCache.set(currentPage, document.documentElement.outerHTML);
    warmImageCacheForHtml(document.documentElement.outerHTML);
  };

  const preloadRemainingPages = () => {
    const currentPage = getCurrentPageName();

    PORTFOLIO_PAGES.forEach((pageName) => {
      if (pageName === currentPage || pageCache.has(pageName)) return;
      void ensurePageCached(pageName).catch((error) => console.error(error));
    });
  };

  let isRendering = false;

  const renderCachedPage = async (
    pageName,
    { skipAnimation = false, updateHistory = false } = {}
  ) => {
    if (isRendering) return;
    isRendering = true;

    try {
      const html = await ensurePageCached(pageName);
      const parsed = new DOMParser().parseFromString(html, "text/html");
      const preservedModal = document.querySelector(".image-modal");

      document.title = parsed.title;
      document.body.className = parsed.body.className;
      document.body.innerHTML = parsed.body.innerHTML;

      if (preservedModal) {
        document.body.append(preservedModal);
      }

      window.scrollTo(0, 0);

      if (skipAnimation) {
        document.body.classList.add("no-anim");
        requestAnimationFrame(() => {
          document.body.classList.remove("no-anim");
        });
      }

      if (updateHistory === "push") {
        window.history.pushState({ page: pageName }, "", getPageUrl(pageName));
      } else if (updateHistory === "replace") {
        window.history.replaceState({ page: pageName }, "", getPageUrl(pageName));
      }

      if (typeof window.initPortfolioPage === "function") {
        window.initPortfolioPage();
      }
    } finally {
      isRendering = false;
    }
  };

  const schedulePreload = () => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => preloadRemainingPages(), { timeout: 1500 });
      return;
    }

    window.setTimeout(preloadRemainingPages, 200);
  };

  document.addEventListener(
    "click",
    (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const link = event.target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target && link.target !== "_self") return;

      const pageName = normalizePageName(link.getAttribute("href"));
      if (!pageName || pageName === getCurrentPageName()) return;

      event.preventDefault();
      cacheCurrentDocument();
      void renderCachedPage(pageName, { skipAnimation: true, updateHistory: "push" });
    },
    true
  );

  window.addEventListener("popstate", () => {
    cacheCurrentDocument();
    const pageName = getCurrentPageName();
    void renderCachedPage(pageName, { skipAnimation: true, updateHistory: false });
  });

  const bootstrap = () => {
    cacheCurrentDocument();
    window.history.replaceState({ page: getCurrentPageName() }, "", window.location.href);
    schedulePreload();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();