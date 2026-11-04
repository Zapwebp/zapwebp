'use strict';

const fs = require('fs');
const path = require('path');

const repoMap = {
  'apps/vscode': 'vscode',
  'packages/core': 'core',
  'packages/cli': 'cli',
  'packages/mcp': 'mcp',
  'packages/ui': 'ui',
  'packages/storage': 'storage',
  'packages/crop': 'crop',
  'packages/edge': 'edge',
  'packages/lens': 'lens',
  'packages/sdk': 'sdk',
  'packages/plugin-sdk': 'plugin-sdk',
  'packages/features': 'features',
  'packages/shared': 'shared',
  'packages/config': 'config',
  'packages/api': 'api',
  'packages/create-zapwebp': 'create-zapwebp',
  'packages/vite': 'vite',
  'packages/next': 'next',
  'packages/github-action': 'github-action',
  'packages/laravel': 'laravel',
  'zapwebp-docs': 'docs',
  '.': 'zapwebp'
};

// 1. Update package.json files
for (const [pkgDir, repoName] of Object.entries(repoMap)) {
  const pkgFile = path.join(pkgDir, 'package.json');
  if (fs.existsSync(pkgFile)) {
    const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
    
    // Update repository
    pkg.repository = {
      type: 'git',
      url: `https://github.com/Zapwebp/${repoName}.git`
    };
    pkg.bugs = {
      url: `https://github.com/Zapwebp/${repoName}/issues`
    };
    pkg.homepage = pkgDir === 'zapwebp-docs' 
      ? 'https://zapwebp-docs.vercel.app' 
      : 'https://zapwebp.vercel.app';
    
    // VS Code publisher enforcement
    if (pkgDir === 'apps/vscode') {
      pkg.publisher = 'ebula';
    }

    // Ensure author and license
    if (!pkg.author) {
      pkg.author = 'Eldrex Delos Reyes Bula <eldrexdelosreyesbula@gmail.com>';
    }
    if (!pkg.license) {
      pkg.license = 'MIT';
    }

    fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log(`Updated ${pkgFile} -> repository: https://github.com/Zapwebp/${repoName}`);
  }

  // Also check agent.json
  const agentFile = path.join(pkgDir, 'agent.json');
  if (fs.existsSync(agentFile)) {
    const agent = JSON.parse(fs.readFileSync(agentFile, 'utf8'));
    agent.repository = `https://github.com/Zapwebp/${repoName}`;
    fs.writeFileSync(agentFile, JSON.stringify(agent, null, 2) + '\n', 'utf8');
    console.log(`Updated ${agentFile} -> repository: https://github.com/Zapwebp/${repoName}`);
  }
}

// 2. Also check composer.json for packages/laravel
const composerFile = 'packages/laravel/composer.json';
if (fs.existsSync(composerFile)) {
  const comp = JSON.parse(fs.readFileSync(composerFile, 'utf8'));
  comp.support = {
    issues: 'https://github.com/Zapwebp/laravel/issues',
    source: 'https://github.com/Zapwebp/laravel'
  };
  fs.writeFileSync(composerFile, JSON.stringify(comp, null, 2) + '\n', 'utf8');
  console.log(`Updated ${composerFile}`);
}

// 3. Ensure packages/laravel has a package.json for workspace consistency
const laravelPkg = 'packages/laravel/package.json';
if (!fs.existsSync(laravelPkg)) {
  const pkg = {
    name: '@zapwebp/laravel',
    version: '1.0.0',
    description: 'Official Laravel integration for Zapwebp transparency-safe image conversion engine.',
    license: 'MIT',
    author: 'Eldrex Delos Reyes Bula <eldrexdelosreyesbula@gmail.com>',
    homepage: 'https://zapwebp.vercel.app',
    repository: {
      type: 'git',
      url: 'https://github.com/Zapwebp/laravel.git'
    },
    bugs: {
      url: 'https://github.com/Zapwebp/laravel/issues'
    },
    keywords: ['laravel', 'php', 'image', 'webp', 'avif', 'converter']
  };
  fs.writeFileSync(laravelPkg, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`Created ${laravelPkg}`);
}

