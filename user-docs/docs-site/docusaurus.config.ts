import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'ALGO ZK Oracle',
  tagline: 'Privacy-Enhanced Machine Learning Price Prediction for Algorand',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://docs.algo-zk-oracle.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'oguzhaangumuss', // Usually your GitHub org/user name.
  projectName: 'algo-price-predict', // Usually your repo name.

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/oguzhaangumuss/algo-price-predict/tree/main/user-docs/docs-site/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'ALGO ZK Oracle',
      logo: {
        alt: 'ALGO ZK Oracle Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          to: '/docs/api/overview',
          label: 'API',
          position: 'left',
        },
        {
          to: '/docs/sdk/typescript',
          label: 'SDKs',
          position: 'left',
        },
        {
          href: 'https://github.com/oguzhaangumuss/algo-price-predict',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/intro',
            },
            {
              label: 'API Reference',
              to: '/docs/api/overview',
            },
            {
              label: 'SDK Guides',
              to: '/docs/sdk/typescript',
            },
          ],
        },
        {
          title: 'Resources',
          items: [
            {
              label: 'ZK Privacy Guide',
              to: '/docs/zk-privacy/overview',
            },
            {
              label: 'ML Models',
              to: '/docs/ml-models/ensemble',
            },
            {
              label: 'Examples',
              to: '/docs/examples/basic-usage',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/oguzhaangumuss/algo-price-predict',
            },
            {
              label: 'Issues',
              href: 'https://github.com/oguzhaangumuss/algo-price-predict/issues',
            },
            {
              label: 'Discussions',
              href: 'https://github.com/oguzhaangumuss/algo-price-predict/discussions',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} ALGO ZK Oracle. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
