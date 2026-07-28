/**
 * 偏好推荐联动集成测试
 * 验证：忌口/过敏原排除、荤素偏好、菜系偏好、推荐理由
 */
const { setupDatabase, createTestUser, sequelize } = require('../helpers');
const request = require('supertest');
const app = require('../../src/app');

let token;

beforeAll(async () => {
  await setupDatabase();
  const u = await createTestUser();
  token = u.token;
});

afterAll(async () => {
  await sequelize.close();
});

const setPrefs = async (prefs) => {
  const res = await request(app)
    .put('/api/v1/user/preferences')
    .set('Authorization', `Bearer ${token}`)
    .send(prefs);
  expect(res.status).toBe(200);
  return res.body.data;
};

const getRecommend = async (limit = 20) => {
  const res = await request(app)
    .get('/api/v1/recipes/recommend')
    .set('Authorization', `Bearer ${token}`)
    .query({ limit });
  expect(res.status).toBe(200);
  return res.body.data;
};

describe('推荐与偏好联动', () => {
  it('未设置偏好时返回推荐且带理由', async () => {
    await setPrefs({});
    const list = await getRecommend();
    expect(list.length).toBeGreaterThan(0);
    list.forEach((r) => {
      expect(r).toHaveProperty('recommend_reason');
      expect(typeof r.recommend_reason).toBe('string');
      expect(r.recommend_reason.length).toBeGreaterThan(0);
    });
  });

  it('忌口食材：含猪五花肉的菜谱被排除', async () => {
    await setPrefs({ avoidIngredients: ['猪五花肉'] });
    const list = await getRecommend(30);
    // 种子数据中只有"测试菜谱1"含猪五花肉
    const names = list.map((r) => r.name);
    expect(names).not.toContain('测试菜谱1');
  });

  it('过敏原：含青椒的菜谱被排除', async () => {
    await setPrefs({ avoidIngredients: [], allergens: ['青椒'] });
    const list = await getRecommend(30);
    const names = list.map((r) => r.name);
    expect(names).not.toContain('测试菜谱1');
  });

  it('素食偏好：含肉类食材的菜谱被排除', async () => {
    await setPrefs({ dietType: 'vegetarian', allergens: [] });
    const list = await getRecommend(30);
    const names = list.map((r) => r.name);
    expect(names).not.toContain('测试菜谱1'); // 含猪五花肉(肉类)
  });

  it('菜系偏好：推荐结果全部为偏好菜系', async () => {
    await setPrefs({ dietType: '', cuisines: ['川菜'] });
    const list = await getRecommend(10);
    expect(list.length).toBeGreaterThan(0);
    list.forEach((r) => expect(r.cuisine_type).toBe('川菜'));
  });

  it('难度偏好：推荐结果难度在限制范围内', async () => {
    await setPrefs({ cuisines: [], difficulties: [1, 2] });
    const list = await getRecommend(30);
    list.forEach((r) => expect([1, 2]).toContain(r.difficulty));
  });

  it('时长偏好：推荐结果总时长不超过限制', async () => {
    await setPrefs({ difficulties: [], maxCookTime: 15 });
    const list = await getRecommend(30);
    list.forEach((r) => expect(r.prep_time + r.cook_time).toBeLessThanOrEqual(15));
  });

  it('重置偏好后恢复全量推荐', async () => {
    await setPrefs({ maxCookTime: 0, avoidIngredients: [], allergens: [], dietType: '' });
    const list = await getRecommend(30);
    expect(list.length).toBeGreaterThan(0);
  });
});
