(function (root) {
  'use strict';

  const SUPPORTED_LANGUAGES = ['de', 'en', 'fr'];
  const DEFAULT_LANGUAGE = 'de';
  const translations = new Map();
  const hints = new Map();
  let currentLanguage = DEFAULT_LANGUAGE;

  // Browser language values are normalized to the language catalogs shipped with
  // the app, falling back to German whenever an unsupported locale is requested.
  function normalizeLanguage(language) {
    const value = String(language || '').toLowerCase().split('-')[0];
    return SUPPORTED_LANGUAGES.includes(value) ? value : DEFAULT_LANGUAGE;
  }

  function browserLanguage() {
    const languages = Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];
    const matched = languages
      .map((language) => String(language || '').toLowerCase().split('-')[0])
      .find((language) => SUPPORTED_LANGUAGES.includes(language));
    return matched || DEFAULT_LANGUAGE;
  }

  function parseXml(xmlText) {
    const documentXml = new DOMParser().parseFromString(xmlText, 'application/xml');
    if (documentXml.querySelector('parsererror')) {
      throw new Error('Translation XML could not be parsed.');
    }
    const values = {};
    documentXml.querySelectorAll('text[key]').forEach((node) => {
      values[node.getAttribute('key')] = node.textContent;
    });
    return values;
  }

  // Language and hint XML files are fetched lazily and cached in memory so changing
  // languages does not repeatedly reload already parsed catalogs.
  async function loadXmlCatalog(language, catalog, pathFactory) {
    const normalized = normalizeLanguage(language);
    if (catalog.has(normalized)) {
      return catalog.get(normalized);
    }
    const response = await fetch(pathFactory(normalized), { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Catalog ${normalized} could not be loaded.`);
    }
    const values = parseXml(await response.text());
    catalog.set(normalized, values);
    return values;
  }

  function loadLanguage(language) {
    return loadXmlCatalog(language, translations, (normalized) => `i18n/${normalized}.xml`);
  }

  function loadHints(language) {
    return loadXmlCatalog(language, hints, (normalized) => `i18n/hints/${normalized}.xml`);
  }

  function t(key, fallback) {
    const active = translations.get(currentLanguage) || {};
    const defaults = translations.get(DEFAULT_LANGUAGE) || {};
    return active[key] || defaults[key] || fallback || key;
  }

  function hint(key, fallback) {
    const active = hints.get(currentLanguage) || {};
    const defaults = hints.get(DEFAULT_LANGUAGE) || {};
    return active[key] || defaults[key] || fallback || '';
  }

  // Localization updates text nodes and placeholders only. Form values remain
  // untouched so a language change cannot alter the generated call configuration.
  function localizeDocument() {
    document.documentElement.lang = currentLanguage;
    document.querySelectorAll('[data-i18n]').forEach((element) => {
      element.textContent = t(element.dataset.i18n, element.textContent);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
      element.setAttribute('placeholder', t(element.dataset.i18nPlaceholder, element.getAttribute('placeholder') || ''));
    });
  }

  async function setLanguage(language) {
    currentLanguage = normalizeLanguage(language);
    await loadLanguage(currentLanguage);
    await loadHints(currentLanguage);
    if (currentLanguage !== DEFAULT_LANGUAGE) {
      await loadLanguage(DEFAULT_LANGUAGE);
      await loadHints(DEFAULT_LANGUAGE);
    }
    localizeDocument();
    root.dispatchEvent(new CustomEvent('i18n:change', { detail: { language: currentLanguage } }));
  }

  // Startup loads German first as the fallback catalog, then the best browser
  // language match, wires the selector and announces readiness to app.js.
  async function init() {
    await loadLanguage(DEFAULT_LANGUAGE);
    await loadHints(DEFAULT_LANGUAGE);
    const initialLanguage = browserLanguage();
    if (initialLanguage !== DEFAULT_LANGUAGE) {
      await loadLanguage(initialLanguage);
      await loadHints(initialLanguage);
    }
    currentLanguage = initialLanguage;

    const select = document.getElementById('language-select');
    if (select) {
      select.value = currentLanguage;
      select.addEventListener('change', () => {
        setLanguage(select.value).catch(() => setLanguage(DEFAULT_LANGUAGE));
      });
    }
    localizeDocument();
    root.dispatchEvent(new CustomEvent('i18n:ready', { detail: { language: currentLanguage } }));
  }

  root.AppI18n = {
    init,
    setLanguage,
    t,
    hint,
    get language() {
      return currentLanguage;
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    init().catch(() => {
      currentLanguage = DEFAULT_LANGUAGE;
      localizeDocument();
      root.dispatchEvent(new CustomEvent('i18n:ready', { detail: { language: currentLanguage } }));
    });
  });
})(window);
