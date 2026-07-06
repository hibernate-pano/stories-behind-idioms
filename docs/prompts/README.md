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
