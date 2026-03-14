import { readFileSync } from 'node:fs';
import type { ManifestType } from '@extension/shared';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

/**
 * Web3Ads Chrome Extension Manifest
 *
 * Privacy-preserving ad rewards using Semaphore zkProofs.
 * Viewers earn 20% of ad revenue by simply browsing with the extension.
 */
const manifest = {
  manifest_version: 3,
  default_locale: 'en',
  name: 'Web3Ads - Earn from Browsing',
  browser_specific_settings: {
    gecko: {
      id: 'web3ads@example.com',
      strict_min_version: '109.0',
    },
  },
  version: packageJson.version,
  description: 'Earn 20% of ad revenue with privacy-preserving zkProofs. Your browsing, your rewards.',
  host_permissions: ['<all_urls>'],
  permissions: ['storage', 'scripting', 'tabs', 'notifications'],
  options_page: 'options/index.html',
  background: {
    service_worker: 'background.js',
    type: 'module',
  },
  action: {
    default_popup: 'popup/index.html',
    default_icon: 'icon-34.png',
  },
  chrome_url_overrides: {
    newtab: 'new-tab/index.html',
  },
  icons: {
    '128': 'icon-128.png',
  },
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*', '<all_urls>'],
      js: ['content/all.iife.js'],
    },
    {
      matches: ['https://example.com/*'],
      js: ['content/example.iife.js'],
    },
    {
      matches: ['http://*/*', 'https://*/*', '<all_urls>'],
      js: ['content-ui/all.iife.js'],
    },
    {
      matches: ['https://example.com/*'],
      js: ['content-ui/example.iife.js'],
    },
    {
      matches: ['http://*/*', 'https://*/*', '<all_urls>'],
      css: ['content.css'],
    },
  ],
  devtools_page: 'devtools/index.html',
  web_accessible_resources: [
    {
      resources: ['*.js', '*.css', '*.svg', 'icon-128.png', 'icon-34.png'],
      matches: ['*://*/*'],
    },
  ],
  side_panel: {
    default_path: 'side-panel/index.html',
  },
} satisfies ManifestType;

export default manifest;
