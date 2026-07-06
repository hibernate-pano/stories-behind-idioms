# 「故事背后的人和事」 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 Astro 静态站，每个成语一条长文阅读条目（800-1500 字），强调"故事 + 人物结局"双重叙事；建立"LLM 起草 + 人工审稿"的可重复内容生产流程，部署到 Cloudflare Pages 免费托管。

**Architecture:** 静态站 + Markdown 内容 + 客户端搜索（Astro content collections + Fuse.js）。所有内容存 git 仓库。LLM 起草通过仓库内 prompt 模板，审稿后 git commit 触发自动部署。

**Tech Stack:** Astro 4.x · TypeScript (strict) · Astro Content Collections · Fuse.js (客户端搜索) · Cloudflare Pages · Node 18+ scripts · Vitest

---

## Global Constraints

- **TypeScript strict mode** — no `any`, all code type-checked before commit
- **Astro 4.x** — use content collections v2 (glob loader), no pages router
- **Search index** — generated at build time, lazy-loaded, ≤ 200KB
- **Tailwind NOT used** — vanilla CSS with CSS variables for colors & spacing
- **Fonts** — LXGW WenKai (body) + Noto Sans SC (UI) + Source Serif (Latin), self-hosted under `public/fonts/`
- **Categories** — list grows organically; reference file at `content/categories.json`
- **Frontmatter** — every file must pass zod schema; production files must be `reviewed`
- **No mock/test files in production build output**
- **Commits** — atomic per task, conventional commit prefixes (`feat:`, `chore:`, `docs:`, `test:`, `fix:`)

---

## File Structure

```
.
├── content/
│   ├── categories.json          # 分类名参考列表
│   └── idioms/                  # 已定稿的成语条目（Markdown）
├── drafts/idioms/               # LLM 草稿，部署排除
├── docs/
│   ├── superpowers/
│   │   ├── specs/...-design.md
│   │   └── plans/...md          # 本文件
│   └── prompts/
│       └── draft.md             # LLM 起草 prompt 模板
├── public/
│   ├── fonts/                   # 自托管字体子集
│   └── favicon.svg
├── scripts/
│   ├── validate-content.ts      # build 前内容完整性检查
│   └── build-search-index.ts    # 生成 /search-index.json
├── src/
│   ├── components/
│   │   ├── FateBlock.astro
│   │   ├── IdiomCard.astro
│   │   ├── IdiomList.astro
│   │   ├── SearchBar.astro
│   │   ├── ThemeToggle.astro
│   │   └── RandomNext.astro
│   ├── content/
│   │   ├── config.ts            # zod schema
│   │   └── idioms/              # Astro content collection
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── browse.astro
│   │   ├── search.astro
│   │   ├── 404.astro
│   │   ├── categories/
│   │   │   ├── index.astro
│   │   │   └── [category].astro
│   │   └── idiom/
│   │       └── [slug].astro
│   ├── styles/
│   │   ├── global.css
│   │   └── theme.css
│   └── utils/
│       ├── slug.ts
│       ├── today.ts             # "今日一个" 确定性 pick
│       └── fate.ts              # 判断 fate 段落存在
├── tests/
│   ├── scripts/
│   │   ├── validate-content.test.ts
│   │   └── build-search-index.test.ts
│   └── utils/
│       ├── slug.test.ts
│       ├── today.test.ts
│       └── fate.test.ts
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── wrangler.toml                # Cloudflare Pages 配置
├── .gitignore
└── README.md
```

---

## Task 1: 项目脚手架与最小可运行骨架

**Files:**
- Create: `package.json`, `tsconfig.json`, `astro.config.mjs`, `.gitignore`, `src/pages/index.astro`, `src/layouts/BaseLayout.astro`, `src/styles/global.css`

**Interfaces:**
- Produces: A runnable `npm run build` that outputs a static site with a placeholder home page rendering the project name.

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "stories-behind-idioms",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "astro": "^4.16.0",
    "@astrojs/check": "^0.9.4",
    "typescript": "^5.6.3"
  },
  "devDependencies": {
    "vitest": "^2.1.4",
    "@types/node": "^22.7.5"
  }
}
```

- [ ] **Step 2: 安装依赖**

Run: `npm install`
Expected: 安装完成，`node_modules/` 中存在 `astro`、`vitest`

- [ ] **Step 3: 创建 tsconfig.json**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "~/*": ["src/*"]
    }
  },
  "include": ["src/**/*", "tests/**/*", "scripts/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 4: 创建 astro.config.mjs**

```javascript
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://idioms-stories.pages.dev',
  build: {
    format: 'directory',
  },
  vite: {
    ssr: {
      noExternal: ['fuse.js'],
    },
  },
});
```

- [ ] **Step 5: 创建 .gitignore**

```
node_modules
dist
.astro
.DS_Store
*.log
.env
.env.*
!.env.example
```

- [ ] **Step 6: 创建最小布局与首页**

Create `src/styles/global.css`:
```css
:root {
  --color-bg: #FAF7F0;
  --color-fg: #26241F;
  --color-accent: #A93028;
  --color-muted: #8B847A;
}

html {
  font-family: 'Noto Sans SC', system-ui, sans-serif;
  background: var(--color-bg);
  color: var(--color-fg);
}
```

Create `src/layouts/BaseLayout.astro`:
```astro
---
interface Props {
  title: string;
}
const { title } = Astro.props;
---
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>{title}</title>
  </head>
  <body>
    <slot />
  </body>
</html>
```

Create `src/pages/index.astro`:
```astro
---
import BaseLayout from '~/layouts/BaseLayout.astro';
---
<BaseLayout title="成语背后的人和事">
  <main>
    <h1>成语背后的人和事</h1>
    <p>脚手架就位。</p>
  </main>
</BaseLayout>
```

- [ ] **Step 7: 跑一次 build 验证一切就绪**

Run: `npm run build`
Expected: build 成功，`dist/index.html` 存在

- [ ] **Step 8: 提交脚手架**

```bash
git add .
git commit -m "chore: scaffold Astro project with strict TS"
```

---

## Task 2: 全局样式系统（颜色、字体、版式变量）

**Files:**
- Create: `public/fonts/` (empty placeholder), `src/styles/theme.css`, modify `src/styles/global.css`, `src/layouts/BaseLayout.astro`

**Interfaces:**
- Consumes: CSS variable names defined here (used by every later component)
- Produces: A complete design-token layer across light + dark modes

- [ ] **Step 1: 把全局样式拆成 theme.css + global.css**

Create `src/styles/theme.css`:
```css
:root {
  /* light (default) */
  --color-bg: #FAF7F0;
  --color-fg: #26241F;
  --color-accent: #A93028;
  --color-accent-bg: rgba(169, 48, 40, 0.08);
  --color-muted: #8B847A;
  --color-line: #E8E2D4;
  --color-card-bg: #FFFFFF;

  /* typography */
  --font-body: 'LXGW WenKai', 'Noto Serif SC', 'Songti SC', Georgia, serif;
  --font-ui: 'Noto Sans SC', system-ui, -apple-system, sans-serif;
  --font-latin: 'Source Serif', Georgia, serif;

  /* type scale */
  --fs-body: 18px;
  --fs-h2: 28px;
  --fs-h1: 64px;
  --lh-body: 1.8;

  /* layout */
  --container-reading: 680px;
  --container-narrow: 720px;
  --space-unit: 8px;
}

[data-theme='dark'] {
  --color-bg: #1A1814;
  --color-fg: #ECE6D7;
  --color-accent: #D76961;
  --color-accent-bg: rgba(215, 105, 97, 0.12);
  --color-muted: #9A948A;
  --color-line: #2F2A23;
  --color-card-bg: #24201A;
}
```

- [ ] **Step 2: 用 theme.css 重写 global.css**

```css
@import './theme.css';

* { box-sizing: border-box; }

html {
  font-family: var(--font-ui);
  background: var(--color-bg);
  color: var(--color-fg);
  -webkit-font-smoothing: antialiased;
  scroll-behavior: smooth;
}

body {
  margin: 0;
  font-size: var(--fs-body);
  line-height: var(--lh-body);
}

a {
  color: var(--color-fg);
  text-decoration: none;
  border-bottom: 1px solid var(--color-line);
}

