# 故事背后的人和事

> 每个成语背后都有故事，每个故事背后都有人，而每个人最后都有自己的命运。

一个读起来像书而非词典的中文成语站。

## 开发

```bash
npm install
npm run dev       # 本地预览 http://localhost:4321
npm run test      # 跑 vitest
npm run build     # 构建生产版本到 dist/
```

## 内容

- `content/idioms/*.md` - 已定稿条目
- `drafts/idioms/*.md` - LLM 草稿，部署排除
- `docs/prompts/draft.md` - LLM 起草 prompt

## 部署

Vercel。每次 push 到 `master` 自动部署。

### 配置步骤

1. 把仓库推到 GitHub
2. 登录 [vercel.com](https://vercel.com)（用 GitHub 登录）
3. New Project → Import 仓库
4. Vercel 自动识别 Astro：Build Command = `npm run build`，Output = `dist`
5. 点 Deploy

Hobby plan 免费，100GB/月流量，个人项目绰绰有余。生产域名见 Vercel 控制台 — 可绑定自定义域名。

## 下一步

- 把第一批 30 个种子词陆续写完（每篇 LLM 草稿 + 人工审）
- 接 Vercel 部署
- 加 V2: 交叉引用、时间线、订阅（见 spec section 11）

## 下一步

- 把第一批 30 个种子词陆续写完（每篇 LLM 草稿 + 人工审）
- 接 Vercel 部署（把仓库推上 GitHub，登录 vercel.com，import 仓库）
