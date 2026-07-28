/**
 * OpenAPI 3.0 规范定义，挂载于 /api-docs
 */
const spec = {
  openapi: '3.0.3',
  info: {
    title: '家常菜谱小程序 API',
    version: '1.0.0',
    description: 'Recipe WeChat Mini Program RESTful API（详细字段说明见 docs/API.md）'
  },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          code: { type: 'integer', example: 0 },
          message: { type: 'string', example: 'success' },
          data: { type: 'object', nullable: true }
        }
      },
      Pagination: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          page: { type: 'integer' },
          limit: { type: 'integer' },
          totalPages: { type: 'integer' },
          hasMore: { type: 'boolean' }
        }
      },
      RecipeSummary: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string', example: '红烧肉' },
          cover_image: { type: 'string' },
          cuisine_type: { type: 'string', example: '川菜' },
          taste: { type: 'string', example: '甜咸' },
          cooking_method: { type: 'string', example: '烧' },
          difficulty: { type: 'integer', minimum: 1, maximum: 5 },
          prep_time: { type: 'integer' },
          cook_time: { type: 'integer' },
          view_count: { type: 'integer' },
          favorite_count: { type: 'integer' }
        }
      },
      RecipeDetail: {
        allOf: [
          { $ref: '#/components/schemas/RecipeSummary' },
          {
            type: 'object',
            properties: {
              description: { type: 'string' },
              tips: { type: 'string' },
              total_time: { type: 'integer' },
              is_favorited: { type: 'boolean' },
              ingredients: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    amount: { type: 'string' },
                    unit: { type: 'string' },
                    is_main: { type: 'boolean' }
                  }
                }
              },
              steps: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    step_number: { type: 'integer' },
                    description: { type: 'string' },
                    image_url: { type: 'string' },
                    duration: { type: 'integer' }
                  }
                }
              },
              nutrition: {
                type: 'object',
                properties: {
                  calories: { type: 'integer' },
                  protein: { type: 'number' },
                  fat: { type: 'number' },
                  carbs: { type: 'number' },
                  fiber: { type: 'number' },
                  sodium: { type: 'number' }
                }
              }
            }
          }
        ]
      }
    }
  },
  paths: {
    '/auth/wx-login': {
      post: {
        tags: ['认证'],
        summary: '微信登录',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code'],
                properties: {
                  code: { type: 'string', description: 'wx.login 临时凭证；非生产环境支持 dev_ 前缀模拟码' },
                  nickname: { type: 'string' },
                  avatar: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 200: { description: '返回 token 与用户信息' }, 422: { description: '缺少 code' } }
      }
    },
    '/auth/logout': {
      post: {
        tags: ['认证'], summary: '退出登录', security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'ok' } }
      }
    },
    '/recipes': {
      get: {
        tags: ['菜谱'],
        summary: '菜谱列表（分页/筛选/排序）',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          { name: 'cuisine', in: 'query', schema: { type: 'string' } },
          { name: 'taste', in: 'query', schema: { type: 'string' } },
          { name: 'method', in: 'query', schema: { type: 'string' } },
          { name: 'difficulty', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 5 } },
          { name: 'maxTime', in: 'query', schema: { type: 'integer' }, description: '总时长上限(分钟)' },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['newest', 'popular', 'favorite', 'quickest', 'easiest'] } }
        ],
        responses: { 200: { description: '分页菜谱列表' } }
      },
      post: {
        tags: ['菜谱'], summary: '创建菜谱', security: [{ bearerAuth: [] }],
        responses: { 200: { description: '创建成功' }, 401: { description: '未登录' } }
      }
    },
    '/recipes/search': {
      get: {
        tags: ['菜谱'],
        summary: '关键词搜索（菜名/描述/食材）',
        parameters: [
          { name: 'keyword', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } }
        ],
        responses: { 200: { description: '搜索结果' } }
      }
    },
    '/recipes/popular': {
      get: {
        tags: ['菜谱'], summary: '热门菜谱',
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }],
        responses: { 200: { description: '热门列表（Redis缓存15分钟）' } }
      }
    },
    '/recipes/recommend': {
      get: {
        tags: ['菜谱'], summary: '推荐菜谱（登录用户按浏览偏好个性化）',
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }],
        responses: { 200: { description: '推荐列表' } }
      }
    },
    '/recipes/{id}': {
      get: {
        tags: ['菜谱'], summary: '菜谱详情（自动+1浏览量，登录用户记录历史）',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: {
            description: '完整详情',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/RecipeDetail' } } }
          },
          404: { description: '菜谱不存在' }
        }
      },
      put: {
        tags: ['菜谱'], summary: '更新菜谱', security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: '更新成功' } }
      },
      delete: {
        tags: ['菜谱'], summary: '删除菜谱（级联清理关联数据）', security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: '删除成功' } }
      }
    },
    '/recipes/{id}/related': {
      get: {
        tags: ['菜谱'], summary: '相关菜谱（同菜系或同做法）',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 6 } }
        ],
        responses: { 200: { description: '相关列表' } }
      }
    },
    '/categories': {
      get: {
        tags: ['分类'], summary: '分类树（按 cuisine/taste/method/meal 分组）',
        responses: { 200: { description: '分组分类树（Redis缓存2小时）' } }
      }
    },
    '/categories/{id}/recipes': {
      get: {
        tags: ['分类'], summary: '分类下的菜谱',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } }
        ],
        responses: { 200: { description: '分页列表' }, 404: { description: '分类不存在' } }
      }
    },
    '/user/profile': {
      get: {
        tags: ['用户'], summary: '个人资料+统计', security: [{ bearerAuth: [] }],
        responses: { 200: { description: '资料与 stats' }, 401: { description: '未登录' } }
      },
      put: {
        tags: ['用户'], summary: '更新资料', security: [{ bearerAuth: [] }],
        responses: { 200: { description: '更新成功' } }
      }
    },
    '/user/preferences': {
      put: {
        tags: ['用户'], summary: '更新偏好（增量合并）', security: [{ bearerAuth: [] }],
        responses: { 200: { description: '已保存' } }
      }
    },
    '/favorites': {
      post: {
        tags: ['收藏'], summary: '添加收藏（幂等）', security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', required: ['recipeId'], properties: { recipeId: { type: 'integer' } } }
            }
          }
        },
        responses: { 200: { description: '收藏成功' }, 404: { description: '菜谱不存在' } }
      },
      get: {
        tags: ['收藏'], summary: '收藏列表', security: [{ bearerAuth: [] }],
        responses: { 200: { description: '分页列表' } }
      }
    },
    '/favorites/{recipeId}': {
      delete: {
        tags: ['收藏'], summary: '取消收藏', security: [{ bearerAuth: [] }],
        parameters: [{ name: 'recipeId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: '已取消' }, 404: { description: '未收藏' } }
      }
    },
    '/history': {
      get: {
        tags: ['历史'], summary: '浏览历史', security: [{ bearerAuth: [] }],
        responses: { 200: { description: '分页列表' } }
      },
      delete: {
        tags: ['历史'], summary: '清空历史', security: [{ bearerAuth: [] }],
        responses: { 200: { description: '已清空' } }
      }
    }
  }
};

module.exports = spec;
