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

Cloudflare Pages。每次 push 自动部署。

生产域名见 Cloudflare 控制台。
