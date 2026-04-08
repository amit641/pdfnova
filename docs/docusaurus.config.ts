import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'pdfnova — PDFium-Powered PDF Library for JavaScript',
  tagline: 'Chrome-grade PDF rendering via WebAssembly. Text extraction, search, annotations, forms, and digital signatures — all with full TypeScript types.',
  // favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://amit641.github.io',
  baseUrl: '/pdfnova/',

  organizationName: 'amit641',
  projectName: 'pdfnova',

  onBrokenLinks: 'throw',

  headTags: [
    {
      tagName: 'meta',
      attributes: {
        name: 'description',
        content: 'pdfnova is a PDFium-powered PDF library for JavaScript and TypeScript. Chrome-grade rendering via WebAssembly with text extraction, full-text search, annotations, form filling, and digital signatures.',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'keywords',
        content: 'pdfnova, pdf javascript, pdfium wasm, pdf renderer, pdf viewer, pdf text extraction, pdf search, pdf annotations, pdf forms, digital signatures, webassembly pdf, typescript pdf library, pdf.js alternative',
      },
    },
    {
      tagName: 'meta',
      attributes: { property: 'og:title', content: 'pdfnova — PDFium-Powered PDF Library for JavaScript & TypeScript' },
    },
    {
      tagName: 'meta',
      attributes: { property: 'og:description', content: 'Chrome-grade PDF rendering via WebAssembly. Text extraction, search, annotations, forms, and digital signatures.' },
    },
    {
      tagName: 'meta',
      attributes: { property: 'og:type', content: 'website' },
    },
    {
      tagName: 'meta',
      attributes: { property: 'og:url', content: 'https://amit641.github.io/pdfnova/' },
    },
    {
      tagName: 'meta',
      attributes: { name: 'twitter:card', content: 'summary' },
    },
    {
      tagName: 'meta',
      attributes: { name: 'twitter:title', content: 'pdfnova — PDFium PDF Library for JS/TS' },
    },
    {
      tagName: 'meta',
      attributes: { name: 'twitter:description', content: 'Chrome-grade PDF rendering via WebAssembly. Full TypeScript types. Zero-config WASM loading.' },
    },
  ],

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
          routeBasePath: '/',
          editUrl: 'https://github.com/amit641/pdfnova/tree/main/docs/',
        },
        blog: false,
        sitemap: {
          lastmod: 'date',
          changefreq: 'weekly',
          priority: 0.5,
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'pdfnova',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://www.npmjs.com/package/pdfnova',
          label: 'npm',
          position: 'right',
        },
        {
          href: 'https://github.com/amit641/pdfnova',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/getting-started' },
            { label: 'Rendering', to: '/guides/rendering' },
            { label: 'Text & Search', to: '/guides/text-and-search' },
            { label: 'Annotations', to: '/guides/annotations' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'Forms', to: '/guides/forms' },
            { label: 'Digital Signatures', to: '/guides/signatures' },
            { label: 'Virtual Renderer', to: '/guides/virtual-renderer' },
            { label: 'Worker Pool', to: '/guides/worker-pool' },
          ],
        },
        {
          title: 'Links',
          items: [
            { label: 'GitHub', href: 'https://github.com/amit641/pdfnova' },
            { label: 'npm', href: 'https://www.npmjs.com/package/pdfnova' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} pdfnova. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
