/**
 * 安全与权限隔离集成测试
 * 覆盖：水平越权、收藏幂等/并发、搜索注入、未授权访问、Redis降级
 */
const { setupDatabase, createTestUser, sequelize } = require('../helpers');
const request = require('supertest');
const app = require('../../src/app');

let userA, userB, tokenA, tokenB;

beforeAll(async () => {
  await setupDatabase();
  const a = await createTestUser();
  const b = await createTestUser();
  userA = a.user; userB = b.user;
  tokenA = a.token; tokenB = b.token;
});

afterAll(async () => {
  await sequelize.close();
});

describe('认证安全', () => {
  it('无 token 访问受保护接口返回 401', async () => {
    const res = await request(app).get('/api/v1/user/profile');
    expect(res.status).toBe(401);
  });

  it('伪造/无效 token 返回 401', async () => {
    const res = await request(app)
      .get('/api/v1/user/profile')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });

  it('篡改的 token 返回 401', async () => {
    const tampered = tokenA.slice(0, -3) + 'abc';
    const res = await request(app)
      .get('/api/v1/user/profile')
      .set('Authorization', `Bearer ${tampered}`);
    expect(res.status).toBe(401);
  });
});

describe('水平越权隔离', () => {
  it('用户A收藏后，用户B的收藏列表为空', async () => {
    await request(app).post('/api/v1/favorites')
      .set('Authorization', `Bearer ${tokenA}`).send({ recipeId: 2 });
    const resB = await request(app).get('/api/v1/favorites')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(resB.status).toBe(200);
    const ids = resB.body.data.list.map((r) => r.id);
    expect(ids).not.toContain(2);
  });

  it('用户B不能删除用户A的收藏', async () => {
    const res = await request(app).delete('/api/v1/favorites/2')
      .set('Authorization', `Bearer ${tokenB}`);
    // B 未收藏过 2，应返回 404（未收藏该菜谱）
    expect(res.status).toBe(404);
    // A 的收藏仍然存在
    const resA = await request(app).get('/api/v1/favorites')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(resA.body.data.list.map((r) => r.id)).toContain(2);
  });

  it('用户A清空历史不影响用户B', async () => {
    // B 先产生浏览历史（通过详情接口）
    await request(app).get('/api/v1/recipes/3').set('Authorization', `Bearer ${tokenB}`);
    // A 清空自己的历史
    await request(app).delete('/api/v1/history').set('Authorization', `Bearer ${tokenA}`);
    const resB = await request(app).get('/api/v1/history')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(resB.body.data.list.map((r) => r.id)).toContain(3);
  });
});

describe('收藏幂等与并发', () => {
  it('重复收藏同一菜谱不产生重复行（幂等）', async () => {
    await request(app).post('/api/v1/favorites')
      .set('Authorization', `Bearer ${tokenA}`).send({ recipeId: 5 });
    await request(app).post('/api/v1/favorites')
      .set('Authorization', `Bearer ${tokenA}`).send({ recipeId: 5 });
    const res = await request(app).get('/api/v1/favorites')
      .set('Authorization', `Bearer ${tokenA}`);
    const count = res.body.data.list.filter((r) => r.id === 5).length;
    expect(count).toBe(1);
  });

  it('并发收藏同一菜谱最终只有一条', async () => {
    const promises = Array.from({ length: 5 }, () =>
      request(app).post('/api/v1/favorites')
        .set('Authorization', `Bearer ${tokenB}`).send({ recipeId: 7 }));
    await Promise.all(promises);
    const res = await request(app).get('/api/v1/favorites')
      .set('Authorization', `Bearer ${tokenB}`);
    const count = res.body.data.list.filter((r) => r.id === 7).length;
    expect(count).toBe(1);
  });
});

describe('搜索安全', () => {
  it('SQL 注入尝试不报错且不泄露数据', async () => {
    const res = await request(app)
      .get('/api/v1/recipes/search')
      .query({ keyword: "'; DROP TABLE recipes; --" });
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    // 表未被删除：正常列表仍可用
    const list = await request(app).get('/api/v1/recipes');
    expect(list.body.data.pagination.total).toBeGreaterThan(0);
  });

  it('特殊字符搜索正常返回', async () => {
    const res = await request(app)
      .get('/api/v1/recipes/search')
      .query({ keyword: '<script>alert(1)</script>' });
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
  });

  it('空关键词返回空列表而非报错', async () => {
    const res = await request(app).get('/api/v1/recipes/search').query({ keyword: '' });
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(0);
  });
});

describe('Redis 降级', () => {
  // 测试环境无 Redis，所有缓存操作应自动穿透到数据库，API 正常
  it('无 Redis 时热门接口正常返回', async () => {
    const res = await request(app).get('/api/v1/recipes/popular').query({ limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('无 Redis 时分类树接口正常返回', async () => {
    const res = await request(app).get('/api/v1/categories');
    expect(res.status).toBe(200);
    expect(res.body.data.cuisine.length).toBeGreaterThan(0);
  });
});
