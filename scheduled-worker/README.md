# 每日 Coze 外部触发器

独立 Cloudflare Worker，目标时间为每天北京时间 12:00（UTC 04:00）。
调用工作流 `7639272269608747035`、应用 `7639197470828347438`。
问题为“今天的AI领域新闻有哪些”，保留调用示例中的 Default 会话参数。

## 部署

1. 在 Cloudflare 创建 `ai-news-scheduler`，将 `worker.mjs` 内容粘贴到编辑器并部署。
2. 在 Settings → Runtime variables and secrets 添加 `COZE_API_TOKEN`，必须勾选 Secret。
3. 使用编辑器的 Schedule 测试入口执行一次；如果工作流含投递节点，测试也会真实投递。
4. 在 Coze 执行记录确认完成，并在 Cloudflare 日志确认 `status: completed`。
5. 在 Settings → Trigger events 添加 Cron `0 4 * * *`。触发器配置传播可能需要约 15 分钟。

也可在此目录使用 Wrangler 部署；`wrangler.jsonc` 包含目标定时规则，部署前先配置 Secret。
GitHub Pages 的现有部署不负责部署这个 Worker。

## 行为和限制

- 只有 scheduled 入口调用 Coze；公开 HTTP 地址仅返回说明。
- 检查 HTTP 状态、SSE 错误、中断事件及正常结束事件，避免把 HTTP 200 误判为成功。
- 等待超过 12 分钟则停止等待并报错。这不保证取消 Coze 端已启动的执行。
- 不自动重试，避免超时后重复执行工作流中的投递行为。
- 日志记录开始、完成、失败和耗时，不记录 Token 或新闻正文。
- 不保存新闻正文，不新增邮件/飞书投递；投递行为由 Coze 工作流自身决定。
- 定时运行不是严格准点或恰好一次保证。Token 有效期、Coze 额度和云端服务状态仍会影响执行。
- 上线后应核对首次定时执行记录；Cloudflare `completed` 表示接口流正常结束，业务投递仍需核对目的渠道。

## 本地检查

```sh
node --test scheduled-worker/worker.test.mjs
```

在仓库根目录执行；测试不调用真实 Coze 接口。

## 已迁移至 DeepSeek

2026-11-06 已关闭此 Coze Worker 的定时触发。新任务位于
`Yhao-L/aibase_news_rss/worker`，Cloudflare 服务名为 `ai-news-service`，
每天北京时间 12:00 生成并发送飞书日报。此目录仅保留历史实现用于回滚，勿同时启用两套 Cron。
