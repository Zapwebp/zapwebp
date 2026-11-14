import { start, navigate } from './router';
import { shell } from './shell';
import { initSearchModal, searchDocs } from './search';

const app = document.getElementById('app');
if (!app) throw new Error('Missing #app container');

const content = document.createElement('article');
content.id = 'docs-content';
content.className = 'docs-article';

app.appendChild(shell(content));

// Initialize Command Palette / Search Modal
const search = initSearchModal(navigate);

// Connect search trigger button in header
const searchBtn = document.getElementById('search-trigger-btn');
if (searchBtn) {
  searchBtn.addEventListener('click', () => {
    search.open();
  });
}

// Start client-side SPA router
start(content);

// WebMCP (Web Model Context Protocol): Expose structured tools for in-browser AI agents
interface ModelContext {
  registerTool(tool: {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    execute: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>;
  }): void;
}

declare global {
  interface Navigator {
    modelContext?: ModelContext;
  }
}

if (typeof navigator !== 'undefined' && navigator.modelContext && typeof navigator.modelContext.registerTool === 'function') {
  try {
    navigator.modelContext.registerTool({
      name: 'search_documentation',
      description: 'Search Zapwebp documentation guides, SDK references, error codes, and configuration options.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Technical query or topic (e.g. "alpha preservation", "mcp tools", "error E_UNSAFE_SVG")' }
        },
        required: ['query']
      },
      execute: async (args: Record<string, unknown>) => {
        const query = String(args.query || '');
        const results = searchDocs(query).slice(0, 5).map((r) => ({
          title: r.route.title,
          path: `https://zapwebp-docs.vercel.app${r.route.path}`,
          description: r.route.description,
          category: r.route.category
        }));
        return {
          content: [{ type: 'text', text: JSON.stringify(results) }]
        };
      }
    });

    navigator.modelContext.registerTool({
      name: 'navigate_documentation',
      description: 'Navigate the browser to a specific Zapwebp documentation page by path or slug.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Destination route (e.g. "/docs", "/api", "/mcp", "/errors")' }
        },
        required: ['path']
      },
      execute: async (args: Record<string, unknown>) => {
        const targetPath = String(args.path || '/docs');
        navigate(targetPath);
        return {
          content: [{ type: 'text', text: JSON.stringify({ navigated: true, path: targetPath }) }]
        };
      }
    });
  } catch (_) {
    // Non-blocking progressive enhancement
  }
}

