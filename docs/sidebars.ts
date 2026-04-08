import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    'getting-started',
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/rendering',
        'guides/text-and-search',
        'guides/annotations',
        'guides/forms',
        'guides/signatures',
        'guides/virtual-renderer',
        'guides/worker-pool',
        'guides/wasm-loading',
      ],
    },
    'api-reference',
  ],
};

export default sidebars;
