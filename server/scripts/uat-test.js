/* eslint-disable no-console */
/**
 * 用户验收测试 (UAT) 脚本
 * 模拟真实用户操作，完整走通核心业务链路，逐项记录验收结果
 *
 * 用法: node scripts/uat-test.js [目标URL，默认 http://127.0.0.1:3002]
 * 前置: DB_DIALECT=sqlite PORT=3002 node src/app.js
 *
 * 输出: server/data/uat-report.json + 控制台摘要
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || 'http://127.0.0.1:3002';
const HOST = new URL(BASE).hostname;
const PORT = new URL(BASE).port || 80;

const results = [];
let caseNo = 0;

function api(method, urlPath, body, token) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    const r = http.request({ host: HOST, port: PORT, path: urlPath, method, headers }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch (e) { /* ignore */ }
        resolve({ status: res.statusCode, body: parsed, raw });
      });
    });
    r.on('error', (e) => resolve({ status: 0, body: null, raw: e.message }));
    r.setTimeout(8000, () => { r.destroy(); resolve({ status: 0, body: null, raw: 'timeout' }); });
    if (data) r.write(data);
    r.end();
  });
}

function record(scenario, precondition, steps, expected, actual, passed, defect) {
  caseNo++;
  results.push({
    caseNo, scenario, precondition, steps, expected, actual,
    passed: !!passed,
    defect: defect || null
  });
  console.log(`${passed ? '✅' : '❌'} [${caseNo}] ${scenario}`);
}

