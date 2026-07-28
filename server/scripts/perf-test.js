/* eslint-disable no-console */
/**
 * 性能与稳定性测试脚本
 * 对运行中的后端做真实压测，输出延迟分位数(p50/p95/p99)、吞吐、内存趋势
 *
 * 用法: node scripts/perf-test.js [目标URL，默认 http://127.0.0.1:3001]
 * 前置: DB_DIALECT=sqlite PORT=3001 node src/app.js
 */
const http = require('http');

const BASE = process.argv[2] || 'http://127.0.0.1:3001';
const HOST = new URL(BASE).hostname;
const PORT = new URL(BASE).port || 80;

// 核心接口（真实业务链路）
const ENDPOINTS = [
  { name: '健康检查', path: '/health' },
  { name: '首页-热门', path: '/api/v1/recipes/popular?limit=10' },
  { name: '首页-推荐', path: '/api/v1/recipes/recommend?limit=6' },
  { name: '菜谱列表', path: '/api/v1/recipes?page=1&limit=20' },
  { name: '搜索', path: `/api/v1/recipes/search?keyword=${encodeURIComponent('红烧')}&page=1&limit=20` },
  { name: '菜谱详情', path: '/api/v1/recipes/1' },
  { name: '分类树', path: '/api/v1/categories' },
  { name: '相关推荐', path: '/api/v1/recipes/1/related?limit=6' }
];

function req(path) {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    const r = http.request({ host: HOST, port: PORT, path, method: 'GET' }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        // /health 返回 {status:ok}；API 返回 {code:0}。两者判断方式不同
        const isHealth = path.startsWith('/health');
        const ok = isHealth
          ? res.statusCode === 200 && body.includes('"status":"ok"')
          : res.statusCode === 200 && body.includes('"code":0');
        resolve({ ms, status: res.statusCode, ok });
      });
    });
    r.on('error', () => resolve({ ms: -1, status: 0, ok: false }));
    r.setTimeout(5000, () => { r.destroy(); resolve({ ms: -1, status: 0, ok: false }); });
    r.end();
  });
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

async function benchEndpoint(ep, iterations, concurrency) {
  const latencies = [];
  let errors = 0;
  const t0 = Date.now();

  // 简单并发控制：分批发送
  for (let i = 0; i < iterations; i += concurrency) {
    const batch = Array.from({ length: Math.min(concurrency, iterations - i) }, () => req(ep.path));
    const results = await Promise.all(batch);
    results.forEach((r) => {
      if (r.ok) latencies.push(r.ms);
      else errors++;
    });
  }
  const elapsed = (Date.now() - t0) / 1000;
  latencies.sort((a, b) => a - b);

  return {
    name: ep.name,
    path: ep.path,
    total: iterations,
    errors,
    rps: (iterations / elapsed).toFixed(1),
    p50: percentile(latencies, 0.5).toFixed(1),
    p95: percentile(latencies, 0.95).toFixed(1),
    p99: percentile(latencies, 0.99).toFixed(1),
    max: (latencies[latencies.length - 1] || 0).toFixed(1)
  };
}

async function main() {
  console.log('=== 后端性能测试 ===');
  console.log(`目标: ${BASE}\n`);

  // 预热
  console.log('预热中...');
  for (const ep of ENDPOINTS) await req(ep.path);

  // 单接口延迟基准（串行，低并发，反映真实单次延迟）
  console.log('\n--- 接口延迟基准 (每接口50次, 并发5) ---');
  const results = [];
  for (const ep of ENDPOINTS) {
    const r = await benchEndpoint(ep, 50, 5);
    results.push(r);
    console.log(`${r.name.padEnd(10)} p50=${r.p50}ms p95=${r.p95}ms p99=${r.p99}ms max=${r.max}ms err=${r.errors} rps=${r.rps}`);
  }

  // 持续稳定性：混合负载 60 秒
  console.log('\n--- 持续稳定性测试 (混合负载 60s, 并发10) ---');
  const stabilityWindow = 60000;
  const start = Date.now();
  let total = 0, okCount = 0, failCount = 0;
  const perSecond = [];
  let secStart = Date.now(), secCount = 0, secOk = 0;

  while (Date.now() - start < stabilityWindow) {
    const batch = Array.from({ length: 10 }, () => {
      const ep = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
      return req(ep.path);
    });
    const res = await Promise.all(batch);
    res.forEach((r) => { total++; secCount++; if (r.ok) { okCount++; secOk++; } else failCount++; });
    if (Date.now() - secStart >= 1000) {
      perSecond.push({ t: Math.round((secStart - start) / 1000), rps: secCount, ok: secOk });
      secStart = Date.now(); secCount = 0; secOk = 0;
    }
  }

  const rpsValues = perSecond.map((p) => p.rps);
  const avgRps = (rpsValues.reduce((a, b) => a + b, 0) / rpsValues.length).toFixed(1);
  const minRps = Math.min(...rpsValues);
  const maxRps = Math.max(...rpsValues);

  console.log(`总请求: ${total}, 成功: ${okCount}, 失败: ${failCount}, 成功率: ${(okCount / total * 100).toFixed(2)}%`);
  console.log(`RPS: 平均=${avgRps} 最小=${minRps} 最大=${maxRps}`);
  // 输出前10秒与后10秒的RPS对比，观察是否有衰减
  const first10 = perSecond.slice(0, 10).map((p) => p.rps);
  const last10 = perSecond.slice(-10).map((p) => p.rps);
  const avgFirst = (first10.reduce((a, b) => a + b, 0) / first10.length).toFixed(1);
  const avgLast = (last10.reduce((a, b) => a + b, 0) / last10.length).toFixed(1);
  console.log(`前10s平均RPS=${avgFirst}, 后10s平均RPS=${avgLast} (${avgLast >= avgFirst * 0.9 ? '无明显衰减' : '⚠️ 有衰减'})`);

  // 汇总 JSON
  const report = {
    testedAt: new Date().toISOString(),
    target: BASE,
    note: 'SQLite单文件数据库, 无Redis(降级穿透), 开发机本地测试',
    latency: results,
    stability: {
      durationSec: 60,
      concurrency: 10,
      totalRequests: total,
      success: okCount,
      failed: failCount,
      successRate: (okCount / total * 100).toFixed(2) + '%',
      avgRps, minRps, maxRps,
      first10sAvgRps: avgFirst,
      last10sAvgRps: avgLast,
      perSecond
    }
  };
  const fs = require('fs');
  const path = require('path');
  const outPath = path.join(__dirname, '..', 'data', 'perf-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\n报告已写入: ${outPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
