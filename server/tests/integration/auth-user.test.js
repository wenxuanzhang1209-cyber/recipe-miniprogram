/**
 * 认证 + 用户中心 API 集成测试
 */
const { setupDatabase, createTestUser, sequelize } = require('../helpers');
const request = require('supertest');
const app = require('../../src/app');

let token;

beforeAll(async () => {
  await setupDatabase();
  const t = await createTestUser();
  token = t.token;
});

afterAll(async () => {
  await sequelize.close();
});

const auth = (req) => req.set('Authorization', `Bearer ${token}`);

describe('POST /api/v1/auth/wx-login', () => {
  it('开发模式 dev_ code 可登录并返回 token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/wx-login')
      .send({ code: 'dev_abc123', nickname: '小明' });
    expect(res.body.code).toBe(0);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.nickname).toBe('小明');
  });

  it('相同 code 二次登录复用同一用户', async () => {
    const res1 = await request(app).post('/api/v1/auth/wx-login').send({ code: 'dev_same' });
    const res2 = await request(app).post('/api/v1/auth/wx-login').send({ code: 'dev_same' });
    expect(res1.body.data.user.id).toBe(res2.body.data.user.id);
  });

  it('缺少 code 返回422', async () => {
    const res = await request(app).post('/api/v1/auth/wx-login').send({});
    expect(res.status).toBe(422);
  });
});

describe('鉴权中间件', () => {
  it('无 token 访问受保护接口返回401', async () => {
    const res = await request(app).get('/api/v1/user/profile');
    expect(res.status).toBe(401);
  });

  it('无效 token 返回401', async () => {
    const res = await request(app)
      .get('/api/v1/user/profile')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
  });
});

describe('用户资料', () => {
  it('获取个人资料含统计数据', async () => {
    const res = await auth(request(app).get('/api/v1/user/profile'));
    expect(res.body.code).toBe(0);
    expect(res.body.data.stats).toEqual({ favoriteCount: 0, historyCount: 0 });
  });

  it('更新昵称', async () => {
    const res = await auth(request(app).put('/api/v1/user/profile')).send({ nickname: '大厨老王' });
    expect(res.body.data.nickname).toBe('大厨老王');
  });

  it('更新偏好设置（合并）', async () => {
    await auth(request(app).put('/api/v1/user/preferences')).send({ favoriteCuisine: '川菜' });
    const res = await auth(request(app).put('/api/v1/user/preferences')).send({ spicyLevel: 3 });
    expect(res.body.data).toEqual({ favoriteCuisine: '川菜', spicyLevel: 3 });
  });
});

describe('收藏功能', () => {
  it('添加收藏并增加计数', async () => {
    const res = await auth(request(app).post('/api/v1/favorites')).send({ recipeId: 2 });
    expect(res.body.code).toBe(0);

    const detail = await request(app).get('/api/v1/recipes/2');
    expect(detail.body.data.favorite_count).toBe(99); // 原98 + 1
  });

  it('重复收藏不重复计数', async () => {
    await auth(request(app).post('/api/v1/favorites')).send({ recipeId: 2 });
    const detail = await request(app).get('/api/v1/recipes/2');
    expect(detail.body.data.favorite_count).toBe(99);
  });

  it('收藏列表包含菜谱信息', async () => {
    const res = await auth(request(app).get('/api/v1/favorites'));
    expect(res.body.data.pagination.total).toBe(1);
    expect(res.body.data.list[0].name).toBe('测试菜谱2');
  });

  it('收藏不存在的菜谱返回404', async () => {
    const res = await auth(request(app).post('/api/v1/favorites')).send({ recipeId: 99999 });
    expect(res.status).toBe(404);
  });

  it('取消收藏', async () => {
    const res = await auth(request(app).delete('/api/v1/favorites/2'));
    expect(res.body.code).toBe(0);
    const list = await auth(request(app).get('/api/v1/favorites'));
    expect(list.body.data.pagination.total).toBe(0);
  });

  it('取消未收藏的菜谱返回404', async () => {
    const res = await auth(request(app).delete('/api/v1/favorites/3'));
    expect(res.status).toBe(404);
  });
});

describe('浏览历史', () => {
  it('登录用户查看详情自动记录历史', async () => {
    await auth(request(app).get('/api/v1/recipes/5'));
    // upsert 是异步不阻塞的，稍等片刻
    await new Promise((r) => setTimeout(r, 300));
    const res = await auth(request(app).get('/api/v1/history'));
    expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(1);
  });

  it('清空历史', async () => {
    const res = await auth(request(app).delete('/api/v1/history'));
    expect(res.body.code).toBe(0);
    const list = await auth(request(app).get('/api/v1/history'));
    expect(list.body.data.pagination.total).toBe(0);
  });
});
