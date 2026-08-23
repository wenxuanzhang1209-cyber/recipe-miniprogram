<p align="center">
  <a href="https://github.com/wenxuanzhang1209-cyber/recipe-miniprogram/actions/workflows/ci.yml"><img src="https://github.com/wenxuanzhang1209-cyber/recipe-miniprogram/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/github/license/wenxuanzhang1209-cyber/recipe-miniprogram?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/recipes-10%2C000-58a6ff?style=flat-square" alt="Recipes" />
  <img src="https://img.shields.io/badge/data-audited-3fb950?style=flat-square" alt="Audited" />
</p>

# Recipe Mini Program

**A WeChat mini-program with 10,000 home-style Chinese recipes — and a data audit that says exactly what is wrong with them.**

<sub>内置 10,000 道家常菜的微信小程序，附带一份说清楚数据哪里有问题的质检报告。</sub>

---

## Why this exists

Recipe apps are easy to start and hard to finish. The interesting work is not the list view —
it is having **enough real data that search, filtering, and recommendations behave like they
would in production**, and knowing where that data is weak.

A 200-recipe demo hides every problem. At 10,000 recipes, pagination, full-text search,
category joins, and cold-start recommendation all have to actually work.

<sub>菜谱应用容易开头、难在收尾。有意思的部分不是列表页，而是**有足够真实的数据量，
让搜索、筛选和推荐表现得像线上一样**，并且清楚数据哪里弱。200 条的 demo 掩盖一切问题；
到 10,000 条，分页、全文搜索、分类关联和冷启动推荐就都得真的能用。</sub>

## What's in the data

Measured from `server/data/recipe.sqlite`:

| Table | Rows |
|---|---|
| `recipes` | 10,000 |
| `recipe_ingredients` | 96,908 |
| `recipe_steps` | 66,609 |
| `recipe_categories` | 40,000 |
| `recipe_tags` | 29,971 |
| `nutritional_info` | 10,000 |
| `ingredients` | 135 |

## The data audit, including what it fails

`server/data/quality-report.json` grades every recipe. The structured content is clean:

| Check | Failures |
|---|---|
| Duplicate names | 0 |
| Empty fields | 0 |
| Missing steps | 0 |
| Step order errors | 0 |
| Duplicate ingredients | 0 |
| Abnormal amounts / times / difficulty | 0 |
| Overlong fields | 0 |
| HTML injected into content | 0 |

**And one thing it fails, on all 10,000 recipes:** the images are `picsum.photos` placeholders
that do not match the dish. This is a known, global gap awaiting a real image strategy — it is
recorded in the audit rather than quietly left for someone to discover.

That is the point of shipping the audit alongside the data. A quality report that only lists
passes is marketing; one that names its own biggest defect is a status report you can act on.

<sub>质检报告对每一道菜打分。结构化内容是干净的（重名、空字段、缺步骤、步骤乱序、
配料重复、异常用量/时间/难度、超长字段、HTML 注入——全部为 0）。
**而它有一处失败，覆盖全部 10,000 道**：图片是 picsum.photos 随机占位图，与菜名不匹配。
这是个已知的全局缺口，写在报告里而不是留给别人去踩。只列通过项的质量报告是宣传，
点名自己最大缺陷的才是能拿来干活的状态报告。</sub>

## Architecture

```
client/   WeChat mini-program
server/   Node.js + Express + SQLite
  data/       recipe.sqlite, quality & performance reports
  tests/      integration tests (auth, recipes, search)
  scripts/    perf-test.js, uat-test.js, data generation
docs/     API reference and deployment notes
deploy/   deployment scripts
```

## Quick start

```bash
cd server
npm install
npm run dev          # API on http://localhost:3000
npm test             # integration tests
```

Open `client/` in WeChat DevTools and point it at the local API.

See [`docs/API.md`](docs/API.md) for endpoints.

## Status

Working full-stack application with CI, integration tests, and performance and quality reports
checked into the repository. The image gap above is the main known defect.

<sub>可运行的全栈应用，有 CI、集成测试，性能与质检报告都在仓库里。
上面那个图片问题是主要的已知缺陷。</sub>

## License

[MIT](LICENSE) © 2026 JKinco

---

<sub>
<b>JKinco</b> — local-first tools for work whose data cannot leave the building ·
<a href="https://github.com/wenxuanzhang1209-cyber/jkinco-listen-open">Listen</a> ·
<a href="https://github.com/wenxuanzhang1209-cyber/jkinco-slides">Slides</a> ·
<a href="https://github.com/wenxuanzhang1209-cyber/JKinco-Skills-Lab">Skills Lab</a> ·
<a href="https://github.com/wenxuanzhang1209-cyber/personal-life-hub">Life Hub</a> ·
<a href="https://github.com/wenxuanzhang1209-cyber/jkinco-tools">Tools</a>
</sub>