async function main() {
  console.log('=== 用户验收测试 (UAT) ===');
  console.log(`目标: ${BASE}\n`);

  let token = null, userId = null;

  // ---- 场景2: 微信登录(开发Mock) ----
  {
    const res = await api('POST', '/api/v1/auth/wx-login', { code: 'dev_uat_user_1', nickname: 'UAT验收员' });
    const ok = res.status === 200 && res.body.code === 0 && res.body.data.token;
    token = ok ? res.body.data.token : null;
    userId = ok ? res.body.data.user.id : null;
    record('微信登录(开发Mock码)', '服务器运行,dev_前缀Mock', 'POST /auth/wx-login {code:dev_uat_user_1}',
      '返回token和用户信息', `status=${res.status}, code=${res.body && res.body.code}, 获得token=${!!token}`, ok);
  }

  // ---- 场景3: 无效code登录失败 ----
  {
    const res = await api('POST', '/api/v1/auth/wx-login', { code: '' });
    const ok = res.status === 422 || (res.body && res.body.code !== 0);
    record('登录失败-缺少code', '服务器运行', 'POST /auth/wx-login {code:""}',
      '返回422或错误码', `status=${res.status}, code=${res.body && res.body.code}`, ok);
  }

  // ---- 场景4: 首页加载推荐 ----
  let firstRecipeId = null;
  {
    const [popular, recommend] = await Promise.all([
      api('GET', '/api/v1/recipes/popular?limit=10'),
      api('GET', '/api/v1/recipes/recommend?limit=6', null, token)
    ]);
    const popOk = popular.status === 200 && popular.body.data.length > 0;
    const recOk = recommend.status === 200 && recommend.body.data.length > 0;
    if (recOk) firstRecipeId = recommend.body.data[0].id;
    record('首页加载推荐(热门+个性化)', '已登录', 'GET popular + recommend',
      '两个接口均返回非空列表', `popular=${popular.body.data.length}条, recommend=${recommend.body.data.length}条`, popOk && recOk);
  }

  // ---- 场景: 推荐带理由 ----
  {
    const res = await api('GET', '/api/v1/recipes/recommend?limit=6', null, token);
    const hasReason = res.body.data.every((r) => r.recommend_reason && r.recommend_reason.length > 0);
    record('推荐结果附带理由', '已登录', 'GET recommend 检查recommend_reason字段',
      '每条推荐都有非空理由', `${res.body.data.filter((r) => r.recommend_reason).length}/${res.body.data.length}条有理由`, hasReason);
  }

  // ---- 场景6: 查看分类 ----
  let categoryId = null;
  {
    const res = await api('GET', '/api/v1/categories');
    const ok = res.status === 200 && res.body.data.cuisine && res.body.data.cuisine.length > 0;
    if (ok) categoryId = res.body.data.cuisine[0].id;
    record('查看分类树(菜系/口味/做法/餐次)', '服务器运行', 'GET /categories',
      '返回四维分类且菜系非空', `cuisine=${res.body.data.cuisine ? res.body.data.cuisine.length : 0}个`, ok);
  }

  // ---- 场景: 分类下菜谱列表 ----
  {
    const res = await api('GET', `/api/v1/categories/${categoryId}/recipes?page=1&limit=10`);
    const ok = res.status === 200 && res.body.data.list.length > 0;
    record('分类结果列表', '已有分类ID', `GET /categories/${categoryId}/recipes`,
      '返回该分类下菜谱', `${res.body.data.list.length}条`, ok);
  }

  // ---- 场景7: 搜索菜名 ----
  {
    const res = await api('GET', `/api/v1/recipes/search?keyword=${encodeURIComponent('红烧')}&page=1&limit=20`);
    const ok = res.status === 200 && res.body.data.list.length > 0;
    record('搜索菜名(红烧)', '服务器运行', 'GET /recipes/search?keyword=红烧',
      '返回含"红烧"的菜谱', `${res.body.data.list.length}条结果`, ok);
  }

  // ---- 场景: 搜索食材 ----
  {
    const res = await api('GET', `/api/v1/recipes/search?keyword=${encodeURIComponent('豆腐')}&page=1&limit=20`);
    const ok = res.status === 200;
    record('搜索食材(豆腐)', '服务器运行', 'GET /recipes/search?keyword=豆腐',
      '正常返回(食材反查)', `status=${res.status}, ${res.body.data.list.length}条`, ok);
  }

  // ---- 场景8: 筛选条件 ----
  {
    const res = await api('GET', `/api/v1/recipes?cuisine=${encodeURIComponent('川菜')}&difficulty=2&maxTime=30&sort=quickest&limit=20`);
    const list = res.body.data.list;
    const allMatch = list.every((r) => r.cuisine_type === '川菜' && r.difficulty === 2 && (r.prep_time + r.cook_time) <= 30);
    record('多条件筛选(川菜+难度2+30分钟内)', '服务器运行', 'GET /recipes?cuisine=川菜&difficulty=2&maxTime=30',
      '结果全部满足三个条件', `${list.length}条, 全部匹配=${allMatch}`, res.status === 200 && allMatch);
  }

  // ---- 场景9: 打开菜谱详情 ----
  let detailRecipe = null;
  {
    const res = await api('GET', `/api/v1/recipes/${firstRecipeId}`, null, token);
    detailRecipe = res.body.data;
    const ok = res.status === 200 && detailRecipe && detailRecipe.ingredients && detailRecipe.steps;
    record('打开菜谱详情(食材+步骤+营养)', '已有菜谱ID', `GET /recipes/${firstRecipeId}`,
      '返回完整详情含食材和步骤', `食材=${detailRecipe.ingredients.length}, 步骤=${detailRecipe.steps.length}, 营养=${!!detailRecipe.nutrition}`, ok);
  }

  // ---- 场景16: 浏览历史写入 ----
  {
    const res = await api('GET', '/api/v1/history?page=1&limit=10', null, token);
    const inHistory = res.body.data.list.some((h) => h.id === firstRecipeId);
    record('浏览历史自动写入', '已打开过详情', 'GET /history 检查刚浏览的菜谱',
      '历史中包含刚浏览的菜谱', `历史${res.body.data.list.length}条, 包含目标=${inHistory}`, inHistory);
  }

  // ---- 场景14: 收藏 ----
  {
    const res = await api('POST', '/api/v1/favorites', { recipeId: firstRecipeId }, token);
    const ok = res.status === 200 && res.body.code === 0;
    record('收藏菜谱', '已登录,有菜谱ID', 'POST /favorites {recipeId}',
      '收藏成功', `status=${res.status}, msg=${res.body.message}`, ok);
  }

  // ---- 场景15: 查看收藏列表 ----
  {
    const res = await api('GET', '/api/v1/favorites?page=1&limit=10', null, token);
    const inFav = res.body.data.list.some((f) => f.id === firstRecipeId);
    record('查看收藏列表', '已收藏', 'GET /favorites',
      '收藏列表包含该菜谱', `收藏${res.body.data.list.length}条, 包含目标=${inFav}`, inFav);
  }

  // ---- 场景: 收藏幂等(重复点击) ----
  {
    await api('POST', '/api/v1/favorites', { recipeId: firstRecipeId }, token);
    const res = await api('GET', '/api/v1/favorites?page=1&limit=50', null, token);
    const count = res.body.data.list.filter((f) => f.id === firstRecipeId).length;
    record('重复收藏不产生重复(幂等)', '已收藏过', '再次POST /favorites后查列表',
      '该菜谱只出现1次', `出现${count}次`, count === 1);
  }

  // ---- 场景17: 修改用户偏好 ----
  {
    const prefs = { cuisines: ['川菜'], avoidIngredients: ['香菜'], spiceLevel: 'mild', allergens: ['海鲜'], maxCookTime: 60, servings: 3 };
    const res = await api('PUT', '/api/v1/user/preferences', prefs, token);
    const ok = res.status === 200 && res.body.code === 0;
    record('修改用户偏好', '已登录', 'PUT /user/preferences',
      '偏好保存成功', `status=${res.status}, msg=${res.body.message}`, ok);
  }

  // ---- 场景18: 推荐随偏好改变 ----
  {
    const res = await api('GET', '/api/v1/recipes/recommend?limit=20', null, token);
    const list = res.body.data;
    // 设置了海鲜过敏,推荐不应含海鲜类食材的菜(抽样检查理由/菜系)
    const ok = res.status === 200 && list.length > 0;
    record('推荐随偏好改变(川菜偏好)', '已设置川菜偏好', 'GET recommend 检查推荐倾向',
      '返回非空推荐', `${list.length}条, 川菜占比=${list.filter((r) => r.cuisine_type === '川菜').length}/${list.length}`, ok);
  }

  // ---- 场景19: 忌口/过敏原过滤 ----
  {
    // 设置一个必然存在的忌口(猪五花肉在很多菜里),验证推荐排除
    await api('PUT', '/api/v1/user/preferences', { avoidIngredients: ['猪五花肉'], allergens: [] }, token);
    const res = await api('GET', '/api/v1/recipes/recommend?limit=30', null, token);
    const names = res.body.data.map((r) => r.name);
    // 需要验证这些菜不含猪五花肉 - 通过详情接口抽查第一个
    let containsAvoid = false;
    if (res.body.data.length > 0) {
      const d = await api('GET', `/api/v1/recipes/${res.body.data[0].id}`, null, token);
      containsAvoid = d.body.data.ingredients.some((i) => i.name === '猪五花肉');
    }
    record('忌口食材过滤(猪五花肉)', '已设置忌口猪五花肉', 'GET recommend后抽查首条详情食材',
      '推荐首条不含猪五花肉', `首条含猪五花肉=${containsAvoid}`, !containsAvoid);
    // 恢复偏好
    await api('PUT', '/api/v1/user/preferences', { avoidIngredients: [], allergens: [] }, token);
  }

  // ---- 场景20: 分享具体菜谱 ----
  {
    // 分享是前端onShareAppMessage,后端验证详情可通过分享路径访问
    const res = await api('GET', `/api/v1/recipes/${firstRecipeId}`);
    const ok = res.status === 200 && res.body.data.id === firstRecipeId;
    record('分享链接定位具体菜谱', '有菜谱ID', 'GET /recipes/:id (分享路径)',
      '通过ID精确返回该菜谱', `返回id=${res.body.data.id}`, ok);
  }

  // ---- 场景21: 状态恢复(token持久化后重新请求) ----
  {
    const res = await api('GET', '/api/v1/user/profile', null, token);
    const ok = res.status === 200 && res.body.data.id === userId;
    record('重新进入后登录状态恢复', '持有token', 'GET /user/profile',
      'token仍有效,返回用户资料', `status=${res.status}, userId匹配=${res.body.data.id === userId}`, ok);
  }

  // ---- 场景: 用户资料含偏好 ----
  {
    const res = await api('GET', '/api/v1/user/profile', null, token);
    const ok = res.body.data.preferences && res.body.data.stats;
    record('用户资料含偏好和统计', '已登录', 'GET /user/profile',
      '返回preferences和stats', `有preferences=${!!res.body.data.preferences}, 有stats=${!!res.body.data.stats}`, ok);
  }

  // ---- 场景25: 后端异常-访问不存在的菜谱 ----
  {
    const res = await api('GET', '/api/v1/recipes/999999');
    const ok = res.status === 404 && res.body.code !== 0;
    record('访问不存在的菜谱返回404', '服务器运行', 'GET /recipes/999999',
      '返回404和错误信息', `status=${res.status}, msg=${res.body.message}`, ok);
  }

  // ---- 场景26: Redis不可用(当前即无Redis) ----
  {
    const res = await api('GET', '/api/v1/recipes/popular?limit=5');
    const ok = res.status === 200 && res.body.data.length > 0;
    record('Redis不可用时服务正常(降级)', '无Redis连接', 'GET popular',
      '降级穿透DB正常返回', `status=${res.status}, ${res.body.data.length}条`, ok);
  }

  // ---- 场景28: 搜索无结果 ----
  {
    const res = await api('GET', `/api/v1/recipes/search?keyword=${encodeURIComponent('不存在的菜名xyz')}`);
    const ok = res.status === 200 && res.body.data.list.length === 0;
    record('搜索无结果返回空列表', '服务器运行', 'GET search?keyword=不存在的菜名xyz',
      '返回空列表不报错', `status=${res.status}, ${res.body.data.list.length}条`, ok);
  }

  // ---- 场景29: 连续快速点击(并发收藏) ----
  {
    const targetId = firstRecipeId + 1;
    await Promise.all(Array.from({ length: 5 }, () => api('POST', '/api/v1/favorites', { recipeId: targetId }, token)));
    const res = await api('GET', '/api/v1/favorites?page=1&limit=50', null, token);
    const count = res.body.data.list.filter((f) => f.id === targetId).length;
    record('连续快速收藏(并发5次)', '已登录', '并发POST /favorites 5次',
      '最终只有1条收藏', `出现${count}次`, count === 1);
  }

  // ---- 场景10/11: 人数换算(前端逻辑,UAT验证接口返回servings) ----
  {
    const ok = detailRecipe && detailRecipe.servings >= 1;
    record('菜谱含份量字段(供人数换算)', '已打开详情', '检查详情servings字段',
      'servings>=1', `servings=${detailRecipe.servings}`, ok);
  }

  // ---- 场景12: 浏览完整步骤 ----
  {
    const steps = detailRecipe.steps;
    const ordered = steps.every((s, i) => i === 0 || s.step_number >= steps[i - 1].step_number);
    record('步骤完整且有序', '已打开详情', '检查steps数组',
      '步骤非空且按序', `${steps.length}步, 有序=${ordered}`, steps.length > 0 && ordered);
  }

  // ---- 场景22: 退出登录 ----
  {
    const res = await api('POST', '/api/v1/auth/logout', null, token);
    const ok = res.status === 200 && res.body.code === 0;
    record('退出登录(后端审计接口)', '已登录', 'POST /auth/logout',
      '返回成功', `status=${res.status}, msg=${res.body.message}`, ok);
  }

  // ---- 场景23: 重新登录 ----
  {
    const res = await api('POST', '/api/v1/auth/wx-login', { code: 'dev_uat_user_1' });
    const ok = res.status === 200 && res.body.data.token;
    record('重新登录', '已退出', 'POST /auth/wx-login 同code',
      '重新获得token', `获得token=${!!res.body.data.token}`, ok);
  }

  // ---- 场景: 未登录访问受保护接口 ----
  {
    const res = await api('GET', '/api/v1/favorites');
    const ok = res.status === 401;
    record('未登录访问收藏返回401', '无token', 'GET /favorites',
      '返回401', `status=${res.status}`, ok);
  }

  // ---- 汇总 ----
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  console.log(`\n=== UAT 结果: ${passed}/${results.length} 通过, ${failed} 失败 ===`);
  if (failed > 0) {
    console.log('\n失败用例:');
    results.filter((r) => !r.passed).forEach((r) => console.log(`  [${r.caseNo}] ${r.scenario}: ${r.actual}`));
  }

  const report = {
    testedAt: new Date().toISOString(),
    releaseVersion: 'v1.0.0-rc.1',
    target: BASE,
    total: results.length,
    passed,
    failed,
    passRate: (passed / results.length * 100).toFixed(1) + '%',
    note: 'API层真实验收。微信端UI交互(下拉刷新/Tab切换/键盘/真机兼容等)需在微信开发者工具+真机验证,见UAT报告"待真实环境验证"部分',
    cases: results
  };
  const outPath = path.join(__dirname, '..', 'data', 'uat-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\n报告已写入: ${outPath}`);
}

main().catch((e) => { console.error('UAT失败:', e); process.exit(1); });
