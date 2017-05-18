const paths = require('../config/paths');

const jsEntries = Object.keys(paths.entrypoints).reduce((carry, key) => {
  const entry = paths.entrypoints[key];
  const entryArray = Array.isArray(entry) ? entry : [entry];
  const jsEntryArray = entryArray.filter(v => v.endsWith('.js'));

  return [...carry, ...jsEntryArray];
}, []);

module.exports = function hmrAlamoLoader(content) {
  // eslint-disable-next-line
  if (!jsEntries.includes(this._module.resource)) {
    return content;
  }

  const alamo = `
    // If we reached this module (the entry point), it means no one accepted the HRM.
    // Let's reload the page then.
    if (module.hot) {
      module.hot.accept();

      // On first load, module.hot.data is undefined since it is not an update...
      // So if we do have a data object, it means we've been HMR'ed.
      if (module.hot.data) {
        // eslint-disable-next-line
        window.__foobarify_should_reload__ = true;
      }
    }
  `;

  return `${content}\n\n${alamo}`;
};