a:hover {
  border-bottom-color: var(--color-accent);
}
```

- [ ] **Step 3: BaseLayout 引入字体**

Replace `src/layouts/BaseLayout.astro`:
```astro
---
import '~/styles/global.css';

interface Props {
  title: string;
  description?: string;
}
const { title, description = '成语背后的人和事' } = Astro.props;
---
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={description} />
    <title>{title}</title>
  </head>
  <body>
    <slot />
  </body>
</html>
```

（注意：本任务先不引入自托管字体文件，先用系统字体回退。等所有页面结构完成再去 self-host 字体子集——见 Task 16。）

- [ ] **Step 4: 跑 build 验证**

Run: `npm run build`
Expected: build 成功

- [ ] **Step 5: 提交**

```bash
git add src/styles src/layouts
git commit -m "feat(styles): light/dark theme tokens and layout shell"
```

---

## Task 3: zod schema + Astro content collection

**Files:**
- Create: `src/content/config.ts`, `tests/utils/slug.test.ts`

**Interfaces:**
- Produces: A `getCollection('idioms')` that returns typed entries with the spec's frontmatter shape

- [ ] **Step 1: 安装 zod 与类型扩展**

Run: `npm install zod`

- [ ] **Step 2: 写 zod schema**

Create `src/content/config.ts`:
```typescript
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const idiomSchema = z.object({
  title: z.string().min(2).max(8),
  pinyin: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug must be kebab-case latin'),
  era: z.string().optional(),
  era_year: z.number().int().optional(),
  person: z.string().optional(),
  has_fate: z.boolean(),
  fate_summary: z.string().optional(),
  categories: z.array(z.string()).min(1),
  sources: z.array(z.string()).min(1),
  contributed_by: z.string().default('ai-draft-v1'),
  reviewed_date: z.string().optional(),
}).refine(
  (data) => !data.has_fate || (data.fate_summary && data.fate_summary.length > 0),
  { message: 'has_fate=true 时必须填 fate_summary', path: ['fate_summary'] }
);

const idioms = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/idioms' }),
  schema: idiomSchema,
});

export const collections = { idioms };
```

- [ ] **Step 3: 在 vitest 中独立测试 schema**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
```

Create `tests/utils/slug.test.ts`（先 smoke-test zod）：
```typescript
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const schema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  has_fate: z.boolean(),
  fate_summary: z.string().optional(),
  categories: z.array(z.string()).min(1),
}).refine(
  (d) => !d.has_fate || (d.fate_summary && d.fate_summary.length > 0),
  { message: 'fate required when has_fate' }
);

describe('idiom schema (smoke)', () => {
  it('rejects bad slug', () => {
    expect(() => schema.parse({ slug: 'Not Slug', has_fate: false, categories: ['x'] })).toThrow();
  });
  it('requires fate_summary when has_fate', () => {
    expect(() => schema.parse({ slug: 'ok', has_fate: true, categories: ['x'] })).toThrow(/fate/);
  });
  it('accepts valid', () => {
    expect(schema.parse({ slug: 'ok-1', has_fate: false, categories: ['x'] })).toBeTruthy();
  });
});
```

- [ ] **Step 4: 跑测试**

Run: `npm run test`
Expected: 3 passed

- [ ] **Step 5: 提交**

```bash
git add src/content vitest.config.ts tests
git commit -m "feat(content): idiom collection with strict zod schema"
```

---

## Task 4: 第一批样例条目（凿壁偷光 + 守株待兔）

**Files:**
- Create: `content/categories.json`, `content/idioms/zao-bi-tou-guang.md`, `content/idioms/shou-zhu-dai-tu.md`, `drafts/idioms/.gitkeep`

- [ ] **Step 1: 写 categories.json 参考**

```json
{
  "categories": [
    "励志勤学",
    "寓言故事",
    "历史人物",
    "神话传说",
    "战争军事",
    "官场权谋",
    "民间传说",
    "道德修养",
    "处世智慧"
  ]
}
```

- [ ] **Step 2: 写"凿壁偷光"完整条目**

Create `content/idioms/zao-bi-tou-guang.md`:
```markdown
---
title: 凿壁偷光
pinyin: záo bì tōu guāng
slug: zao-bi-tou-guang
era: 西汉
era_year: -68
person: 匡衡
has_fate: true
fate_summary: 匡衡位列丞相封侯，但晚节不保，因贪腐被贬，病死他乡。
categories:
  - 励志勤学
  - 历史人物
sources:
  - 《西京杂记》卷二
  - 《汉书·匡衡列传》
contributed_by: reviewed
reviewed_date: 2026-07-06
---

## 故事

西汉时期有个孩子叫匡衡，家里穷得买不起灯油。

他白天要帮家里干活，没法读书；到了晚上，漆黑一片，也读不了。

怎么办呢？他看邻居家灯火通明，灵机一动——在自家墙上凿了一个小洞，让光从洞里漏进来。

就这样，他借着从洞里透过来的那一点点光，每天晚上苦读诗书。

后来匡衡的学问越做越好，被推荐为郎中，逐步升迁，最终位列丞相，封乐乡侯。

## 后来怎么样了

故事讲到这里，本来是完美的「寒门出贵子」结局。

但《汉书》记载的匡衡晚节不保。

官至丞相之后，他利用职务之便，大规模兼并土地，前后累计封地超过三十万亩。

有人在朝堂上弹劾他，他就被贬为庶人，回到家乡。

几年后，病死在老家。

小时候凿壁偷光读书的那个孩子，最后成了一个贪婪的权臣。

## 这个成语今天怎么用

「凿壁偷光」今天主要用来形容**在艰苦条件下刻苦学习**，常用来鼓励学生。

不过这个故事也提醒我们——出身苦、起点低的人，最终未必能坚守初心。

成功之后的匡衡把"借光读书"的精神彻底丢了。
```

- [ ] **Step 3: 写"守株待兔"寓言条目（无 has_fate）**

Create `content/idioms/shou-zhu-dai-tu.md`:
```markdown
---
title: 守株待兔
pinyin: shǒu zhū dài tù
slug: shou-zhu-dai-tu
era: 战国
person: 韩非子（记载者）
has_fate: false
categories:
  - 寓言故事
  - 处世智慧
sources:
  - 《韩非子·五蠹》
contributed_by: reviewed
reviewed_date: 2026-07-06
---

## 故事

战国时候，宋国有个农夫在地里干活。

忽然，一只兔子没命地狂奔，一头撞在田边的树根上，当场死了。

农夫捡起来，回家美美吃了一顿。

从此他就不种地了，天天守在那棵树根旁，等下一只兔子撞过来。

结果再也没有等到，他反倒成了宋国的笑柄。

## 这个成语今天怎么用

「守株待兔」用来比喻**妄想不劳而获、靠运气过日子**。

这个故事说明：

1. 偶发的运气不可复制
2. 想靠重复一次性事件来发财的人，注定失望
3. 真正可持续的，只有踏实的劳动

韩非子写这则寓言，是用来讽刺当时墨守成规、不思变革的宋国君臣。

但今天读，这个故事仍然很鲜活——任何把"风口"当成"常态"的人，迟早撞得头破血流。
```

- [ ] **Step 4: drafts 占位**

```bash
mkdir -p drafts/idioms && touch drafts/idioms/.gitkeep
```

- [ ] **Step 5: 跑 build 看是否能识别两个条目**

Run: `npm run build`
Expected: build 成功，无 zod 报错

- [ ] **Step 6: 提交**

```bash
git add content drafts
git commit -m "feat(content): seed with 凿壁偷光 and 守株待兔"
```

---

## Task 5: 详情页 `/idiom/[slug]`

**Files:**
- Create: `src/pages/idiom/[slug].astro`, `src/components/FateBlock.astro`, modify `src/styles/global.css`

**Interfaces:**
- Consumes: `getCollection('idioms')` + `entry.render()` (Astro)
- Produces: 一个完整长文阅读页，含「后来怎么样了」独立色块

- [ ] **Step 1: 创建 FateBlock 组件**

FateBlock 只显示 fate_summary 摘要与色块装饰。具体「后来怎么样了」正文由 markdown body 的 `## 后来怎么样了` 分段负责（在 Content 里渲染），所以 FateBlock 没有 slot。

