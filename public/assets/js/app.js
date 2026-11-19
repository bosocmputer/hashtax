/* =========================================================
   HASH-TAX Main Client Script (Lightweight Vanilla JS)
   ========================================================= */
(function () {
  "use strict";

  const SUPPORTED_LANGS = ["th", "en", "zh"];
  const STORAGE_KEY = "hashtax_lang";

  function getInitialLang() {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get("lang");
    if (urlLang && SUPPORTED_LANGS.includes(urlLang)) return urlLang;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;

    const browser = (navigator.language || "th").toLowerCase();
    if (browser.startsWith("zh")) return "zh";
    if (browser.startsWith("en")) return "en";
    return "th";
  }

  function applyLanguage(lang) {
    const dict = window.HASHTAX_I18N && window.HASHTAX_I18N[lang];
    if (!dict) return;

    document.documentElement.lang = lang === "zh" ? "zh-Hans" : lang;
    const titleKey = document.body.getAttribute("data-title-key") || "page_title";
    if (dict[titleKey]) document.title = dict[titleKey];
    if (dict.meta_description) {
      const descMeta = document.querySelector('meta[name="description"]');
      if (descMeta) descMeta.setAttribute("content", dict.meta_description);
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute("content", dict.meta_description);
    }
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && dict[titleKey]) ogTitle.setAttribute("content", dict[titleKey]);

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (dict[key] !== undefined) {
        el.textContent = dict[key];
      }
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (dict[key] !== undefined) {
        el.setAttribute("placeholder", dict[key]);
      }
    });

    document.querySelectorAll(".lang-btn").forEach((btn) => {
      const active = btn.getAttribute("data-lang") === lang;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });

    document.querySelectorAll(".faq-item.open .faq-answer").forEach((ans) => {
      ans.style.maxHeight = ans.scrollHeight + "px";
    });

    localStorage.setItem(STORAGE_KEY, lang);
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }

    let currentLang = getInitialLang();
    applyLanguage(currentLang);

    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const nextLang = btn.getAttribute("data-lang");
        if (nextLang && SUPPORTED_LANGS.includes(nextLang)) {
          currentLang = nextLang;
          applyLanguage(currentLang);
        }
      });
    });

    const header = document.getElementById("site-header");
    const backToTop = document.getElementById("back-to-top");

    function onScroll() {
      const y = window.scrollY || 0;
      if (header) header.classList.toggle("scrolled", y > 24);
      if (backToTop) backToTop.classList.toggle("show", y > 420);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (backToTop) {
      backToTop.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    const drawer = document.getElementById("mobile-drawer");
    const openBtn = document.getElementById("menu-toggle");
    const closeBtn = document.getElementById("drawer-close");

    function toggleDrawer(open) {
      if (!drawer) return;
      drawer.classList.toggle("open", open);
      drawer.setAttribute("aria-hidden", String(!open));
      document.body.style.overflow = open ? "hidden" : "";
    }

    if (openBtn) openBtn.addEventListener("click", () => toggleDrawer(true));
    if (closeBtn) closeBtn.addEventListener("click", () => toggleDrawer(false));
    if (drawer) {
      drawer.addEventListener("click", (e) => {
        if (e.target === drawer) toggleDrawer(false);
      });
      drawer.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => toggleDrawer(false));
      });
    }

    document.querySelectorAll(".faq-trigger").forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const item = trigger.closest(".faq-item");
        const answer = item.querySelector(".faq-answer");
        const isOpen = item.classList.contains("open");

        document.querySelectorAll(".faq-item.open").forEach((other) => {
          other.classList.remove("open");
          const otherAns = other.querySelector(".faq-answer");
          if (otherAns) otherAns.style.maxHeight = null;
        });

        if (!isOpen) {
          item.classList.add("open");
          answer.style.maxHeight = answer.scrollHeight + "px";
        }
      });
    });

    const firstFaq = document.querySelector(".faq-item");
    if (firstFaq) {
      firstFaq.classList.add("open");
      const firstAns = firstFaq.querySelector(".faq-answer");
      if (firstAns) firstAns.style.maxHeight = firstAns.scrollHeight + "px";
    }

    document.querySelectorAll("[data-package-key]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-package-key");
        const dict = window.HASHTAX_I18N[currentLang] || {};
        const subjectInput = document.getElementById("contact-subject");
        if (subjectInput && dict[key]) {
          subjectInput.value = dict[key];
        }
      });
    });

    const contactForm = document.getElementById("contact-form");
    const formNote = document.getElementById("form-note");
    const submitBtn = document.getElementById("contact-submit-btn");
    if (contactForm) {
      contactForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("contact-name").value.trim();
        const contact = document.getElementById("contact-email").value.trim();
        const subject = document.getElementById("contact-subject").value.trim();
        const message = document.getElementById("contact-message").value.trim();
        const dict = window.HASHTAX_I18N[currentLang] || {};

        if (submitBtn) submitBtn.disabled = true;
        if (formNote) {
          formNote.classList.remove("success");
          formNote.textContent = dict.form_sending || "Sending...";
        }

        try {
          const res = await fetch("https://mali.hash-tax.com/api/public/inquiries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, contact, subject, message, lang: currentLang }),
          });
          if (!res.ok) throw new Error("API error");

          if (formNote) {
            formNote.textContent = dict.form_sent_mali || "Message received.";
            formNote.classList.add("success");
          }
          contactForm.reset();
        } catch {
          const body = ["Name: " + name, "Contact: " + contact, "", message].join("\n");
          if (formNote) {
            formNote.textContent = dict.form_sent_note || "";
            formNote.classList.add("success");
          }
          window.location.href =
            "mailto:info@hash-tax.com?subject=" +
            encodeURIComponent("[HASH-TAX Web] " + subject) +
            "&body=" +
            encodeURIComponent(body);
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }

    // Dynamic articles list from Mali CMS (articles.html)
    const dynamicGrid = document.getElementById("dynamic-articles-grid");
    if (dynamicGrid) {
      fetch("https://mali.hash-tax.com/api/public/articles")
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          const list = json && Array.isArray(json.data) ? json.data : [];
          if (!list.length) return;
          const dict = window.HASHTAX_I18N[currentLang] || {};
          const readLabel = dict.art_read_btn || "อ่านเพิ่มเติม";
          const frag = document.createDocumentFragment();
          list.forEach((a) => {
            const card = document.createElement("article");
            card.className = "article-card";
            const url = "article-1.html?slug=" + encodeURIComponent(a.slug);
            const cover = a.coverUrl || "assets/opt/image2.jpg";
            const dateStr = a.publishedAt
              ? new Date(a.publishedAt).toLocaleDateString("th-TH", { dateStyle: "medium" })
              : "";
            card.innerHTML =
              '<a href="' + url + '"><img src="' + cover + '" alt="" class="article-card-img" loading="lazy" /></a>' +
              '<div class="article-card-body">' +
              '<div class="article-meta"><span></span><span>•</span><span></span></div>' +
              '<h2><a href="' + url + '"></a></h2>' +
              '<p></p>' +
              '<a href="' + url + '" class="btn btn-primary"></a>' +
              "</div>";
            const spans = card.querySelectorAll(".article-meta span");
            spans[0].textContent = a.authorName || "ทีมงาน HASH-TAX";
            spans[2].textContent = dateStr;
            card.querySelector("h2 a").textContent = a.title;
            card.querySelector("p").textContent = a.excerpt;
            card.querySelector(".btn").textContent = readLabel;
            frag.appendChild(card);
          });
          dynamicGrid.prepend(frag);
        })
        .catch(() => {});
    }

    // Dynamic single article from Mali CMS (article-1.html?slug=...)
    const slugParam = new URLSearchParams(window.location.search).get("slug");
    const proseEl = document.getElementById("article-prose");
    if (slugParam && proseEl) {
      fetch("https://mali.hash-tax.com/api/public/articles/" + encodeURIComponent(slugParam))
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          const a = json && json.data;
          if (!a) return;
          document.title = a.title + " | HASH-TAX";
          const titleEl = document.getElementById("article-title");
          const authorEl = document.getElementById("article-author");
          const dateEl = document.getElementById("article-date");
          const coverEl = document.getElementById("article-cover");
          if (titleEl) {
            titleEl.removeAttribute("data-i18n");
            titleEl.textContent = a.title;
          }
          if (authorEl) {
            authorEl.removeAttribute("data-i18n");
            authorEl.textContent = a.authorName || "ทีมงาน HASH-TAX";
          }
          if (dateEl && a.publishedAt) {
            dateEl.removeAttribute("data-i18n");
            dateEl.textContent = new Date(a.publishedAt).toLocaleDateString("th-TH", { dateStyle: "medium" });
          }
          if (coverEl && a.coverUrl) coverEl.src = a.coverUrl;
          proseEl.innerHTML = "";
          a.content.split(/\n{2,}/).forEach((para) => {
            const trimmed = para.trim();
            if (!trimmed) return;
            const p = document.createElement("p");
            p.textContent = trimmed;
            p.style.whiteSpace = "pre-line";
            proseEl.appendChild(p);
          });
        })
        .catch(() => {});
    }

    const revealEls = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window && revealEls.length) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("visible");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 }
      );
      revealEls.forEach((el) => io.observe(el));
    } else {
      revealEls.forEach((el) => el.classList.add("visible"));
    }

    const cookieBanner = document.getElementById("cookie-banner");
    const acceptBtn = document.getElementById("accept-cookies");
    if (cookieBanner && !localStorage.getItem("cookieConsent")) {
      cookieBanner.classList.add("show");
    }
    if (acceptBtn) {
      acceptBtn.addEventListener("click", () => {
        localStorage.setItem("cookieConsent", "accepted");
        if (cookieBanner) cookieBanner.classList.remove("show");
      });
    }
  });
})();
