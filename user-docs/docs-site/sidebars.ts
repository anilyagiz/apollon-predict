import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/overview',
        'api/authentication',
        'api/endpoints',
        'api/responses',
      ],
    },
    {
      type: 'category',
      label: 'SDK Guides',
      items: [
        'sdk/typescript',
        'sdk/python',
        'sdk/error-handling',
      ],
    },
    {
      type: 'category',
      label: 'ZK Privacy',
      items: [
        'zk-privacy/overview',
        'zk-privacy/proof-generation',
        'zk-privacy/verification',
      ],
    },
    {
      type: 'category',
      label: 'ML Models',
      items: [
        'ml-models/ensemble',
        'ml-models/lstm-gru',
        'ml-models/prophet-xgboost',
      ],
    },
    {
      type: 'category',
      label: 'Examples',
      items: [
        'examples/basic-usage',
        'examples/advanced-integration',
        'examples/production-deployment',
      ],
    },
  ],
};

export default sidebars;
