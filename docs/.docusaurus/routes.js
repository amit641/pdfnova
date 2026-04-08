import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/pdfnova/',
    component: ComponentCreator('/pdfnova/', '110'),
    routes: [
      {
        path: '/pdfnova/',
        component: ComponentCreator('/pdfnova/', '212'),
        routes: [
          {
            path: '/pdfnova/',
            component: ComponentCreator('/pdfnova/', '672'),
            routes: [
              {
                path: '/pdfnova/api-reference',
                component: ComponentCreator('/pdfnova/api-reference', 'dab'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/pdfnova/getting-started',
                component: ComponentCreator('/pdfnova/getting-started', '27e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/pdfnova/guides/annotations',
                component: ComponentCreator('/pdfnova/guides/annotations', 'fbd'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/pdfnova/guides/forms',
                component: ComponentCreator('/pdfnova/guides/forms', '79b'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/pdfnova/guides/rendering',
                component: ComponentCreator('/pdfnova/guides/rendering', '886'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/pdfnova/guides/signatures',
                component: ComponentCreator('/pdfnova/guides/signatures', '065'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/pdfnova/guides/text-and-search',
                component: ComponentCreator('/pdfnova/guides/text-and-search', '67d'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/pdfnova/guides/virtual-renderer',
                component: ComponentCreator('/pdfnova/guides/virtual-renderer', 'de3'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/pdfnova/guides/wasm-loading',
                component: ComponentCreator('/pdfnova/guides/wasm-loading', '5f8'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/pdfnova/guides/worker-pool',
                component: ComponentCreator('/pdfnova/guides/worker-pool', 'b0e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/pdfnova/',
                component: ComponentCreator('/pdfnova/', '6ed'),
                exact: true,
                sidebar: "docsSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
