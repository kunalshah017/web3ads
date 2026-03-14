import { readFileSync } from 'node:fs';
import type { ManifestType } from '@extension/shared';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

/**
 * Web3Ads Chrome Extension Manifest
 *
 * Lightweight extension for privacy-preserving ad rewards.
 * Identity is generated on web3ads.wtf and stored here.
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
  permissions: ['storage', 'tabs'],
  background: {
    service_worker: 'background.js',
    type: 'module',
  },
  action: {
    default_popup: 'popup/index.html',
    default_icon: 'icon-34.png',
  },
  icons: {
    '128': 'icon-128.png',
  },
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*', '<all_urls>'],
      js: ['content/all.iife.js'],
    },
  ],
  web_accessible_resources: [
    {
      resources: ['*.js', '*.css', '*.svg', 'icon-128.png', 'icon-34.png'],
      matches: ['*://*/*'],
    },
  ],
} satisfies ManifestType;

export default manifest;
