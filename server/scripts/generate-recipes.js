/* eslint-disable no-console */
/**
 * 菜谱数据生成器
 * 基于真实中餐烹饪规律（主料 × 辅料 × 烹饪方式 × 菜系）组合生成 10000+ 道家常菜，
 * 包含食材清单、分步做法、营养估算、分类与标签。
 *
 * 用法: node scripts/generate-recipes.js [数量，默认10000]
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const {
  sequelize, Recipe, Ingredient, RecipeIngredient, RecipeStep,
  Category, RecipeCategory, Tag, RecipeTag, NutritionalInfo
} = require('../src/models');

const TARGET = parseInt(process.argv[2], 10) || 10000;

// ============ 食材库（每100克营养估算：热量kcal/蛋白质g/脂肪g/碳水g） ============
const MAINS = [
  // 肉类
  { name: '猪五花肉', cat: '肉类', cal: 395, p: 13, f: 37, c: 1, cuts: ['片', '块', '丁'] },
  { name: '猪里脊', cat: '肉类', cal: 155, p: 20, f: 8, c: 0, cuts: ['丝', '片', '丁'] },
  { name: '猪排骨', cat: '肉类', cal: 278, p: 17, f: 23, c: 0, cuts: ['段', '块'] },
  { name: '猪蹄', cat: '肉类', cal: 260, p: 22, f: 19, c: 0, cuts: ['块'] },
  { name: '猪肝', cat: '肉类', cal: 129, p: 19, f: 5, c: 2, cuts: ['片'] },
  { name: '猪肚', cat: '肉类', cal: 110, p: 15, f: 5, c: 1, cuts: ['丝', '条'] },
  { name: '猪肉末', cat: '肉类', cal: 295, p: 15, f: 26, c: 1, cuts: [''] },
  { name: '牛腩', cat: '肉类', cal: 332, p: 17, f: 29, c: 0, cuts: ['块'] },
  { name: '牛里脊', cat: '肉类', cal: 107, p: 22, f: 2, c: 0, cuts: ['丝', '片', '粒'] },
  { name: '牛腱子', cat: '肉类', cal: 105, p: 20, f: 3, c: 0, cuts: ['块', '片'] },
  { name: '羊肉', cat: '肉类', cal: 203, p: 19, f: 14, c: 0, cuts: ['片', '块'] },
  { name: '羊排', cat: '肉类', cal: 215, p: 18, f: 16, c: 0, cuts: ['段'] },
  { name: '鸡胸肉', cat: '肉类', cal: 133, p: 24, f: 5, c: 0, cuts: ['丁', '丝', '片'] },
  { name: '鸡腿', cat: '肉类', cal: 181, p: 20, f: 13, c: 0, cuts: ['块'] },
  { name: '鸡翅', cat: '肉类', cal: 194, p: 17, f: 12, c: 4, cuts: ['个'] },
  { name: '整鸡', cat: '肉类', cal: 167, p: 19, f: 9, c: 1, cuts: ['块'] },
  { name: '鸡爪', cat: '肉类', cal: 254, p: 24, f: 16, c: 3, cuts: ['个'] },
  { name: '鸭肉', cat: '肉类', cal: 240, p: 16, f: 20, c: 0, cuts: ['块'] },
  { name: '腊肉', cat: '肉类', cal: 498, p: 12, f: 48, c: 3, cuts: ['片'] },
  { name: '腊肠', cat: '肉类', cal: 508, p: 22, f: 45, c: 5, cuts: ['片'] },
  // 海鲜水产
  { name: '鲈鱼', cat: '海鲜', cal: 105, p: 19, f: 3, c: 0, cuts: ['整条'] },
  { name: '鲫鱼', cat: '海鲜', cal: 108, p: 17, f: 3, c: 4, cuts: ['整条'] },
  { name: '草鱼', cat: '海鲜', cal: 113, p: 17, f: 5, c: 0, cuts: ['块', '片'] },
  { name: '带鱼', cat: '海鲜', cal: 127, p: 18, f: 5, c: 2, cuts: ['段'] },
  { name: '黄花鱼', cat: '海鲜', cal: 97, p: 18, f: 3, c: 0, cuts: ['整条'] },
  { name: '三文鱼', cat: '海鲜', cal: 139, p: 20, f: 6, c: 0, cuts: ['块'] },
  { name: '基围虾', cat: '海鲜', cal: 101, p: 18, f: 1, c: 4, cuts: ['整只'] },
  { name: '虾仁', cat: '海鲜', cal: 48, p: 10, f: 1, c: 0, cuts: [''] },
  { name: '鱿鱼', cat: '海鲜', cal: 84, p: 17, f: 2, c: 0, cuts: ['圈', '花'] },
  { name: '蛤蜊', cat: '海鲜', cal: 62, p: 10, f: 1, c: 3, cuts: [''] },
  { name: '扇贝', cat: '海鲜', cal: 60, p: 11, f: 1, c: 3, cuts: [''] },
  { name: '螃蟹', cat: '海鲜', cal: 95, p: 14, f: 3, c: 2, cuts: ['块'] },
  // 蛋奶豆制品
  { name: '鸡蛋', cat: '蛋奶', cal: 144, p: 13, f: 9, c: 3, cuts: [''] },
  { name: '皮蛋', cat: '蛋奶', cal: 171, p: 14, f: 11, c: 5, cuts: ['瓣'] },
  { name: '咸鸭蛋', cat: '蛋奶', cal: 190, p: 13, f: 13, c: 6, cuts: ['瓣'] },
  { name: '嫩豆腐', cat: '豆制品', cal: 57, p: 6, f: 3, c: 2, cuts: ['块'] },
  { name: '老豆腐', cat: '豆制品', cal: 116, p: 12, f: 6, c: 3, cuts: ['块', '片'] },
  { name: '豆腐皮', cat: '豆制品', cal: 447, p: 45, f: 24, c: 12, cuts: ['丝', '结'] },
  { name: '腐竹', cat: '豆制品', cal: 461, p: 45, f: 22, c: 18, cuts: ['段'] },
  { name: '香干', cat: '豆制品', cal: 147, p: 16, f: 8, c: 4, cuts: ['丝', '片'] },
  // 蔬菜
  { name: '土豆', cat: '蔬菜', cal: 81, p: 2, f: 0, c: 18, cuts: ['丝', '片', '块'] },
  { name: '茄子', cat: '蔬菜', cal: 23, p: 1, f: 0, c: 5, cuts: ['条', '块'] },
  { name: '西红柿', cat: '蔬菜', cal: 20, p: 1, f: 0, c: 4, cuts: ['块'] },
  { name: '黄瓜', cat: '蔬菜', cal: 16, p: 1, f: 0, c: 3, cuts: ['片', '条', '块'] },
  { name: '冬瓜', cat: '蔬菜', cal: 12, p: 0, f: 0, c: 3, cuts: ['块', '片'] },
  { name: '白萝卜', cat: '蔬菜', cal: 23, p: 1, f: 0, c: 5, cuts: ['丝', '块'] },
  { name: '莲藕', cat: '蔬菜', cal: 73, p: 2, f: 0, c: 16, cuts: ['片', '丁'] },
  { name: '山药', cat: '蔬菜', cal: 57, p: 2, f: 0, c: 12, cuts: ['段', '片'] },
  { name: '西兰花', cat: '蔬菜', cal: 36, p: 4, f: 1, c: 4, cuts: ['小朵'] },
  { name: '花菜', cat: '蔬菜', cal: 26, p: 2, f: 0, c: 5, cuts: ['小朵'] },
  { name: '大白菜', cat: '蔬菜', cal: 18, p: 2, f: 0, c: 3, cuts: ['片', '丝'] },
  { name: '娃娃菜', cat: '蔬菜', cal: 13, p: 2, f: 0, c: 2, cuts: ['瓣'] },
  { name: '菠菜', cat: '蔬菜', cal: 28, p: 3, f: 0, c: 5, cuts: ['段'] },
  { name: '油麦菜', cat: '蔬菜', cal: 15, p: 1, f: 0, c: 2, cuts: ['段'] },
  { name: '生菜', cat: '蔬菜', cal: 16, p: 1, f: 0, c: 2, cuts: ['片'] },
  { name: '空心菜', cat: '蔬菜', cal: 23, p: 2, f: 0, c: 4, cuts: ['段'] },
  { name: '苋菜', cat: '蔬菜', cal: 31, p: 3, f: 0, c: 5, cuts: ['段'] },
  { name: '芹菜', cat: '蔬菜', cal: 22, p: 1, f: 0, c: 5, cuts: ['段', '丁'] },
  { name: '韭菜', cat: '蔬菜', cal: 29, p: 2, f: 0, c: 5, cuts: ['段'] },
  { name: '蒜苔', cat: '蔬菜', cal: 66, p: 2, f: 0, c: 15, cuts: ['段'] },
  { name: '青椒', cat: '蔬菜', cal: 23, p: 1, f: 0, c: 5, cuts: ['丝', '块'] },
  { name: '豆角', cat: '蔬菜', cal: 34, p: 3, f: 0, c: 6, cuts: ['段'] },
  { name: '荷兰豆', cat: '蔬菜', cal: 30, p: 3, f: 0, c: 5, cuts: [''] },
  { name: '丝瓜', cat: '蔬菜', cal: 20, p: 1, f: 0, c: 4, cuts: ['块', '片'] },
  { name: '苦瓜', cat: '蔬菜', cal: 22, p: 1, f: 0, c: 5, cuts: ['片'] },
  { name: '南瓜', cat: '蔬菜', cal: 23, p: 1, f: 0, c: 5, cuts: ['块', '片'] },
  { name: '芋头', cat: '蔬菜', cal: 81, p: 2, f: 0, c: 18, cuts: ['块'] },
  { name: '茭白', cat: '蔬菜', cal: 26, p: 1, f: 0, c: 6, cuts: ['丝', '片'] },
  { name: '竹笋', cat: '蔬菜', cal: 23, p: 3, f: 0, c: 4, cuts: ['片', '丝'] },
  { name: '芦笋', cat: '蔬菜', cal: 22, p: 3, f: 0, c: 3, cuts: ['段'] },
  // 菌菇
  { name: '香菇', cat: '菌菇', cal: 26, p: 2, f: 0, c: 5, cuts: ['片', '整朵'] },
  { name: '金针菇', cat: '菌菇', cal: 32, p: 2, f: 0, c: 6, cuts: [''] },
  { name: '杏鲍菇', cat: '菌菇', cal: 35, p: 1, f: 0, c: 8, cuts: ['片', '条'] },
  { name: '平菇', cat: '菌菇', cal: 24, p: 2, f: 0, c: 4, cuts: ['撕小朵'] },
  { name: '茶树菇', cat: '菌菇', cal: 30, p: 3, f: 0, c: 5, cuts: ['段'] },
  { name: '木耳', cat: '菌菇', cal: 27, p: 2, f: 0, c: 6, cuts: ['朵'] },
  // 主食类
  { name: '米饭', cat: '主食', cal: 116, p: 3, f: 0, c: 26, cuts: [''] },
  { name: '面条', cat: '主食', cal: 137, p: 4, f: 1, c: 28, cuts: [''] },
  { name: '年糕', cat: '主食', cal: 154, p: 3, f: 1, c: 34, cuts: ['片'] },
  { name: '粉丝', cat: '主食', cal: 338, p: 1, f: 0, c: 84, cuts: [''] },
  { name: '河粉', cat: '主食', cal: 220, p: 5, f: 1, c: 48, cuts: [''] }
];

const SIDES = [
  { name: '青椒', cat: '蔬菜' }, { name: '红椒', cat: '蔬菜' }, { name: '洋葱', cat: '蔬菜' },
  { name: '胡萝卜', cat: '蔬菜' }, { name: '芹菜', cat: '蔬菜' }, { name: '木耳', cat: '菌菇' },
  { name: '香菇', cat: '菌菇' }, { name: '金针菇', cat: '菌菇' }, { name: '土豆', cat: '蔬菜' },
  { name: '黄瓜', cat: '蔬菜' }, { name: '西红柿', cat: '蔬菜' }, { name: '豆角', cat: '蔬菜' },
  { name: '蒜苔', cat: '蔬菜' }, { name: '韭菜', cat: '蔬菜' }, { name: '莴笋', cat: '蔬菜' },
  { name: '冬笋', cat: '蔬菜' }, { name: '荸荠', cat: '蔬菜' }, { name: '玉米粒', cat: '蔬菜' },
  { name: '豌豆', cat: '蔬菜' }, { name: '花生米', cat: '干货' }, { name: '腰果', cat: '干货' },
  { name: '鸡蛋', cat: '蛋奶' }, { name: '嫩豆腐', cat: '豆制品' }, { name: '香干', cat: '豆制品' },
  { name: '粉丝', cat: '主食' }, { name: '红枣', cat: '干货' }, { name: '枸杞', cat: '干货' },
  { name: '板栗', cat: '干货' }, { name: '莲子', cat: '干货' }, { name: '百合', cat: '干货' },
  { name: '白萝卜', cat: '蔬菜' }, { name: '海带', cat: '干货' }, { name: '虾仁', cat: '海鲜' },
  { name: '培根', cat: '肉类' }, { name: '火腿', cat: '肉类' }, { name: '咸蛋黄', cat: '蛋奶' }
];

const SEASONING_SETS = {
  咸鲜: ['盐', '生抽', '蚝油', '白胡椒粉', '鸡精'],
  麻辣: ['豆瓣酱', '花椒', '干辣椒', '辣椒面', '生抽'],
  香辣: ['干辣椒', '辣椒酱', '生抽', '白糖', '蒜末'],
  酸甜: ['番茄酱', '白醋', '白糖', '生抽', '淀粉'],
  酸辣: ['陈醋', '小米椒', '生抽', '白糖', '香油'],
  甜咸: ['冰糖', '老抽', '生抽', '料酒', '八角'],
  清淡: ['盐', '香油', '葱花', '姜丝'],
  酱香: ['黄豆酱', '甜面酱', '生抽', '白糖', '料酒'],
  蒜香: ['蒜末', '生抽', '蒸鱼豉油', '香油', '小葱'],
  糖醋: ['白糖', '香醋', '番茄酱', '生抽', '淀粉']
};

// ============ 烹饪方式 ============
const METHODS = [
  {
    name: '炒', verbs: ['爆炒', '清炒', '小炒', '干煸'], time: [5, 15], diff: [1, 3],
    tastes: ['咸鲜', '麻辣', '香辣', '酸辣', '酱香', '清淡'],
    steps: (m, s, cut, seas) => [
      `${m.name}洗净${cut ? `切${cut}` : '处理干净'}，${s ? `${s.name}洗净切好备用` : '沥干水分备用'}。`,
      `${m.cat === '肉类' ? `${m.name}加料酒、少许盐和淀粉抓匀，腌制10分钟。` : '调一个碗汁：将' + seas.slice(0, 3).join('、') + '混合备用。'}`,
      '热锅倒油，油温五成热时下葱姜蒜爆香。',
      `下${m.name}大火快速翻炒${m.cat === '肉类' ? '至变色' : '断生'}。`,
      s ? `加入${s.name}继续翻炒2分钟。` : `沿锅边淋入少许清水，保持大火翻炒。`,
      `调入${seas.slice(0, 3).join('、')}，翻炒均匀入味。`,
      '大火收汁，出锅装盘即可。'
    ]
  },
  {
    name: '炖', verbs: ['红烧', '慢炖', '家常炖'], time: [40, 90], diff: [2, 4],
    tastes: ['咸鲜', '甜咸', '酱香', '清淡'],
    steps: (m, s, cut, seas) => [
      `${m.name}${cut ? `切${cut}` : '处理干净'}，冷水下锅焯水，撇去浮沫后捞出。`,
      '锅中放油，下冰糖小火炒出糖色（清淡口味可省略）。',
      `下${m.name}翻炒上色，加入葱段、姜片、八角。`,
      `烹入料酒，加入${seas.slice(0, 3).join('、')}翻炒均匀。`,
      `加开水没过食材，大火烧开后转小火炖40分钟。`,
      s ? `加入${s.name}，继续炖15分钟至软烂。` : '中途翻动一次，防止粘锅。',
      '大火收汁至浓稠，撒葱花出锅。'
    ]
  },
  {
    name: '蒸', verbs: ['清蒸', '粉蒸', '剁椒蒸'], time: [15, 40], diff: [1, 3],
    tastes: ['咸鲜', '蒜香', '清淡', '香辣'],
    steps: (m, s, cut, seas) => [
      `${m.name}${cut ? `切${cut}` : '清洗处理干净'}，${m.cat === '海鲜' ? '两面划刀，用料酒和姜丝腌制10分钟去腥' : '加少许盐抓匀腌制'}。`,
      `摆盘，${s ? `铺上${s.name}，` : ''}表面放姜丝。`,
      '蒸锅水烧开后放入，大火蒸制（鱼类8-10分钟，肉类20-30分钟）。',
      `调蒸汁：${seas.slice(0, 3).join('、')}混合拌匀。`,
      '出锅后倒掉盘中多余水分，淋上蒸汁。',
      '撒葱丝，烧一勺热油浇在表面激出香味即可。'
    ]
  },
  {
    name: '煮', verbs: ['水煮', '白灼', '汆'], time: [10, 30], diff: [1, 3],
    tastes: ['麻辣', '清淡', '咸鲜', '酸辣'],
    steps: (m, s, cut, seas) => [
      `${m.name}${cut ? `切${cut}` : '洗净备用'}，${m.cat === '肉类' ? '用蛋清和淀粉上浆' : '沥干水分'}。`,
      s ? `${s.name}洗净打底，铺在碗底。` : '准备一个深碗备用。',
      `锅中烧水，加姜片和料酒，${m.cat === '蔬菜' ? '水开后下锅焯烫1分钟' : '下入食材煮至断生'}。`,
      `捞出装碗，${seas.includes('豆瓣酱') ? '锅中另起油炒香豆瓣酱和花椒，加水煮开后浇入碗中' : `淋上${seas.slice(0, 3).join('、')}调成的味汁`}。`,
      seas.includes('干辣椒') ? '表面铺干辣椒段和花椒，浇上滚烫热油。' : '撒上葱花和香菜。',
      '趁热食用，风味最佳。'
    ]
  },
  {
    name: '煎', verbs: ['香煎', '干煎', '生煎'], time: [10, 25], diff: [2, 4],
    tastes: ['咸鲜', '蒜香', '糖醋', '香辣'],
    steps: (m, s, cut, seas) => [
      `${m.name}${cut ? `切${cut}` : '处理干净'}，用厨房纸吸干表面水分。`,
      `加${seas.slice(0, 2).join('、')}和料酒腌制15分钟入味。`,
      '平底锅烧热，倒少许油润锅。',
      `放入${m.name}，中小火煎3-4分钟至底面金黄定型。`,
      '翻面继续煎至两面金黄熟透。',
      s ? `下${s.name}稍煎片刻，调入剩余调料。` : `淋入调好的料汁，小火收至浓稠。`,
      '出锅装盘，撒白芝麻或葱花点缀。'
    ]
  },
  {
    name: '烤', verbs: ['蜜汁烤', '孜然烤', '蒜香烤'], time: [30, 60], diff: [2, 4],
    tastes: ['甜咸', '香辣', '蒜香', '咸鲜'],
    steps: (m, s, cut, seas) => [
      `${m.name}${cut ? `切${cut}` : '洗净'}，用厨房纸吸干水分，表面划几刀便于入味。`,
      `调腌料：${seas.slice(0, 4).join('、')}加蒜末混合，均匀涂抹在食材上，腌制1小时以上。`,
      '烤箱200度预热10分钟，烤盘铺锡纸刷油。',
      `放入${m.name}，200度烤20分钟。`,
      '取出翻面刷一层腌料汁，再烤15分钟至表面焦香。',
      s ? `最后5分钟放入${s.name}一起烤制。` : '出炉前撒孜然粉和白芝麻。',
      '取出稍晾装盘。'
    ]
  },
  {
    name: '炸', verbs: ['香酥炸', '干炸', '软炸'], time: [15, 30], diff: [3, 4],
    tastes: ['咸鲜', '香辣', '糖醋', '椒盐'],
    steps: (m, s, cut, seas) => [
      `${m.name}${cut ? `切${cut}` : '处理干净'}，加料酒、盐、白胡椒粉腌制20分钟。`,
      '调脆皮糊：面粉、淀粉按2:1混合，加鸡蛋和少许油调成糊状。',
      `${m.name}裹匀面糊。`,
      '锅中倒宽油，烧至六成热（筷子插入冒小泡）。',
      `逐个下入${m.name}，中火炸3分钟捞出。`,
      '油温升至八成热，复炸30秒至金黄酥脆。',
      `捞出控油，${seas.includes('番茄酱') ? '另起锅调糖醋汁裹匀' : '趁热撒椒盐或辣椒面'}即可。`
    ]
  },
  {
    name: '拌', verbs: ['凉拌', '爽口拌', '麻酱拌'], time: [5, 15], diff: [1, 2],
    tastes: ['酸辣', '蒜香', '清淡', '麻辣'],
    steps: (m, s, cut, seas) => [
      `${m.name}${cut ? `切${cut}` : '洗净'}，${m.cat === '蔬菜' ? '焯水30秒后过凉水，挤干水分' : '煮熟后放凉切好'}。`,
      s ? `${s.name}切好一同放入大碗中。` : '放入大碗中备用。',
      `调料汁：${seas.slice(0, 4).join('、')}混合，加蒜末拌匀。`,
      '将料汁倒入碗中，戴手套抓拌均匀。',
      '淋香油，撒白芝麻和香菜。',
      '冷藏10分钟后食用更入味。'
    ]
  },
  {
    name: '焖', verbs: ['黄焖', '油焖', '酱焖'], time: [30, 60], diff: [2, 4],
    tastes: ['酱香', '咸鲜', '甜咸', '香辣'],
    steps: (m, s, cut, seas) => [
      `${m.name}${cut ? `切${cut}` : '处理干净'}，${m.cat === '肉类' ? '焯水去腥备用' : '洗净沥干'}。`,
      '热锅凉油，下姜蒜片和干辣椒爆香。',
      `下${m.name}煸炒2分钟至表面微黄。`,
      `调入${seas.slice(0, 3).join('、')}翻炒上色。`,
      `加入没过食材一半的热水，${s ? `放入${s.name}，` : ''}盖上锅盖中小火焖20-30分钟。`,
      '开盖转大火收汁，不断翻动避免糊底。',
      '汤汁浓稠裹匀食材即可出锅。'
    ]
  },
  {
    name: '烧', verbs: ['红烧', '葱烧', '干烧'], time: [30, 60], diff: [2, 4],
    tastes: ['甜咸', '酱香', '咸鲜', '香辣'],
    steps: (m, s, cut, seas) => [
      `${m.name}${cut ? `切${cut}` : '处理干净'}，${m.cat === '海鲜' ? '两面煎至金黄取出' : '焯水后沥干'}。`,
      '锅留底油，下葱姜蒜和八角炒香。',
      `${seas.includes('冰糖') ? '加冰糖小火炒出枣红色糖色。' : `下${seas[0]}炒出红油。`}`,
      `放入${m.name}，烹料酒，加${seas.slice(1, 3).join('、')}。`,
      `加热水没过食材，${s ? `放入${s.name}，` : ''}大火烧开转中火烧15-20分钟。`,
      '大火收汁至汤汁红亮浓稠。',
      '撒葱段翻匀出锅。'
    ]
  },
  {
    name: '卤', verbs: ['五香卤', '酱卤', '香卤'], time: [60, 120], diff: [2, 4],
    tastes: ['甜咸', '酱香', '香辣', '咸鲜'],
    steps: (m, s, cut, seas) => [
      `${m.name}${cut ? `切${cut}` : '洗净'}，冷水下锅焯水，加料酒姜片去腥。`,
      '准备卤料包：八角、桂皮、香叶、花椒、草果装入纱布袋。',
      `锅中加水，放入卤料包和${seas.slice(0, 3).join('、')}，大火煮开。`,
      `放入${m.name}，转小火卤制40-60分钟。`,
      '关火后浸泡1小时以上（隔夜更入味）。',
      '捞出切件装盘，淋少许卤汁。',
      '卤水过滤后冷冻保存，可反复使用。'
    ]
  },
  {
    name: '汤', verbs: ['清炖', '滋补', '浓香'], time: [40, 120], diff: [1, 3],
    tastes: ['清淡', '咸鲜'],
    steps: (m, s, cut, seas) => [
      `${m.name}${cut ? `切${cut}` : '处理干净'}，${m.cat === '肉类' || m.cat === '海鲜' ? '焯水去血沫' : '洗净备用'}。`,
      `砂锅加足量清水，放入${m.name}和姜片。`,
      '大火烧开后撇净浮沫，转小火慢炖。',
      s ? `炖30分钟后加入${s.name}继续炖20分钟。` : '保持微沸状态炖40分钟至汤色浓白。',
      `加${seas.slice(0, 2).join('、')}调味。`,
      '出锅前撒葱花或香菜提鲜。'
    ]
  }
];

// ============ 菜系 ============
const CUISINES = [
  { name: '川菜', tastes: ['麻辣', '香辣', '酸辣'], w: 14 },
  { name: '粤菜', tastes: ['咸鲜', '清淡', '蒜香'], w: 12 },
  { name: '鲁菜', tastes: ['酱香', '咸鲜', '甜咸'], w: 10 },
  { name: '苏菜', tastes: ['甜咸', '咸鲜', '糖醋'], w: 9 },
  { name: '浙菜', tastes: ['咸鲜', '糖醋', '清淡'], w: 9 },
  { name: '闽菜', tastes: ['咸鲜', '清淡', '酸甜'], w: 8 },
  { name: '湘菜', tastes: ['香辣', '酸辣', '麻辣'], w: 12 },
  { name: '徽菜', tastes: ['酱香', '咸鲜', '甜咸'], w: 8 },
  { name: '家常菜', tastes: ['咸鲜', '酸甜', '清淡', '蒜香', '酱香', '糖醋'], w: 18 }
];

const TAGS = {
  scene: ['快手菜', '下饭菜', '宴客菜', '下酒菜', '深夜食堂', '便当菜', '早餐', '夜宵'],
  crowd: ['儿童喜爱', '老人适宜', '孕妇餐', '健身餐', '减脂餐'],
  season: ['春季时令', '夏季清爽', '秋季滋补', '冬季暖身'],
  general: ['高蛋白', '低脂', '补钙', '养胃', '快捷', '经典名菜', '新手必学', '零失败']
};

const MEALS = ['早餐', '午餐', '晚餐', '下午茶', '夜宵'];

// ============ 工具函数 ============
let seed = 20240722;
const rand = () => {
  // 可复现的伪随机数
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

const pickCuisine = () => {
  const total = CUISINES.reduce((s, c) => s + c.w, 0);
  let r = rand() * total;
  for (const c of CUISINES) {
    r -= c.w;
    if (r <= 0) return c;
  }
  return CUISINES[CUISINES.length - 1];
};

/** 生成菜名（多种命名模式） */
const buildName = (method, verb, main, side, taste) => {
  const patterns = [
    () => `${verb}${main.name}`,
    () => side ? `${side.name}${method.name}${main.name}` : `${verb}${main.name}`,
    () => `${taste}${main.name}`,
    () => side ? `${main.name}${method.name}${side.name}` : `家常${method.name}${main.name}`,
    () => `农家${verb}${main.name}`,
    () => `秘制${verb}${main.name}`
  ];
  return pick(patterns)();
};

