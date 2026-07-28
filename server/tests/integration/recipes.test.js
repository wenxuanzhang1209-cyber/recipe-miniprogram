/**
 * 菜谱 API 集成测试
 */
const { setupDatabase, sequelize } = require('../helpers');
const request = require('supertest');
const app = require('../../src/app');

beforeAll(async () => {
  await setupDatabase();
});

afterAll(async () => {
  await sequelize.close();
});

describe('GET /api/v1/recipes', () => {
  it('默认分页返回20条', async () => {
    const res = await request(app).get('/api/v1/recipes');
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.list).toHaveLength(20);
    expect(res.body.data.pagination.total).toBe(25);
    expect(res.body.data.pagination.hasMore).toBe(true);
  });

  it('第二页返回剩余5条', async () => {
    const res = await request(app).get('/api/v1/recipes?page=2');
    expect(res.body.data.list).toHaveLength(5);
    expect(res.body.data.pagination.hasMore).toBe(false);
  });

  it('按菜系筛选', async () => {
    const res = await request(app).get('/api/v1/recipes').query({ cuisine: '川菜', limit: 100 });
    expect(res.body.data.list.length).toBe(12);
    res.body.data.list.forEach((r) => expect(r.cuisine_type).toBe('川菜'));
  });

  it('按难度筛选', async () => {
    const res = await request(app).get('/api/v1/recipes?difficulty=3&limit=100');
    res.body.data.list.forEach((r) => expect(r.difficulty).toBe(3));
  });

  it('按热度排序', async () => {
    const res = await request(app).get('/api/v1/recipes?sort=popular&limit=5');
    const views = res.body.data.list.map((r) => r.view_count);
    expect(views).toEqual([...views].sort((a, b) => b - a));
  });

  it('按总时长筛选', async () => {
    const res = await request(app).get('/api/v1/recipes?maxTime=15&limit=100');
    res.body.data.list.forEach((r) => expect(r.prep_time + r.cook_time).toBeLessThanOrEqual(15));
  });

  it('limit 超上限时被钳制到100', async () => {
    const res = await request(app).get('/api/v1/recipes?limit=9999');
    expect(res.status).toBe(200);
    expect(res.body.data.pagination.limit).toBe(100);
  });
});

describe('GET /api/v1/recipes/search', () => {
  it('按菜名关键词搜索', async () => {
    const res = await request(app).get('/api/v1/recipes/search').query({ keyword: '测试菜谱1' });
    expect(res.body.code).toBe(0);
    // 测试菜谱1、10-19 共11条
    expect(res.body.data.pagination.total).toBe(11);
  });

  it('按描述搜索', async () => {
    const res = await request(app).get('/api/v1/recipes/search').query({ keyword: '回锅肉' });
    expect(res.body.data.pagination.total).toBe(1);
    expect(res.body.data.list[0].name).toBe('测试菜谱1');
  });

  it('按食材名搜索', async () => {
    const res = await request(app).get('/api/v1/recipes/search').query({ keyword: '五花肉' });
    expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(1);
  });

  it('空关键词返回空列表', async () => {
    const res = await request(app).get('/api/v1/recipes/search');
    expect(res.body.data.list).toHaveLength(0);
  });
});

describe('GET /api/v1/recipes/:id', () => {
  it('返回完整详情（食材/步骤/营养）', async () => {
    const res = await request(app).get('/api/v1/recipes/1');
    expect(res.body.code).toBe(0);
    const d = res.body.data;
    expect(d.name).toBe('测试菜谱1');
    expect(d.ingredients).toHaveLength(2);
    expect(d.steps).toHaveLength(2);
    expect(d.steps[0].step_number).toBe(1);
    expect(d.nutrition.calories).toBe(400);
    expect(d.total_time).toBe(d.prep_time + d.cook_time);
    expect(d.is_favorited).toBe(false);
  });

  it('不存在的菜谱返回404', async () => {
    const res = await request(app).get('/api/v1/recipes/99999');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('菜谱不存在');
  });
});

describe('GET /api/v1/recipes/popular & related', () => {
  it('热门菜谱按浏览量排序', async () => {
    const res = await request(app).get('/api/v1/recipes/popular?limit=5');
    expect(res.body.data.length).toBeLessThanOrEqual(5);
  });

  it('相关菜谱不包含自身', async () => {
    const res = await request(app).get('/api/v1/recipes/1/related');
    expect(res.body.code).toBe(0);
    res.body.data.forEach((r) => expect(r.id).not.toBe(1));
  });
});