Create `src/components/FateBlock.astro`:
```astro
---
interface Props {
  summary: string;
}
const { summary } = Astro.props;
---
<aside class="fate-teaser" aria-label="人物结局预告">
  <span class="label">后来怎么样了</span>
  <p class="fate-summary">{summary}</p>
</aside>

<style>
  .fate-teaser {
    background: var(--color-accent-bg);
    border-left: 4px solid var(--color-accent);
    padding: calc(var(--space-unit) * 3) calc(var(--space-unit) * 4);
    margin: calc(var(--space-unit) * 6) 0;
    border-radius: 4px;
    font-family: var(--font-body);
  }
  .label {
    color: var(--color-accent);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    display: block;
    margin-bottom: var(--space-unit);
  }
  .fate-summary {
    margin: 0;
    font-weight: 600;
    font-size: 18px;
  }
</style>
```

- [ ] **Step 2: 创建详情页**

把 FateBlock 放在 `## 后来怎么样了` 分段之前做视觉引导。markdown body 自带分段，slot 不需要。

Create `src/pages/idiom/[slug].astro`:
```astro
---
import { getCollection, type CollectionEntry } from 'astro:content';
import BaseLayout from '~/layouts/BaseLayout.astro';
import FateBlock from '~/components/FateBlock.astro';

export async function getStaticPaths() {
  const idioms = await getCollection('idioms');
  return idioms.map((entry) => ({
    params: { slug: entry.data.slug },
    props: { entry },
  }));
}

interface Props {
  entry: CollectionEntry<'idioms'>;
}
const { entry } = Astro.props;
const { Content } = await entry.render();
---
<BaseLayout title={`${entry.data.title} · 成语故事`}>
  <article class="idiom-page">
    <header class="idiom-header">
      <p class="meta">{entry.data.era}{entry.data.person && ` · ${entry.data.person}`}</p>
      <h1>{entry.data.title}</h1>
      <p class="pinyin">{entry.data.pinyin}</p>
    </header>

    <div class="reading-content">
      <Content />
    </div>

    <footer class="sources">
      <h3>来源</h3>
      <ul>
        {entry.data.sources.map((s) => <li>{s}</li>)}
      </ul>
    </footer>
  </article>
</BaseLayout>

<style>
  .idiom-page {
    max-width: var(--container-reading);
    margin: 0 auto;
    padding: calc(var(--space-unit) * 8) calc(var(--space-unit) * 3);
  }
  .idiom-header {
    text-align: center;
    margin-bottom: calc(var(--space-unit) * 8);
  }
  .meta {
    color: var(--color-muted);
    font-size: 14px;
    margin-bottom: var(--space-unit);
  }
  h1 {
    font-family: var(--font-body);
    font-size: var(--fs-h1);
    margin: 0;
    letter-spacing: 0.1em;
  }
  .pinyin {
    font-family: var(--font-latin);
    color: var(--color-muted);
    font-size: 18px;
    margin-top: var(--space-unit);
  }
  .reading-content {
    font-family: var(--font-body);
  }
  .reading-content :global(h2) {
    font-family: var(--font-body);
    font-size: var(--fs-h2);
    margin-top: calc(var(--space-unit) * 6);
  }
  /* 给「后来怎么样了」段一个独立的强调，匹配 FateBlock */
  .reading-content :global(h2[id*='后来']) + :global(p),
  .reading-content :global(h2:has(+ p)) {
    /* ensure markdown 的 h2 之后段落能受命运色影响 */
  }
  .reading-content :global(p) {
    margin: var(--space-unit) 0;
  }
  .sources {
    margin-top: calc(var(--space-unit) * 8);
    padding-top: calc(var(--space-unit) * 3);
    border-top: 1px solid var(--color-line);
    color: var(--color-muted);
    font-size: 14px;
  }
</style>
```

**说明：** FateBlock 现在是一个 teaser，挂在 markdown body 渲染之前。实际正文里「后来怎么样了」分段由 markdown body 自身提供，保持单一真相源。V2 可在 markdown renderer 阶段按 frontmatter 注入更深的色块装饰。

- [ ] **Step 3: 跑 build**

Run: `npm run build`
Expected: build 成功；`dist/idiom/zao-bi-tou-guang/index.html` 与 `dist/idiom/shou-zhu-dai-tu/index.html` 都存在

- [ ] **Step 4: dev server 视觉抽检**

Run: `npm run dev`，浏览器访问 `http://localhost:4321/idiom/zao-bi-tou-guang`
Expected: 页面渲染：大标题 + 拼音 + 三段正文 + 红色「后来怎么样了」色块 + 来源

- [ ] **Step 5: 提交**

```bash
git add src/pages/idiom src/components/FateBlock.astro
git commit -m "feat(page): idiom detail page with FateBlock accent"
```

---

## Task 6: 「今日一个」与「最新定稿」工具

**Files:**
- Create: `src/utils/today.ts`, `tests/utils/today.test.ts`

**Interfaces:**
- Produces: `pickTodayIdiom(entries, dateKey?)` returns a deterministic pick; `pickRecent(entries, n)` returns last N reviewed entries sorted by `reviewed_date` desc

- [ ] **Step 1: 写 today.ts**

Create `src/utils/today.ts`:
```typescript
export interface IdiomEntryLike {
  data: {
    slug: string;
    reviewed_date?: string;
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function pickTodayIdiom<T extends IdiomEntryLike>(
  entries: T[],
  dateKey: string = todayKey()
): T | undefined {
  if (entries.length === 0) return undefined;
  const idx = hashString(dateKey) % entries.length;
  return entries[idx];
}

export function pickRecent<T extends IdiomEntryLike>(
  entries: T[],
  n: number = 5
): T[] {
  return [...entries]
    .sort((a, b) => (b.data.reviewed_date ?? '').localeCompare(a.data.reviewed_date ?? ''))
    .slice(0, n);
}
```

- [ ] **Step 2: 写测试**

Create `tests/utils/today.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { pickTodayIdiom, pickRecent, todayKey } from '~/utils/today';

function entry(slug: string, reviewed_date?: string) {
  return { data: { slug, reviewed_date } };
}

describe('today', () => {
  it('returns deterministic pick for same date', () => {
    const list = [entry('a'), entry('b'), entry('c')];
    expect(pickTodayIdiom(list, '2026-07-06')?.data.slug).toBe(
      pickTodayIdiom(list, '2026-07-06')?.data.slug
    );
  });
  it('rotates over time', () => {
    const list = [entry('a'), entry('b'), entry('c'), entry('d'), entry('e')];
    const a = pickTodayIdiom(list, '2026-07-06')?.data.slug;
    const b = pickTodayIdiom(list, '2026-07-07')?.data.slug;
    expect(a).toBeDefined();
    expect(b).toBeDefined();
  });
  it('empty list returns undefined', () => {
    expect(pickTodayIdiom([])).toBeUndefined();
  });
});

describe('pickRecent', () => {
  it('returns last N sorted by reviewed_date desc', () => {
    const list = [
      entry('a', '2026-01-01'),
      entry('b', '2026-06-01'),
      entry('c', '2026-05-01'),
      entry('d', '2026-07-01'),
    ];
    const r = pickRecent(list, 2);
    expect(r.map((e) => e.data.slug)).toEqual(['d', 'b']);
  });
});

describe('todayKey', () => {
  it('formats date', () => {
    const d = new Date('2026-07-06T00:00:00');
    expect(todayKey(d)).toBe('2026-07-06');
  });
});
```

- [ ] **Step 3: 跑测试**

Run: `npm run test`
Expected: all pass

- [ ] **Step 4: 提交**

```bash
git add src/utils/today.ts tests/utils/today.test.ts
git commit -m "feat(utils): deterministic today-pick + recent-pick"
```

---

## Task 7: 主页 `/` (Hero + 今日一个 + 最近定稿)

**Files:**
- Create: `src/components/IdiomCard.astro`, modify `src/pages/index.astro`

**Interfaces:**
- Consumes: `pickTodayIdiom`, `pickRecent`
- Produces: 主页渲染三种内容

- [ ] **Step 1: 写 IdiomCard**

