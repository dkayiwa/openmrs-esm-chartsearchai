const reactI18next = require('react-i18next');

// i18next HTML-escapes every string it interpolates unless the call passes
// `interpolation: { escapeValue: false }`, and the app shell leaves that default on. React then
// escapes the text again, so an escaped value reaches the screen as its entity: an order named
// "Solu-Medrol 125mg/5ml" was drawn "Solu-Medrol 125mg&#x2F;5ml". Emulated with i18next's own
// entity map, so a test sees what the user sees.
const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;' };

function escapeForHtml(value) {
  return typeof value === 'string' ? value.replace(/[&<>"'\/]/g, (c) => ENTITIES[c]) : String(value);
}

// Substitutes i18next's {{name}} placeholders from the options object, so a test asserting an
// interpolated string sees what the user sees ("Interaction pairs shown: 5 of 5.") rather than
// the raw template — escaped as i18next escapes it, above.
function interpolate(text, options) {
  if (!options || typeof text !== 'string') return text;
  const escapes = options.interpolation?.escapeValue !== false;
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name) =>
    name in options ? (escapes ? escapeForHtml(options[name]) : String(options[name])) : match,
  );
}

// English plural selection, the one other piece of i18next the panel relies on: a call passing
// `count` reads its `_other` form — `defaultValue_other` where the call gives one — for any count but 1.
function pluralDefault(defaultValue, options) {
  if (options && typeof options.count === 'number' && options.count !== 1 && options.defaultValue_other) {
    return options.defaultValue_other;
  }
  return defaultValue;
}

module.exports = {
  ...reactI18next,
  useTranslation: () => ({
    t: (key, defaultValue, options) => interpolate(pluralDefault(defaultValue, options) ?? key, options),
    i18n: { language: 'en' },
  }),
};
