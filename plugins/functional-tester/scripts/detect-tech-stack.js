#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const pkgPath = path.resolve(process.cwd(), 'package.json');

if (!fs.existsSync(pkgPath)) {
  console.log(JSON.stringify({ error: 'package.json not found', frameworks: [], allDeps: [] }));
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const stack = [];

if (deps['next']) stack.push('Next.js');
else if (deps['react']) stack.push('React');

if (deps['vue'] || deps['nuxt']) stack.push('Vue/Nuxt');
if (deps['svelte'] || deps['@sveltejs/kit']) stack.push('Svelte/SvelteKit');
if (deps['@angular/core']) stack.push('Angular');
if (deps['astro']) stack.push('Astro');
if (deps['vite']) stack.push('Vite');
if (deps['webpack']) stack.push('Webpack');
if (deps['tailwindcss']) stack.push('Tailwind');
if (deps['express']) stack.push('Express');
if (deps['fastify']) stack.push('Fastify');
if (deps['@nestjs/core']) stack.push('NestJS');
if (deps['prisma'] || deps['@prisma/client']) stack.push('Prisma ORM');
if (deps['drizzle-orm']) stack.push('Drizzle ORM');
if (deps['typeorm']) stack.push('TypeORM');
if (deps['sequelize']) stack.push('Sequelize');
if (deps['mongoose'] || deps['mongodb']) stack.push('MongoDB');
if (deps['pg'] || deps['postgres']) stack.push('PostgreSQL');
if (deps['mysql2'] || deps['mysql']) stack.push('MySQL');
if (deps['redis'] || deps['ioredis']) stack.push('Redis');

console.log(JSON.stringify({
  frameworks: stack,
  allDeps: Object.keys(deps).slice(0, 40)
}));