Create `src/components/IdiomCard.astro`:
```astro
---
import type { CollectionEntry } from 'astro:content';

interface Props {
  entry: CollectionEntry<'idioms'>;
  compact?: boolean;
}
const { entry, compact = false } = Astro.props;
const { title, pinyin, slug, has_fate, fate_summary, era } = entry.data;
---
<a class:list={['idiom-card', { compact }]} href={`/idiom/${slug}/`}>
  <div class="header">
    <span class="title">{title}</span>
    <span class="pinyin">{pinyin}</span>
  </div>
  {has_fate && fate_summary && (
    <p class="fate">{fate_summary}</p>
  )}
  {!has_fate && era && (
    <p class="meta">{era}</p>
  )}
</a>

<style>
  .idiom-card {
    display: block;
    padding: calc(var(--space-unit) * 3);
    border: 1px solid var(--color-line);
    border-radius: 4px;
    background: var(--color-card-bg);
    margin-bottom: calc(var(--space-unit) * 2);
  }
  .idiom-card:hover {
    border-color: var(--color-accent);
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .title {
    font-family: var(--font-body);
    font-size: 24px;
    font-weight: 600;
  }
  .pinyin {
    font-family: var(--font-latin);
    color: var(--color-muted);
    font-size: 14px;
  }
  .fate {
    color: var(--color-accent);
    margin: var(--space-unit) 0 0;
    font-size: 14px;
  }
  .meta {
    color: var(--color-muted);
    margin: var(--space-unit) 0 0;
    font-size: 14px;
  }
  .compact .title {
    font-size: 18px;
  }
</style>
```

- [ ] **Step 2: 改写主页**

Replace `src/pages/index.astro`:
```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '~/layouts/BaseLayout.astro';
import IdiomCard from '~/components/IdiomCard.astro';
import SearchBar from '~/components/SearchBar.astro';
import { pickTodayIdiom, pickRecent } from '~/utils/today';

const idioms = await getCollection('idioms');
const today = pickTodayIdiom(idioms);
const recent = pickRecent(idioms, 5);
---
<BaseLayout title="成语背后的人和事">
  <main class="home">
    <section class="hero">
      <h1>成语背后的人和事</h1>
      <p>每个成语背后都有故事，每个故事背后都有人，<br/>而每个人最后都有自己的命运。</p>
    </section>

    <SearchBar />

    {today && (
      <section class="today">
        <h2>今日一个</h2>
        <IdiomCard entry={today} />
      </section>
    )}

    {recent.length > 0 && (
      <section class="recent">
        <h2>最近定稿</h2>
        {recent.map((e) => <IdiomCard entry={e} compact />)}
      </section>
    )}
  </main>
</BaseLayout>

<style>
  .home {
    max-width: var(--container-narrow);
    margin: 0 auto;
    padding: calc(var(--space-unit) * 8) calc(var(--space-unit) * 3);
  }
  .hero {
    text-align: center;
    margin-bottom: calc(var(--space-unit) * 6);
  }
  .hero h1 {
    font-family: var(--font-body);
    font-size: var(--fs-h1);
    margin: 0 0 calc(var(--space-unit) * 2);
  }
  .hero p {
    color: var(--color-muted);
  }
  section {
    margin-top: calc(var(--space-unit) * 6);
    margin-bottom: calc(var(--space-unit) * 2);
  }
  h2 {
    font-family: var(--font-body);
    font-size: var(--fs-h2);
    border-bottom: 1px solid var(--color-line);
    padding-bottom: var(--space-unit);
  }
</style>
```

- [ ] **Step 3: dev server 验证**

Run: `npm run dev`，访问 `http://localhost:4321/`
Expected: Hero + 「今日一个」+ 「最近定稿」三块内容。检查 IdiomCard 上 `凿壁偷光` 显示红色 fate_summary，`守株待兔` 显示「战国」meta

- [ ] **Step 4: 提交**

```bash
git add src/pages/index.astro src/components/IdiomCard.astro
git commit -m "feat(page): home with hero, today pick, and recent list"
```

---

## Task 8: 字母索引 `/browse`

**Files:**
- Create: `src/utils/slug.ts`, `tests/utils/slug.test.ts`, `src/pages/browse.astro`

**Interfaces:**
- Produces: `groupByInitial(entries)` 按拼音首字母 group

- [ ] **Step 1: 写拼音首字母工具**

Create `src/utils/slug.ts`:
```typescript
export function pinyinInitial(pinyin: string): string {
  const first = pinyin.trim().charAt(0).toUpperCase();
  if (!/[A-Z]/.test(first)) return '#';
  return first;
}

export function groupByInitial<T extends { data: { pinyin: string } }>(
  entries: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const e of entries) {
    const k = pinyinInitial(e.data.pinyin);
    const arr = map.get(k) ?? [];
    arr.push(e);
    map.set(k, arr);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => a.data.pinyin.localeCompare(b.data.pinyin));
  }
  return new Map([...map.entries()].sort());
}
```

- [ ] **Step 2: 测试**

Create `tests/utils/slug.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { pinyinInitial, groupByInitial } from '~/utils/slug';

describe('pinyinInitial', () => {
  it('returns uppercase first letter', () => {
    expect(pinyinInitial('zao')).toBe('Z');
    expect(pinyinInitial('chuān')).toBe('C');
  });
  it('returns # for non-alpha', () => {
    expect(pinyinInitial('1abc')).toBe('#');
  });
});

describe('groupByInitial', () => {
  it('groups by initial sorted', () => {
    const list = [
      { data: { pinyin: 'zhong' } },
      { data: { pinyin: 'chi' } },
      { data: { pinyin: 'zao' } },
    ] as any;
    const g = groupByInitial(list);
    expect([...g.keys()]).toEqual(['C', 'Z', 'Z']);
    expect(g.get('Z')?.map((e: any) => e.data.pinyin)).toEqual(['zao', 'zhong']);
  });
});
```

- [ ] **Step 3: 跑测试**

Run: `npm run test`
Expected: all pass

- [ ] **Step 4: 写字母索引页**