const buildDescription = (name, cuisine, taste, method) => {
  const openers = [
    `${name}是一道经典的${cuisine.name}`,
    `这道${name}属于${cuisine.name}系`,
    `${name}是深受欢迎的${cuisine.name}代表菜之一`
  ];
  const middles = [
    `以${taste}口味为主，采用${method.name}制而成`,
    `口味${taste}，${method.name}制的做法最大程度保留了食材的鲜美`,
    `${taste}适口，做法以${method.name}为主`
  ];
  const closers = [
    '操作简单，非常适合家庭日常制作。',
    '色香味俱全，是餐桌上的常客。',
    '营养均衡，老少皆宜。',
    '下饭神器，学会这道菜家人都夸你。'
  ];
  return `${pick(openers)}，${pick(middles)}，${pick(closers)}`;
};

const buildTips = (method, main) => {
  const tipPool = [
    `${main.name}尽量选择新鲜的，口感更佳。`,
    `${method.name}制过程中注意火候，避免过老影响口感。`,
    '调料用量可根据个人口味适当增减。',
    '腌制时间充足是入味的关键。',
    main.cat === '肉类' ? '焯水时冷水下锅，能更好地去除血沫和腥味。' : '焯水时加几滴油和少许盐，可以保持翠绿色泽。',
    main.cat === '海鲜' ? '烹饪海鲜加姜和料酒可有效去腥。' : '出锅前尝一下咸淡再做调整。',
    '大火快炒能锁住食材水分，保持嫩滑口感。'
  ];
  const n = randInt(2, 3);
  const chosen = new Set();
  while (chosen.size < n) chosen.add(pick(tipPool));
  return [...chosen].join('\n');
};

