import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(
  defineConfig({
    title: "Data-Genie 🧞‍♂️",
    description: "High-performant, streaming-first ETL Engine in TypeScript",
    base: '/data-genie/',
    themeConfig: {
      nav: [
        { text: 'Guide', link: '/guide/introduction' },
        { text: 'Cookbook', link: '/cookbook/index' },
        { text: 'API', link: '/api/index' }
      ],
      sidebar: {
        '/guide/': [
          {
            text: 'Introduction',
            items: [
              { text: 'What is Data-Genie?', link: '/guide/introduction' },
              { text: 'Getting Started', link: '/guide/getting-started' },
              { text: 'Architecture', link: '/guide/architecture' }
            ]
          },
          {
            text: 'Core Concepts',
            items: [
              { text: 'Streaming & Memory', link: '/guide/streaming' },
              { text: 'Pipelines', link: '/guide/pipelines' }
            ]
          }
        ],
        '/cookbook/': [
          {
            text: 'Recipes',
            items: [
              { text: 'Introduction', link: '/cookbook/index' },
              { text: 'CSV to PostgreSQL', link: '/cookbook/csv-to-postgres' },
              { text: 'CSV to S3 (JSON/Parquet)', link: '/cookbook/csv-to-s3' },
              { text: 'S3 to JSON', link: '/cookbook/s3-to-json' },
              { text: 'CSV to Parquet', link: '/cookbook/csv-to-parquet' },
              { text: 'Filtering Data', link: '/cookbook/filtering' },
              { text: 'Validation & DLQ', link: '/cookbook/validation-dlq' },
              { text: 'Multi-Sink Parallel', link: '/cookbook/multi-sink' },
              { text: 'Memory & Callbacks', link: '/cookbook/memory-and-callbacks' }
            ]
          }
        ],
        '/api/': [
          {
            text: 'API Reference',
            items: [
              { text: 'Overview', link: '/api/index' },
              { text: 'Readers', link: '/api/readers' },
              { text: 'Writers', link: '/api/writers' },
              { text: 'Transformers', link: '/api/transformers' }
            ]
          }
        ]
      },
      socialLinks: [
        { icon: 'github', link: 'https://github.com/pujansrt/data-genie' }
      ],
      footer: {
        message: 'Released under the MIT License.',
        copyright: 'Copyright © 2024-present Pujan Srivastava'
      }
    },
    mermaid: {
      // mermaidConfig: {
      //   theme: 'forest',
      // }
    }
  })
)
