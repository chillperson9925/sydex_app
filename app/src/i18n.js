class I18nManager {
  constructor() {
    this.locales = window.locales || {};
    // Default to 'en' as requested
    this.currentLanguage = localStorage.getItem('sydex_language') || 'en';
    
    // Ensure fallback
    if (!this.locales[this.currentLanguage]) {
      this.currentLanguage = 'en';
    }
  }

  setLanguage(lang) {
    if (this.locales[lang]) {
      this.currentLanguage = lang;
      localStorage.setItem('sydex_language', lang);
      this.updateDOM();
      
      // Dispatch an event so other scripts can react (like updating dynamic placeholders)
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
    }
  }

  getLanguage() {
    return this.currentLanguage;
  }

  t(key, params = {}) {
    let str = this.locales[this.currentLanguage]?.[key] || this.locales['en']?.[key] || key;
    
    // Simple template replacement if params are provided
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`{${k}}`, 'g'), v);
    }
    
    return str;
  }

  updateDOM(root = document) {
    const elements = root.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.innerHTML = this.t(key);
      }
    });

    const placeholders = root.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.setAttribute('placeholder', this.t(key));
      }
    });
    
    const tooltips = root.querySelectorAll('[data-i18n-tooltip]');
    tooltips.forEach(el => {
      const key = el.getAttribute('data-i18n-tooltip');
      if (key) {
        el.setAttribute('data-tooltip', this.t(key));
      }
    });
  }
}

// Initialize globally
window.i18n = new I18nManager();

// Automatically update DOM once loaded
document.addEventListener('DOMContentLoaded', () => {
  window.i18n.updateDOM();
});