// ============ 主流程 ============
const main = async () => {
  console.log(`开始生成 ${TARGET} 道菜谱...`);
  await sequelize.authenticate();
  await sequelize.sync();

  // 1. 食材入库
  const allIngredientNames = new Map();
  MAINS.forEach((m) => allIngredientNames.set(m.name, m.cat));
  SIDES.forEach((s) => allIngredientNames.set(s.name, s.cat));
  Object.values(SEASONING_SETS).flat().forEach((s) => allIngredientNames.set(s, '调料'));
  ['葱', '姜', '蒜', '料酒', '食用油', '淀粉', '香菜', '白芝麻'].forEach((s) => allIngredientNames.set(s, '调料'));

  for (const [name, category] of allIngredientNames) {
    await Ingredient.findOrCreate({ where: { name }, defaults: { category } });
  }
  const ingredients = await Ingredient.findAll({ raw: true });
  const ingIdByName = new Map(ingredients.map((i) => [i.name, i.id]));
  console.log(`食材库就绪: ${ingredients.length} 种`);

  // 2. 分类入库
  const categoryDefs = [
    ...CUISINES.map((c, i) => ({ name: c.name, type: 'cuisine', icon: '🍲', sort_order: i })),
    ...Object.keys(SEASONING_SETS).map((t, i) => ({ name: t, type: 'taste', icon: '😋', sort_order: i })),
    ...METHODS.map((m, i) => ({ name: m.name, type: 'method', icon: '🔥', sort_order: i })),
    ...MEALS.map((m, i) => ({ name: m, type: 'meal', icon: '🍚', sort_order: i }))
  ];
  for (const def of categoryDefs) {
    await Category.findOrCreate({ where: { name: def.name, type: def.type }, defaults: def });
  }
  const categories = await Category.findAll({ raw: true });
  const catId = (name, type) => categories.find((c) => c.name === name && c.type === type)?.id;
  console.log(`分类就绪: ${categories.length} 个`);

  // 3. 标签入库
  for (const [type, names] of Object.entries(TAGS)) {
    for (const name of names) {
      await Tag.findOrCreate({ where: { name, type }, defaults: { name, type } });
    }
  }
  const tags = await Tag.findAll({ raw: true });
  console.log(`标签就绪: ${tags.length} 个`);

  // 4. 批量生成菜谱
  const usedNames = new Set(
    (await Recipe.findAll({ attributes: ['name'], raw: true })).map((r) => r.name)
  );
  const existing = usedNames.size;
  if (existing >= TARGET) {
    console.log(`已有 ${existing} 道菜谱，无需生成。`);
    process.exit(0);
  }

  const BATCH = 500;
  let generated = 0;

  while (generated < TARGET - existing) {
    const batchRecipes = [];
    const batchMeta = []; // 与 batchRecipes 一一对应的附属数据

    while (batchRecipes.length < Math.min(BATCH, TARGET - existing - generated)) {
      const main_ = pick(MAINS);
      const method = pick(METHODS);
      const cuisine = pickCuisine();

      // 口味需同时兼容烹饪方式与菜系
      const tasteCandidates = method.tastes.filter((t) => cuisine.tastes.includes(t));
      const taste = tasteCandidates.length ? pick(tasteCandidates) : pick(method.tastes);
      const seas = SEASONING_SETS[taste] || SEASONING_SETS['咸鲜'];

      const withSide = rand() > 0.35;
      const side = withSide ? pick(SIDES.filter((s) => s.name !== main_.name)) : null;
      const verb = pick(method.verbs);
      const cut = main_.cuts ? pick(main_.cuts) : '';

      const name = buildName(method, verb, main_, side, taste);
      if (usedNames.has(name)) continue; // 保证菜名唯一
      usedNames.add(name);

      const difficulty = randInt(method.diff[0], method.diff[1]);
      const cookTime = randInt(method.time[0], method.time[1]);
      const prepTime = randInt(5, 20);
      const servings = randInt(1, 4);

      // 营养估算：主料300克 + 辅料100克，按份数折算
      const mainGrams = 3; const sideGrams = 1;
      const cal = Math.round((main_.cal * mainGrams + (side ? 40 * sideGrams : 0) + 120) / servings);
      const protein = +((main_.p * mainGrams / servings) + 2).toFixed(1);
      const fat = +((main_.f * mainGrams / servings) + 8).toFixed(1);
      const carbs = +((main_.c * mainGrams / servings) + 5).toFixed(1);

      const stepDescs = method.steps(main_, side, cut, seas);

      batchRecipes.push({
        name,
        cover_image: '', // 生成后按ID回填，保证图片种子稳定
        description: buildDescription(name, cuisine, taste, method),
        cuisine_type: cuisine.name,
        taste,
        cooking_method: method.name,
        difficulty,
        prep_time: prepTime,
        cook_time: cookTime,
        servings,
        calories: cal,
        tips: buildTips(method, main_),
        view_count: randInt(50, 50000),
        favorite_count: randInt(5, 8000)
      });

      batchMeta.push({
        main: main_, side, seas, stepDescs, cookTime,
        nutrition: {
          protein, fat, carbs,
          fiber: +(rand() * 5 + 1).toFixed(1),
          sodium: +(rand() * 800 + 200).toFixed(1),
          calories: cal
        },
        cuisineName: cuisine.name, taste, methodName: method.name
      });
    }

    // ---- 批量写入 ----
    const created = await Recipe.bulkCreate(batchRecipes);

    const stepRows = [];
    const ingRows = [];
    const nutritionRows = [];
    const recipeCatRows = [];
    const recipeTagRows = [];
    const coverUpdates = [];

    created.forEach((recipe, i) => {
      const meta = batchMeta[i];

      // 封面图（以ID为种子的占位图，可后续替换为真实图片）
      coverUpdates.push({ id: recipe.id, cover: `https://picsum.photos/seed/recipe${recipe.id}/640/480` });

      // 步骤
      const per = Math.max(1, Math.round(meta.cookTime / meta.stepDescs.length));
      meta.stepDescs.forEach((desc, idx) => {
        stepRows.push({
          recipe_id: recipe.id,
          step_number: idx + 1,
          description: desc,
          image_url: `https://picsum.photos/seed/step${recipe.id}-${idx + 1}/480/320`,
          duration: per
        });
      });

      // 食材：主料 + 辅料 + 调料 + 基础配料
      const amounts = ['300克', '400克', '500克', '250克', '350克'];
      ingRows.push({
        recipe_id: recipe.id,
        ingredient_id: ingIdByName.get(meta.main.name),
        amount: pick(amounts), unit: '', is_main: true
      });
      if (meta.side && ingIdByName.get(meta.side.name)) {
        ingRows.push({
          recipe_id: recipe.id,
          ingredient_id: ingIdByName.get(meta.side.name),
          amount: pick(['100克', '150克', '200克', '1个', '适量']), unit: '', is_main: true
        });
      }
      const baseSeas = ['葱', '姜', '蒜', '食用油'];
      [...new Set([...meta.seas.slice(0, 4), ...baseSeas])].forEach((sName) => {
        const sid = ingIdByName.get(sName);
        if (sid) {
          ingRows.push({
            recipe_id: recipe.id, ingredient_id: sid,
            amount: '适量', unit: '', is_main: false
          });
        }
      });

      // 营养
      nutritionRows.push({ recipe_id: recipe.id, ...meta.nutrition });

      // 分类关联（菜系/口味/做法/随机餐次）
      const cIds = [
        catId(meta.cuisineName, 'cuisine'),
        catId(meta.taste, 'taste'),
        catId(meta.methodName, 'method'),
        catId(pick(MEALS), 'meal')
      ].filter(Boolean);
      cIds.forEach((cid) => recipeCatRows.push({ recipe_id: recipe.id, category_id: cid }));

      // 标签（2-4个随机）
      const tagCount = randInt(2, 4);
      const chosenTags = new Set();
      while (chosenTags.size < tagCount) chosenTags.add(pick(tags).id);
      chosenTags.forEach((tid) => recipeTagRows.push({ recipe_id: recipe.id, tag_id: tid }));
    });

    await Promise.all([
      RecipeStep.bulkCreate(stepRows),
      RecipeIngredient.bulkCreate(ingRows),
      NutritionalInfo.bulkCreate(nutritionRows),
      RecipeCategory.bulkCreate(recipeCatRows, { ignoreDuplicates: true }),
      RecipeTag.bulkCreate(recipeTagRows, { ignoreDuplicates: true })
    ]);

    // 回填封面图
    await Promise.all(
      coverUpdates.map((u) => Recipe.update({ cover_image: u.cover }, { where: { id: u.id } }))
    );

    generated += created.length;
    console.log(`进度: ${existing + generated}/${TARGET}`);
  }

  const finalCount = await Recipe.count();
  console.log(`✅ 生成完成！当前菜谱总数: ${finalCount}`);
  process.exit(0);
};

main().catch((err) => {
  console.error('生成失败:', err);
  process.exit(1);
});
