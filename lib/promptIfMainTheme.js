/* eslint-disable no-console */
const prompt = require('prompt');
const https = require('https');
const config = require('../config');

const promptSchema = {
  properties: {
    confirm: {
      description: 'You are about to deploy to the main theme. Continue (Y/n) ?',
    },
  },
};

let mainThemeId;

function fetchMainThemeId(env) {
  return new Promise((resolve, reject) => {
    const c = config.shopify[env];

    https.get({
      hostname: c.store,
      path: '/admin/themes.json',
      auth: `${c.api_key}:${c.password}`,
      agent: false,
    }, (res) => {
      let body = '';

      res.on('data', datum => (body += datum));

      res.on('end', () => {
        const parsed = JSON.parse(body);

        if (parsed.errors) {
          reject(parsed.errors);
          return;
        }

        if (!Array.isArray(parsed.themes)) {
          reject('Shopify response for /admin/themes.json is not an array.');
          return;
        }

        const mainTheme = parsed.themes.find(t => t.role === 'main');

        if (!mainTheme) {
          reject('No main theme in response.');
          return;
        }

        resolve(mainTheme.id);
      });
    });
  });
}

function promptIfMainTheme(env) {
  return new Promise((resolve, reject) => {
    const c = config.shopify[env];

    if (!c.api_key) {
      console.warn(`The "${env}" environment in config/shopify.yml does not specify an "api_key". Skipping check for if is main theme.`);
      resolve();
      return;
    }

    const askForConfirmation = () => {
      prompt.start();
      prompt.get(promptSchema, (err, res) => {
        if (res.confirm === 'Y') {
          resolve();
          return;
        }

        reject('Aborting. You aborted the deploy.');
      });
    };

    // c.theme_id is live or equal to mainThemeId
    if (c.theme_id === 'live' || (mainThemeId && mainThemeId === c.theme_id)) {
      askForConfirmation();
      return;
    }

    // we have a mainThemeId and it's not c.theme_id
    if (mainThemeId && mainThemeId !== c.theme_id) {
      resolve();
      return;
    }

    fetchMainThemeId(env)
      .then((id) => {
        mainThemeId = id;
        promptIfMainTheme(env).then(resolve).catch(reject);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

module.exports = promptIfMainTheme;