/**
 * 分类 API + 菜谱管理(CRUD) 集成测试
 */
const { setupDatabase, createTestUser, sequelize } = require('../helpers');
const request = require('supertest');
const app = require('../../src/app');

let token;
let cuisineCat;

beforeAll(async () => {
  const seed = await setupDatabase();
  cuisineCat = seed.cuisineCat;
  const t = await createTestUser();
  token = t.token;
});

afterAll(async () => {
  await sequelize.close();
});

const auth = (req) => req.set('Authorization', `Bearer ${token}`);

describe('GET /api/v1/categories', () => {
  it('返回按类型分组的分类树', async () => {
    const res = await request(app).get('/api/v1/categories');
    expect(res.body.code).toBe(0);
    expect(res.body.data.cuisine).toHaveLength(1);
    expect(res.body.data.taste).toHaveLength(1);
    expect(res.body.data.method).toHaveLength(1);
    expect(res.body.data.cuisine[0].name).toBe('川菜');
  });
});

describe('GET /api/v1/categories/:id/recipes', () => {
  it('返回该分类下的菜谱', async () => {
    const res = await request(app).get(`/api/v1/categories/${cuisineCat.id}/recipes?limit=100`);
    expect(res.body.code).toBe(0);
    expect(res.body.data.pagination.total).toBe(12); // 川菜共12道
    res.body.data.list.forEach((r) => expect(r.cuisine_type).toBe('川菜'));
  });

  it('不存在的分类返回404', async () => {
    const res = await request(app).get('/api/v1/categories/99999/recipes');
    expect(res.status).toBe(404);
  });
});

describe('菜谱 CRUD（需登录）', () => {
  let createdId;

  it('创建菜谱（含步骤/食材/营养）', async () => {
    const res = await auth(request(app).post('/api/v1/recipes')).send({
      name: '新建测试菜',
      description: '一道新菜',
      cuisine_type: '川菜',
      taste: '麻辣',
      cooking_method: '炒',
      difficulty: 2,
      prep_time: 10,
      cook_time: 15,
      steps: [
        { description: '备料' },
        { description: '炒制' }
      ],
      ingredients: [
        { name: '猪五花肉', amount: '200克', is_main: true },
        { name: '新食材A', amount: '适量', is_main: false }
      ],
      nutrition: { calories: 350, protein: 15 }
    });
    expect(res.body.code).toBe(0);
    createdId = res.body.data.id;

    const detail = await request(app).get(`/api/v1/recipes/${createdId}`);
    expect(detail.body.data.steps).toHaveLength(2);
    expect(detail.body.data.ingredients).toHaveLength(2);
    expect(detail.body.data.nutrition.calories).toBe(350);
  });

  it('未登录创建返回401', async () => {
    const res = await request(app).post('/api/v1/recipes').send({ name: 'x' });
    expect(res.status).toBe(401);
  });

  it('更新菜谱', async () => {
    const res = await auth(request(app).put(`/api/v1/recipes/${createdId}`))
      .send({ name: '更新后的菜名', difficulty: 4 });
    expect(res.body.data.name).toBe('更新后的菜名');
    expect(res.body.data.difficulty).toBe(4);
  });

  it('删除菜谱及关联数据', async () => {
    const res = await auth(request(app).delete(`/api/v1/recipes/${createdId}`));
    expect(res.body.code).toBe(0);

    const detail = await request(app).get(`/api/v1/recipes/${createdId}`);
    expect(detail.status).toBe(404);
  });

  it('删除不存在的菜谱返回404', async () => {
    const res = await auth(request(app).delete('/api/v1/recipes/99999'));
    expect(res.status).toBe(404);
  });
});

describe('基础设施', () => {
  it('健康检查', async () => {
    const res = await request(app).get('/health');
    expect(res.body.status).toBe('ok');
  });

  it('不存在的路由返回404', async () => {
    const res = await request(app).get('/api/v1/not-exist');
    expect(res.status).toBe(404);
  });
});
