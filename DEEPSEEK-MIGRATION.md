# 新闻服务迁移

新后端源码在 `Yhao-L/aibase_news_rss` 的 `worker/`，本项目负责网页体验。

本地联调：

```sh
REACT_APP_API_BASE_URL=http://localhost:8787 npm start
```

默认生产地址为 `https://ai-news-service.sky1342866713.workers.dev`。
必须先部署后端、配置 Secrets 并完成真实模型和飞书联调，再将本分支合入 main（main 推送会自动发布网页）。

本次隐藏播客和旧推送页面，移除当前用户入口对 Coze 的依赖；历史源文件暂留，未纳入新页面构建。
浏览器发送最近最多 20 条消息，错误消息不会作为模型上下文。
用户切换对话后，异步回复仍写回发起请求的原对话。

本地验证：API 单元测试两项通过，生产构建通过。真实 DeepSeek 回复需配置后端密钥后单独验证。
