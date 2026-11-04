import { start, navigate } from './router';
import { shell } from './shell';
import { initSearchModal } from './search';

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
