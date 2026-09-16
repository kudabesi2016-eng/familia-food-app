window.APP_SETTINGS = window.APP_SETTINGS || {};
try {
  const saved = JSON.parse(localStorage.getItem('ff_app_settings_v1') || '{}');
  Object.assign(window.APP_SETTINGS, saved);
  if (saved.brandColor) document.documentElement.style.setProperty('--brand-color', saved.brandColor);
} catch(e) {}
