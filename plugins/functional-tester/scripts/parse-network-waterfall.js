#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const reportPath = path.resolve(process.cwd(), 'lighthouse-report.json');

if (!fs.existsSync(reportPath)) {
  console.log(JSON.stringify({ error: 'lighthouse-report.json not found', totalRequests: 0, apiCalls: [], slowRequests: [] }));
  process.exit(0);
}

const r = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const items = r.audits['network-requests']?.details?.items || [];

const apiCalls = items
  .filter(i => i.resourceType === 'Fetch' || i.resourceType === 'XHR')
  .map(i => ({
    url: i.url,
    duration: Math.round(i.endTime - i.startTime),
    transferSize: i.transferSize,
    statusCode: i.statusCode
  }))
  .sort((a, b) => b.duration - a.duration);

const slowRequests = items
  .filter(i => (i.endTime - i.startTime) > 500)
  .map(i => ({
    url: i.url,
    duration: Math.round(i.endTime - i.startTime),
    type: i.resourceType,
    size: i.transferSize
  }))
  .sort((a, b) => b.duration - a.duration);

console.log(JSON.stringify({
  totalRequests: items.length,
  apiCalls: apiCalls.slice(0, 20),
  slowRequests: slowRequests.slice(0, 10)
}, null, 2));