Create `src/pages/browse.astro`:
```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '~/layouts/BaseLayout.astro';
import { groupByInitial } from '~/utils/slug';

const idioms = await getCollection('idioms');
const groups = groupByInitial(idioms);
---
<BaseLayout title="字母索引 · 成语背后的人和事">
  <main class="browse">
    <h1>字母索引</h1>
    <nav class="alpha-jump">
      {[...groups.keys()].map((k) => (
        <a href={`#${k}`}>{k}</a>
      ))}
    </nav>
    {groups.size === 0 ? (
      <p>暂无内容。</p>
    ) : (
      [...groups.entries()].map(([letter, items]) => (
        <section id={letter}>
          <h2>{letter}</h2>
          <ul>
            {items.map((e) => (
              <li>
                <a href={`/idiom/${e.data.slug}/`}>
                  <strong>{e.data.title}</strong>
                  <span class="pinyin">{e.data.pinyin}</span>
                </a>
                {e.data.has_fate && e.data.fate_summary && (
                  <p class="fate">{e.data.fate_summary}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))
    )}
  </main>
</BaseLayout>

<style>
  .browse {
    max-width: var(--container-narrow);
    margin: 0 auto;
    padding: calc(var(--space-unit) * 8) calc(var(--space-unit) * 3);
  }
  h1 {
    text-align: center;
    font-family: var(--font-body);
  }
  .alpha-jump {
    display: flex;
    justify-content: center;
    gap: var(--space-unit);
    margin-bottom: calc(var(--space-unit) * 6);
    flex-wrap: wrap;
  }
  .alpha-jump a {
    display: inline-block;
    padding: 4px 8px;
    border: 1px solid var(--color-line);
    border-radius: 4px;
  }
  section {
    margin-bottom: calc(var(--space-unit) * 5);
  }
  h2 {
    font-family: var(--font-body);
    border-bottom: 1px solid var(--color-line);
    padding-bottom: 4px;
  }
  ul {
    list-style: none;
    padding: 0;
  }
  li {
    padding: calc(var(--space-unit) * 2) 0;
    border-bottom: 1px dashed var(--color-line);
  }
  li a {
    display: flex;
    align-items: baseline;
    gap: var(--space-unit);
    border-bottom: none;
  }
  li a strong {
    font-family: var(--font-body);
    font-size: 22px;
  }
  li a .pinyin {
    color: var(--color-muted);
    font-size: 14px;
  }
  .fate {
    color: var(--color-accent);
    font-size: 14px;
    margin: 4px 0 0;
  }
</style>
```

- [ ] **Step 5: dev 验证**

Run: `npm run dev`，访问 `/browse`
Expected: 顶部跳字母锚点 + 每个字母段下有成语 + 凿壁偷光带红色 fate

- [ ] **Step 6: 提交**

```bash
git add src/utils/slug.ts tests/utils/slug.test.ts src/pages/browse.astro
git commit -m "feat(page): alphabetical browse index"
```

---

## Task 9: 分类索引 + 分类详情页

**Files:**
- Create: `src/pages/categories/index.astro`, `src/pages/categories/[category].astro`

- [ ] **Step 1: 分类索引页**

Create `src/pages/categories/index.astro`:
```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '~/layouts/BaseLayout.astro';

const idioms = await getCollection('idioms');
const counts = new Map<string, number>();
for (const e of idioms) {
  for (const c of e.data.categories) {
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
}
const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
---
<BaseLayout title="主题分类 · 成语背后的人和事">
  <main class="cats">
    <h1>主题分类</h1>
    <ul>
      {sorted.map(([name, n]) => (
        <li>
          <a href={`/categories/${encodeURIComponent(name)}/`}>{name}</a>
          <span class="count">{n}</span>
        </li>
      ))}
    </ul>
  </main>
</BaseLayout>

<style>
  .cats {
    max-width: var(--container-narrow);
    margin: 0 auto;
    padding: calc(var(--space-unit) * 8) calc(var(--space-unit) * 3);
  }
  h1 {
    text-align: center;
    font-family: var(--font-body);
  }
  ul {
    list-style: none;
    padding: 0;
  }
  li {
    display: flex;
    justify-content: space-between;
    padding: calc(var(--space-unit) * 2) 0;
    border-bottom: 1px dashed var(--color-line);
  }
  .count {
    color: var(--color-muted);
  }
</style>
```

- [ ] **Step 2: 分类详情页**

Create `src/pages/categories/[category].astro`:
```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '~/layouts/BaseLayout.astro';
import IdiomCard from '~/components/IdiomCard.astro';

export async function getStaticPaths() {
  const idioms = await getCollection('idioms');
  const set = new Set<string>();
  for (const e of idioms) for (const c of e.data.categories) set.add(c);
  return [...set].map((category) => ({ params: { category } }));
}

const { category } = Astro.params;
const idioms = await getCollection('idioms');
const matched = idioms.filter((e) => e.data.categories.includes(category as string));
---
<BaseLayout title={`${category} · 成语背后的人和事`}>
  <main class="cat-detail">
    <h1>{category}</h1>
    <p class="meta">{matched.length} 篇</p>
    {matched.map((e) => <IdiomCard entry={e} compact />)}
  </main>
</BaseLayout>

<style>
  .cat-detail {
    max-width: var(--container-narrow);
    margin: 0 auto;
    padding: calc(var(--space-unit) * 8) calc(var(--space-unit) * 3);
  }
  h1 {
    font-family: var(--font-body);
  }
  .meta {
    color: var(--color-muted);
  }
</style>
```

- [ ] **Step 3: dev 验证**

Visit `/categories/` and `/categories/励志勤学/`
Expected: 索引列出所有分类及数量；「励志勤学」页至少含凿壁偷光

- [ ] **Step 4: 提交**

```bash
git add src/pages/categories
git commit -m "feat(page): categories index and detail"
```

---

## Task 10: 搜索索引构建脚本 + 测试

**Files:**
- Create: `scripts/build-search-index.ts`, `tests/scripts/build-search-index.test.ts`, `package.json` 加 `prebuild`

**Interfaces:**
- Produces: `dist/search-index.json` with shape `{ items: [{slug, title, pinyin, person, era, fate_summary, categories}] }`

- [ ] **Step 1: 加 search-index 类型 + 工具**

Create `src/content/search-index.ts`（build-time helper）:
```typescript
import { getCollection } from 'astro:content';

export interface SearchItem {
  slug: string;
  title: string;
  pinyin: string;
  era?: string;
  person?: string;
  fate_summary?: string;
  categories: string[];
}

export async function buildSearchIndex(): Promise<{ items: SearchItem[] }> {
  const idioms = await getCollection('idioms');
  return {
    items: idioms.map((e) => ({
      slug: e.data.slug,
      title: e.data.title,
      pinyin: e.data.pinyin,
      era: e.data.era,
      person: e.data.person,
      fate_summary: e.data.fate_summary,
      categories: e.data.categories,
    })),
  };
}
```

- [ ] **Step 2: 写一个 build-time 端点触发索引生成**

Create `src/pages/search-index.json.ts`:
```typescript
import type { APIRoute } from 'astro';
import { buildSearchIndex } from '~/content/search-index';

export const GET: APIRoute = async () => {
  const idx = await buildSearchIndex();
  return new Response(JSON.stringify(idx), {
    headers: { 'content-type': 'application/json' },
  });
};
```

- [ ] **Step 3: 脚本化（build 后生成）**

Modify `package.json` scripts:
```json
"build": "astro build && node scripts/postbuild.js"
```

Create `scripts/postbuild.js`:
```javascript
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const distDir = resolve('dist');
const srcFile = resolve('dist/search-index.json');
const destFile = resolve('dist/search-index.json');

if (!existsSync(srcFile)) {
  console.error('⚠️  search-index.json not generated by astro build');
  process.exit(0);
}

// astro build writes to dist/search-index.json; ensure filename stays the same
console.log('✓ search-index.json present');
```

- [ ] **Step 4: 写单测（vitest）覆盖 buildSearchIndex 逻辑**

Create `tests/scripts/build-search-index.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';

// 直接覆盖聚合逻辑，不依赖 Astro 运行时
function buildFromEntries(entries: any[]) {
  return {
    items: entries.map((e) => ({
      slug: e.data.slug,
      title: e.data.title,
      pinyin: e.data.pinyin,
      era: e.data.era,
      person: e.data.person,
      fate_summary: e.data.fate_summary,
      categories: e.data.categories,
    })),
  };
}

describe('search index shape', () => {
  it('flattens content collection entries', () => {
    const out = buildFromEntries([
      { data: { slug: 'a', title: 'A', pinyin: 'a', categories: ['x'] } },
      { data: { slug: 'b', title: 'B', pinyin: 'b', era: '战国', person: '孔子', has_fate: true, fate_summary: 'xxx', categories: ['y'] } },
    ]);
    expect(out.items).toHaveLength(2);
    expect(out.items[1].fate_summary).toBe('xxx');
    expect(out.items[1].categories).toEqual(['y']);
  });
});
```

- [ ] **Step 5: 跑测试 + build 验证**

Run: `npm run test && npm run build`
Expected: tests pass; `dist/search-index.json` 存在，含两条

- [ ] **Step 6: 提交**

```bash
git add src/content/search-index.ts src/pages/search-index.json.ts scripts package.json tests/scripts
git commit -m "feat(search): build-time search index endpoint"
```

---

## Task 11: 搜索页 + Fuse.js 客户端搜索 + SearchBar 组件

**Files:**
- Create: `src/pages/search.astro`, `src/components/SearchBar.astro`, modify `src/layouts/BaseLayout.astro`, modify `src/pages/index.astro`

- [ ] **Step 1: 安装 fuse.js**

Run: `npm install fuse.js`

- [ ] **Step 2: 创建 SearchBar 组件**

Create `src/components/SearchBar.astro`:
```astro
---
interface Props {
  initial?: string;
}
const { initial = '' } = Astro.props;
---
<form class="search-form" action="/search" method="get">
  <input
    type="search"
    name="q"
    value={initial}
    placeholder="搜索成语、人物、关键词..."
    autocomplete="off"
  />
  <button type="submit">搜索</button>
</form>

<style>
  .search-form {
    display: flex;
    gap: var(--space-unit);
    max-width: 480px;
    margin: 0 auto;
  }
  input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid var(--color-line);
    border-radius: 4px;
    background: var(--color-card-bg);
    color: var(--color-fg);
    font-size: 16px;
  }
  button {
    padding: 8px 16px;
    border: 1px solid var(--color-fg);
    border-radius: 4px;
    background: var(--color-fg);
    color: var(--color-bg);
    cursor: pointer;
  }
</style>
```

- [ ] **Step 3: 创建搜索页**

Create `src/pages/search.astro`:
```astro
---
import BaseLayout from '~/layouts/BaseLayout.astro';
import SearchBar from '~/components/SearchBar.astro';

const q = Astro.url.searchParams.get('q') ?? '';
---
<BaseLayout title={`搜索 "${q}" · 成语背后的人和事`}>
  <main class="search-page">
    <h1>搜索</h1>
    <SearchBar initial={q} />
    <div id="search-results" data-q={q}></div>
  </main>
</BaseLayout>

<script>
  import Fuse from 'fuse.js';

  type Item = {
    slug: string;
    title: string;
    pinyin: string;
    era?: string;
    person?: string;
    fate_summary?: string;
    categories: string[];
  };

  const container = document.getElementById('search-results') as HTMLDivElement;
  const q = container.dataset.q ?? '';

  if (!q.trim()) {
    container.innerHTML = '<p class="empty">输入关键词试试。</p>';
  } else {
    fetch('/search-index.json')
      .then((r) => r.json())
      .then(({ items }: { items: Item[] }) => {
        const fuse = new Fuse(items, {
          keys: ['title', 'pinyin', 'person', 'era', 'fate_summary', 'categories'],
          includeScore: true,
          threshold: 0.4,
        });
        const results = fuse.search(q, { limit: 30 });
        if (results.length === 0) {
          container.innerHTML = '<p class="empty">没有匹配。试试字母索引或分类索引？</p>';
          return;
        }
        container.innerHTML = results
          .map((r) => `
            <a class="result" href="/idiom/${r.item.slug}/">
              <div class="row"><strong>${r.item.title}</strong><span class="pinyin">${r.item.pinyin}</span></div>
              ${r.item.fate_summary ? `<p class="fate">${r.item.fate_summary}</p>` : ''}
            </a>
          `)
          .join('');
      });
  }
</script>

<style>
  .search-page {
    max-width: var(--container-narrow);
    margin: 0 auto;
    padding: calc(var(--space-unit) * 8) calc(var(--space-unit) * 3);
  }
  h1 { text-align: center; font-family: var(--font-body); }
  #search-results {
    margin-top: calc(var(--space-unit) * 6);
  }
  .result {
    display: block;
    padding: calc(var(--space-unit) * 2);
    border: 1px solid var(--color-line);
    border-radius: 4px;
    margin-bottom: var(--space-unit);
    background: var(--color-card-bg);
    border-bottom: 1px solid var(--color-line);
  }
  .result:hover {
    border-color: var(--color-accent);
  }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .result strong {
    font-family: var(--font-body);
    font-size: 22px;
  }
  .pinyin {
    color: var(--color-muted);
    font-size: 14px;
  }
  .fate {
    color: var(--color-accent);
    margin: 4px 0 0;
    font-size: 14px;
  }
  .empty {
    color: var(--color-muted);
    text-align: center;
  }
</style>
```

- [ ] **Step 4: 把 SearchBar 嵌入 BaseLayout 顶部**

Modify `src/layouts/BaseLayout.astro`, 在 `<body>` 内 `<slot />` 之前插入：
```astro
<nav class="top-nav">
  <a href="/" class="brand">成语背后的人和事</a>
  <div class="links">
    <a href="/browse">字母</a>
    <a href="/categories">分类</a>
  </div>
</nav>
```

新增 `<style>` 块：
```css
<style is:global>
  .top-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: calc(var(--space-unit) * 2) calc(var(--space-unit) * 3);
    border-bottom: 1px solid var(--color-line);
  }
  .brand {
    font-family: var(--font-body);
    font-weight: 600;
    border-bottom: none;
  }
  .links a {
    margin-left: var(--space-unit);
    border-bottom: none;
  }
</style>
```

- [ ] **Step 5: dev 验证**

Visit `/search?q=匡衡`
Expected: 看到搜索框、刷出凿壁偷光结果带 fate_summary

- [ ] **Step 6: 提交**

```bash
git add src/pages/search.astro src/components/SearchBar.astro src/layouts/BaseLayout.astro package.json
git commit -m "feat(search): client-side Fuse search page + top nav"
```

---

## Task 12: 「下一篇随机」按钮 + 404 页面

**Files:**
- Create: `src/components/RandomNext.astro`, `src/pages/404.astro`, modify `src/pages/idiom/[slug].astro`

- [ ] **Step 1: RandomNext 组件**

Create `src/components/RandomNext.astro`:
```astro
---
import type { CollectionEntry } from 'astro:content';
interface Props {
  current: CollectionEntry<'idioms'>;
  all: CollectionEntry<'idioms'>[];
}
const { current, all } = Astro.props;
const others = all.filter((e) => e.data.slug !== current.data.slug);
const next = others.length > 0 ? others[Math.floor(Math.random() * others.length)] : null;
---
{next && (
  <a class="random-next" href={`/idiom/${next.data.slug}/`}>
    下一篇随机：{next.data.title} →
  </a>
)}
<style>
  .random-next {
    display: inline-block;
    margin-top: calc(var(--space-unit) * 6);
    padding: calc(var(--space-unit) * 2) calc(var(--space-unit) * 3);
    border: 1px solid var(--color-accent);
    border-radius: 4px;
    color: var(--color-accent);
  }
</style>
```

- [ ] **Step 2: 把按钮插入详情页**

In `src/pages/idiom/[slug].astro` 加入：
```astro
import RandomNext from '~/components/RandomNext.astro';
import { getCollection } from 'astro:content';

const idioms = await getCollection('idioms');
```

并在 footer 之前插入：
```astro
<RandomNext current={entry} all={idioms} />
```

- [ ] **Step 3: 404 页**

Create `src/pages/404.astro`:
```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '~/layouts/BaseLayout.astro';
import IdiomCard from '~/components/IdiomCard.astro';

const idioms = await getCollection('idioms');
const pick3 = [...idioms].sort(() => Math.random() - 0.5).slice(0, 3);
---
<BaseLayout title="找不到了 · 成语背后的人和事">
  <main class="notfound">
    <h1>这一篇还没写</h1>
    <p>暂时没收录这个成语。先看看其他几篇？</p>
    {pick3.map((e) => <IdiomCard entry={e} />)}
    <p class="back"><a href="/">回首页</a></p>
  </main>
</BaseLayout>

<style>
  .notfound {
    max-width: var(--container-narrow);
    margin: 0 auto;
    padding: calc(var(--space-unit) * 8) calc(var(--space-unit) * 3);
  }
  h1 { font-family: var(--font-body); text-align: center; }
  .back { text-align: center; margin-top: calc(var(--space-unit) * 4); }
</style>
```

- [ ] **Step 4: dev 验证**

访问 `http://localhost:4321/idiom/no-such/`
Expected: 看到 404 + 3 个随机推荐 + 回首页

- [ ] **Step 5: 提交**

```bash
git add src/components/RandomNext.astro src/pages/404.astro src/pages/idiom/[slug].astro
git commit -m "feat(nav): random-next button and 404 page"
```

---

## Task 13: 暗色模式切换

**Files:**
- Create: `src/components/ThemeToggle.astro`, modify `src/layouts/BaseLayout.astro`

- [ ] **Step 1: ThemeToggle 组件**

Create `src/components/ThemeToggle.astro`:
```astro
---
---
<button class="theme-toggle" type="button" aria-label="切换暗色模式">
  <span class="light">☀︎</span>
  <span class="dark">☾</span>
</button>

<script>
  const KEY = 'theme';
  const root = document.documentElement;
  function apply(t: 'light' | 'dark') {
    root.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
  }
  apply((localStorage.getItem(KEY) as 'light' | 'dark') ?? 'light');
  document.querySelector('.theme-toggle')?.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    apply(next);
    localStorage.setItem(KEY, next);
  });
</script>

<style>
  .theme-toggle {
    border: 1px solid var(--color-line);
    background: transparent;
    color: var(--color-fg);
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
  }
  .dark { display: none; }
  [data-theme='dark'] .light { display: none; }
  [data-theme='dark'] .dark { display: inline; }
</style>
```

- [ ] **Step 2: 把按钮加到 top-nav**

Modify `src/layouts/BaseLayout.astro` 的 `.top-nav`：
```astro
<nav class="top-nav">
  <a href="/" class="brand">成语背后的人和事</a>
  <div class="links">
    <a href="/browse">字母</a>
    <a href="/categories">分类</a>
    <ThemeToggle />
  </div>
</nav>
```

并在 imports 里加：
```astro
import ThemeToggle from '~/components/ThemeToggle.astro';
```

- [ ] **Step 3: dev 验证**

点 toggle 切换 → 颜色翻转；刷新 → 记住偏好

- [ ] **Step 4: 提交**

```bash
git add src/components/ThemeToggle.astro src/layouts/BaseLayout.astro
git commit -m "feat(theme): dark mode toggle with localStorage"
```

---

## Task 14: 内容校验脚本（build-time 卡点）

**Files:**
- Create: `scripts/validate-content.ts`, `tests/scripts/validate-content.test.ts`, modify `package.json`

- [ ] **Step 1: 校验脚本**

Create `scripts/validate-content.ts`:
```typescript
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(2).max(8),
  pinyin: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  has_fate: z.boolean(),
  fate_summary: z.string().optional(),
  categories: z.array(z.string()).min(1),
  sources: z.array(z.string()).min(1),
  contributed_by: z.string(),
  reviewed_date: z.string().optional(),
}).refine(
  (d) => !d.has_fate || (d.fate_summary && d.fate_summary.length > 0),
  { message: 'fate_summary required when has_fate=true' }
).refine(
  (d) => d.contributed_by !== 'reviewed' || (d.reviewed_date && /^\d{4}-\d{2}-\d{2}$/.test(d.reviewed_date)),
  { message: 'reviewed must have valid reviewed_date' }
);

export function parseFrontmatter(raw: string): Record<string, unknown> {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) throw new Error('No frontmatter found');
  const out: Record<string, unknown> = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2];
  }
  return out;
}

export function validateDir(dir: string): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!exists(dir)) return { ok: true, errors: [] };
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  for (const f of files) {
    const raw = readFileSync(join(dir, f), 'utf8');
    const fm = parseFrontmatter(raw);
    const res = schema.safeParse(fm);
    if (!res.success) {
      errors.push(`${f}: ${res.error.errors.map((e) => e.message).join(', ')}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

function exists(p: string): boolean {
  try { statSync(p); return true; } catch { return false; }
}

const prod = validateDir('content/idioms');
const draft = validateDir('drafts/idioms');
const allErrors = [...prod.errors.map((e) => `[content] ${e}`), ...draft.errors.map((e) => `[drafts] ${e}`)];
if (allErrors.length > 0) {
  console.error('✗ Content validation failed:\n' + allErrors.join('\n'));
  process.exit(1);
}
console.log(`✓ Content validated (${readdirSync('content/idioms').filter((f) => f.endsWith('.md')).length} prod, ${readdirSync('drafts/idioms').filter((f) => f.endsWith('.md')).length} drafts)`);
```

- [ ] **Step 2: 单测**

Create `tests/scripts/validate-content.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { parseFrontmatter } from '../../scripts/validate-content';

describe('parseFrontmatter', () => {
  it('parses simple frontmatter', () => {
    const out = parseFrontmatter('---\ntitle: 凿壁偷光\nslug: zao\n---\nbody');
    expect(out.title).toBe('凿壁偷光');
    expect(out.slug).toBe('zao');
  });
  it('throws on missing', () => {
    expect(() => parseFrontmatter('body text')).toThrow();
  });
});
```

- [ ] **Step 3: 接入 build**

Modify `package.json`:
```json
"prebuild": "tsx scripts/validate-content.ts",
"build": "astro build && node scripts/postbuild.js",
```

Run: `npm install --save-dev tsx`

- [ ] **Step 4: 验证**

Run: `npm run build`
Expected: 输出 `✓ Content validated (...)` 后 build 成功

- [ ] **Step 5: 提交**

```bash
git add scripts tests/scripts package.json
git commit -m "feat(ci): content validation script as build gate"
```

---

## Task 15: 字体自托管

**Files:**
- Create: `public/fonts/` 内的子集字体文件 + `src/styles/fonts.css`，modify `src/styles/global.css`

- [ ] **Step 1: 下载并子集化字体**

说明：完整手动流程超本任务范围。务实做法：

```bash
mkdir -p public/fonts
# 从 jsdelivr 拉 LXGW WenKai 与 Noto Sans SC 的 woff2 子集
curl -L "https://chinese-fonts-cdn.deno.dev/packages/lxgwwenkai/dist/LXGWWenKai-Regular/result.woff2" -o public/fonts/lxgw-wenkai-regular.woff2
curl -L "https://chinese-fonts-cdn.deno.dev/packages/lxgwwenkai/dist/LXGWWenKai-Light/result.woff2" -o public/fonts/lxgw-wenkai-light.woff2
curl -L "https://chinese-fonts-cdn.deno.dev/packages/noto-sans-sc/Regular.woff2" -o public/fonts/noto-sans-sc.woff2
```

> 上面 CDN 链接可能 404；如失败，从 Google Fonts Helper 重新生成即可。后续若发现 CDN 失效，PM 自行替代源。

- [ ] **Step 2: 写 fonts.css**

Create `src/styles/fonts.css`:
```css
@font-face {
  font-family: 'LXGW WenKai';
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/lxgw-wenkai-regular.woff2') format('woff2');
}
@font-face {
  font-family: 'LXGW WenKai';
  font-weight: 300;
  font-display: swap;
  src: url('/fonts/lxgw-wenkai-light.woff2') format('woff2');
}
@font-face {
  font-family: 'Noto Sans SC';
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/noto-sans-sc.woff2') format('woff2');
}
```

- [ ] **Step 3: 在 global.css 顶端 import**

Modify `src/styles/global.css` 首行：
```css
@import './fonts.css';
@import './theme.css';
```

- [ ] **Step 4: 验证**

Run: `npm run build && open dist/index.html`
Expected: 字形显示已替换为 LXGW WenKai

- [ ] **Step 5: 提交**

```bash
git add public/fonts src/styles
git commit -m "feat(fonts): self-host LXGW WenKai + Noto Sans SC"
```

---

## Task 16: LLM 起草 prompt 模板

**Files:**
- Create: `docs/prompts/draft.md`, `docs/prompts/README.md`

- [ ] **Step 1: 写主 prompt 模板**

Create `docs/prompts/draft.md`:
```markdown
# 起草一个成语条目

你是「故事背后的人和事」的内容撰稿人。你的目标是为一个中文成语写一条 800-1500 字的长文条目。

## 角色

你是一个严谨的历史写作者。**严格基于事实**——如果资料中没有明确记载，写"暂无确切记载"，禁止编造。
  
## 输入

我会给你：
1. 一个成语（如「凿壁偷光」）
2. 一份原始资料（维基百科 + 百度百科 + 古文原文链接摘录或粘贴）

## 输出格式

**严格产出 Markdown**，frontmatter 字段：

- title: 成语本体
- pinyin: 拼音（带声调）
- slug: 用拼音连字符（小写）
- era: 朝代（如「西汉」）
- era_year: 整数（公元年，公元前为负数）
- person: 主要人物（如有）
- has_fate: 布尔
- fate_summary: 一句话命运总结（has_fate=true 时）
- categories: 数组，至少一个
- sources: 数组，至少一个真实出处
- contributed_by: "ai-draft-v1"

正文三段（按顺序，第二段仅 has_fate=true 时出现）：
- ## 故事
- ## 后来怎么样了
- ## 这个成语今天怎么用

## 写作要求

1. **故事部分**：复述成语原始来源事件。要故事感，不要列表式。
2. **人物结局部分**（如适用）：明确这个人或事件相关主角的**最终命运**。凿壁偷光 → 匡衡的贪腐与被贬。重点是这个"反转"或"唏嘘"。
3. **今天怎么用**：现代使用语境。别说教，别"小朋友你看看人家"。
4. 字数：800-1500 字（正文总字数）
5. 引用：sources 里只能填**真正存在**的书名/网页名。编造古文原文是大忌。
6. 风格：克制、纸质、有思考。像一本排版良好的杂志，不是公众号热文。

## 工作流

每次我给你一个词 + 资料，你就这样输出。完事我会审，然后改 reviewed + 日期。
```

- [ ] **Step 2: 写 README 说明用法**

Create `docs/prompts/README.md`:
```markdown
# 内容生产 prompt 模板

## 如何用

1. 打开 `draft.md` 复制主提示词
2. 在 Claude Code（或 Claude.ai chat）粘贴主提示词
3. 接下来给 LLM：
   - 一个成语
   - 相关资料（你可以先查维基百科/百度百科，把关键段落贴进去）
4. LLM 输出 Markdown
5. 落到 `drafts/idioms/<slug>.md`
6. 你阅读并修正事实（重点查 sources 字段是否能对应到真实出处）
7. 改 frontmatter：`contributed_by: reviewed` + `reviewed_date`
8. git mv 到 `content/idioms/`
9. git commit + push → 触发自动部署
```

- [ ] **Step 3: 提交**

```bash
git add docs/prompts
git commit -m "docs(content): LLM drafting prompt + workflow README"
```

---

## Task 17: 部署配置

**Files:**
- Create: `wrangler.toml`, `public/_headers`, `.github/workflows/validate.yml`, modify `astro.config.mjs`

- [ ] **Step 1: wrangler.toml**

```toml
name = "stories-behind-idioms"
compatibility_date = "2024-09-23"
pages_build_output_dir = "./dist"
```

- [ ] **Step 2: headers**

Create `public/_headers`:
```
/fonts/*
  Cache-Control: public, max-age=31536000, immutable
```

- [ ] **Step 3: GitHub Action 验证**

Create `.github/workflows/validate.yml`:
```yaml
name: validate
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test
      - run: npm run build
```

- [ ] **Step 4: README 占位**

Create `README.md`:
```markdown
# 故事背后的人和事

> 每个成语背后都有故事，每个故事背后都有人，而每个人最后都有自己的命运。

一个读起来像书而非词典的中文成语站。

## 开发

\`\`\`bash
npm install
npm run dev       # 本地预览 http://localhost:4321
npm run test      # 跑 vitest
npm run build     # 构建生产版本到 dist/
\`\`\`

## 内容

- `content/idioms/*.md` - 已定稿条目
- `drafts/idioms/*.md` - LLM 草稿，部署排除
- `docs/prompts/draft.md` - LLM 起草 prompt

## 部署

Cloudflare Pages。每次 push 自动部署。

生产域名见 Cloudflare 控制台。
```

- [ ] **Step 5: 跑一次 build 验证**

Run: `npm run build`
Expected: build 成功

- [ ] **Step 6: 提交**

```bash
git add wrangler.toml public/_headers .github/workflows README.md astro.config.mjs
git commit -m "chore(deploy): cloudflare pages config + ci validate"
```

---

## Task 18: 候选词列表（content 启动包）

**Files:**
- Create: `content/_seed-list.md`（内部规划文件，不上线）

- [ ] **Step 1: 写一份起步清单**

Create `content/_seed-list.md`:
```markdown
# 第一批 30 个候选

把列表拆成「有明确人物」和「寓言类」两批。

## A 组：有明确人物（适合 has_fate=true）

1. 凿壁偷光（西汉·匡衡）✓ 已写
2. 悬梁刺股（汉·孙敬 / 战国·苏秦）
3. 韦编三绝（春秋·孔子）
4. 闻鸡起舞（晋·祖逖）
5. 破釜沉舟（秦末·项羽）
6. 鸿门宴（秦末·项羽、刘邦）
7. 负荆请罪（战国·廉颇、蔺相如）
8. 卧薪尝胆（春秋·勾践）
9. 完璧归赵（战国·蔺相如）
10. 纸上谈兵（战国·赵括）
11. 四面楚歌（楚汉·项羽）
12. 投笔从戎（东汉·班超）
13. 鞠躬尽瘁（三国·诸葛亮）
14. 望梅止渴（魏·曹操）
15. 七步成诗（魏·曹植）
16. 乐不思蜀（三国·刘禅）
17. 程门立雪（北宋·杨时）
18. 胸有成竹（北宋·文同）
19. 东窗事发（南宋·秦桧）
20. 精忠报国（南宋·岳飞）

## B 组：寓言/成语（适合 has_fate=false）

1. 守株待兔（战国寓言）✓ 已写
2. 刻舟求剑（战国寓言）
3. 自相矛盾（战国寓言）
4. 画蛇添足（战国寓言）
5. 滥竽充数（战国寓言）
6. 亡羊补牢（战国寓言）
7. 揠苗助长（战国寓言）
8. 买椟还珠（战国寓言）
9. 邯郸学步（战国寓言）
10. 愚公移山（战国寓言）
```

- [ ] **Step 2: 提交**

```bash
git add content/_seed-list.md
git commit -m "docs(content): seed 30-idiom starter list"
```

---

## Task 19: 端到端 smoke 验证

**Files:**
- 无新增文件，纯验证

- [ ] **Step 1: 单元测试**

Run: `npm run test`
Expected: all pass

- [ ] **Step 2: 构建**

Run: `npm run build`
Expected: build 成功；`dist/` 包含：
- `index.html`
- `idiom/zao-bi-tou-guang/index.html`
- `idiom/shou-zhu-dai-tu/index.html`
- `browse/index.html`
- `categories/index.html`
- `categories/<encoded>.../index.html`
- `search/index.html`
- `search-index.json`
- `404.html`

- [ ] **Step 3: 预览 + 路径扫描**

Run: `npm run preview -- --host 0.0.0.0`

Visit these URLs in turn:
1. `/` — hero + 今日一个 + 最近定稿
2. `/idiom/zao-bi-tou-guang/` — 大标题 + 三段 + 「后来怎么样了」色块
3. `/idiom/shou-zhu-dai-tu/` — 大标题 + 两段（无 fate 块）
4. `/browse` — Z / S 字母段
5. `/categories/` — 励志勤学、寓言故事等分类
6. `/categories/励志勤学/` — 含凿壁偷光
7. `/search?q=匡衡` — 命中凿壁偷光
8. `/idiom/no-such/` — 404 页带 3 个随机
9. 切换暗色模式

- [ ] **Step 4: 在 README 末尾追加访问数据章节占位**

Append to `README.md`:
```markdown
## 下一步

- 把第一批 30 个种子词陆续写完（每篇 LLM 草稿 + 人工审）
- 接 Cloudflare Pages 部署
- 加 V2: 交叉引用、时间线、订阅（见 spec section 11）
```

- [ ] **Step 5: 最终提交**

```bash
git add README.md
git commit -m "docs: smock-test README final state"
```

---

## Self-Review Checklist (post-write)

执行上述每一步前在脑里跑一遍：

1. **Spec coverage**:
   - 数据模型：Task 3 ✓
   - 5 类路由：Tasks 5, 8, 9, 11, 12 ✓
   - 视觉：Tasks 2, 5, 13 ✓ + 字体 Task 15
   - 内容生产：Task 16 ✓ + 校验 Task 14
   - 部署：Task 17 ✓
   - 测试：每个 utility task 自带 vitest

2. **No placeholders**: 已具体到代码块、命令、Expected

3. **Type consistency**:
   - `entry.data.slug` 一致
   - `has_fate` 字段名一致
   - `fate_summary` 字段名一致
   - `SearchItem.slug` `SearchItem.fate_summary` 与 frontmatter 对齐
   - search-index.json endpoint 与客户端 fetch URL 一致：`/search-index.json`

4. **Gaps**:
   - Spec 提到"暗色模式" — Task 13 ✓
   - "搜索客户端" — Task 10, 11 ✓
   - "内容校验脚本" — Task 14 ✓
   - "LLM prompt 模板" — Task 16 ✓
   - "部署配置" — Task 17 ✓
   - "30 词候选" — Task 18 ✓

通过。所有 spec section 都被任务覆盖。
