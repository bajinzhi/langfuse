# 中文二手集市演示数据

这个目录提供一个可重复执行的中文闭环示例初始化脚本，用于本地开发和产品演示。

执行命令：

```bash
pnpm db:seed:cn-marketplace
```

脚本会创建一个独立示例项目：

- 组织：`中文二手集市演示组织`
- 项目：`中文二手集市演示`
- 登录账号：`cn-marketplace-demo@langfuse.local`
- 登录密码：`password`
- Public Key：`pk-lf-cn-marketplace-demo`
- Secret Key：`sk-lf-cn-marketplace-demo`
- 默认 LLM Provider：`ollama`
- 默认 Ollama Base URL：`http://localhost:11434/v1`
- 默认 Ollama 模型：优先使用 `CN_MARKETPLACE_OLLAMA_MODEL` 或 `OLLAMA_MODEL`；未设置时自动从本地 Ollama `/api/tags` 读取最近更新的模型；检测失败时回退到 `qwen2.5:7b`

示例数据覆盖从项目创建到项目内业务数据的完整链路：中文 prompts、traces、observations、scores、score configs、dataset、dataset runs、experiments、Promptfoo 矩阵运行与报告、evaluation templates、evaluation job executions、annotation queue、dashboard widgets、LLM schema/tool 和自定义模型价格。

脚本结束时会输出 `navigationCoverage`，逐项验证左侧菜单中的仪表盘、追踪、会话、用户、提示词、调试台、评分、LLM 评审、人工标注、数据集和实验都有可展示的闭环数据；任一栏目缺少核心数据会直接中止并报错。调试台窗口内容由浏览器 sessionStorage 保存，脚本会准备可运行的本地 Ollama 模型连接、中文 Prompt、Schema 和 Tool，并可从提示词详情页跳转到调试台复用 Prompt。实验页面受 Beta 开关控制，脚本会准备 dataset runs 与 events_core 中的 experiment_id / experiment_item_id / trace_id 闭环数据。

Promptfoo 示例会同时写入独立的 Promptfoo traces、generation observations、events、dataset run items、命名断言分数和报告对象记录。JSON 报告保留逐条评估结果、模型输出、断言结果、token/cost、Langfuse trace 与 dataset run item 链接；HTML 报告提供中文概览和评估明细，便于第一次打开系统时顺着数据理解完整评估闭环。

如果您本地 Ollama 的地址或模型名不同，可以在执行前覆盖：

```bash
CN_MARKETPLACE_OLLAMA_BASE_URL=http://localhost:11434/v1 CN_MARKETPLACE_OLLAMA_MODEL=gemma4-local:26b-q4 pnpm db:seed:cn-marketplace
```

重复执行时，脚本只会重置固定项目 ID `cn-marketplace-demo-project` 下的数据。若发现同 ID 项目没有脚本写入的 seed 标记，会直接中止，避免误删已有项目。
