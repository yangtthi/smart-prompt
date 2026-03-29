# 提示词优化功能设计方案

## 1. 背景分析

根据开发计划，提示词优化功能位于 **阶段六：高级功能（P1优先级）**，描述为：
> AI优化提示词 - 调用大模型优化

该功能需要实现：
1. 配置 AI API (OpenAI/Claude/本地模型)
2. 创建 AI 优化 API
3. 添加优化按钮 UI

---

## 2. 优化目标与场景

### 2.1 优化目标

| 优化维度 | 描述 | 优先级 |
|----------|------|--------|
| 清晰度 | 消除歧义，明确指令 | P0 |
| 结构化 | 更好的格式和层次 | P0 |
| 上下文 | 提供足够的背景信息 | P0 |
| 示例 | 添加Few-shot示例 | P1 |
| 角色定义 | 明确AI扮演的角色 | P1 |

### 2.2 优化场景

| 场景 | 描述 | 优化方向 |
|------|------|----------|
| 模糊指令 | 指令不明确 | 补充具体要求 |
| 缺少约束 | 没有限制条件 | 添加边界条件 |
| 无结构 | 内容混乱无层次 | 添加格式模板 |
| 缺少示例 | 没有示例 | 生成示例 |
| 角色缺失 | 未定义AI角色 | 添加角色设定 |

---

## 3. 技术架构设计

### 3.1 整体架构

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   前端 UI   │────▶│  Controller │────▶│   Service   │
│             │◀────│             │◀────│             │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          ▼                          │
                    │  ┌─────────────┐    ┌─────────────┐    ┌─────────┐ │
                    │  │   OpenAI    │    │   Claude    │    │  Local  │ │
                    │  │   Client    │    │   Client    │    │  Model  │ │
                    │  └─────────────┘    └─────────────┘    └─────────┘ │
                    │                                                     │
                    │              AI Provider 抽象层                    │
                    └─────────────────────────────────────────────────────┘
```

### 3.2 模块设计

| 模块 | 职责 | 关键类 |
|------|------|--------|
| Controller | HTTP 接口 | PromptController |
| Service | 业务逻辑 | AiOptimizationService |
| Provider | AI 接入 | AiProvider (interface) |
| Config | 配置管理 | AiConfig, ProviderConfig |

---

## 4. 数据模型设计

### 4.1 优化请求 DTO

```java
public class OptimizeRequest {
    private String promptId;           // Prompt ID (可选)
    private String content;            // 待优化的 Prompt 内容
    private String optimizationType;  // 优化类型: general|clarity|structure|examples|role
    private String targetLanguage;    // 目标语言: zh|en
    private Map<String, String> context; // 额外上下文
}
```

### 4.2 优化响应 DTO

```java
public class OptimizeResponse {
    private String originalContent;   // 原始内容
    private String optimizedContent;   // 优化后内容
    private List<String> improvements; // 改进点列表
    private String modelUsed;          // 使用的模型
    private long tokenUsage;          // token 消耗
    private long processTime;         // 处理耗时(ms)
}
```

### 4.3 优化类型枚举

| 类型 | 值 | 描述 |
|------|-----|------|
| GENERAL | general | 通用优化 |
| CLARITY | clarity | 提升清晰度 |
| STRUCTURE | structure | 优化结构 |
| EXAMPLES | examples | 添加示例 |
| ROLE | role | 角色定义 |

---

## 5. API 设计

### 5.1 核心接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/prompts/optimize | 优化单个 Prompt |
| POST | /api/prompts/optimize/batch | 批量优化 |
| GET | /api/prompts/optimize/types | 获取优化类型列表 |
| GET | /api/config/ai/providers | 获取可用 AI 提供商 |
| PUT | /api/config/ai | 更新 AI 配置 |

### 5.2 请求示例

**POST /api/prompts/optimize**

```json
{
    "content": "写一段关于春天的文字",
    "optimizationType": "clarity",
    "targetLanguage": "zh"
}
```

### 5.3 响应示例

```json
{
    "success": true,
    "data": {
        "originalContent": "写一段关于春天的文字",
        "optimizedContent": "请以散文风格描写春天的特征，包括：\n1. 自然景象（花朵、树木、流水）\n2. 人们的活动\n3. 情感氛围\n\n要求：\n- 字数：200-300字\n- 运用比喻和拟人修辞\n- 语言优美流畅",
        "improvements": [
            "明确了文体要求（散文）",
            "列出了具体描写维度",
            "添加了字数和修辞要求",
            "明确了语言风格"
        ],
        "modelUsed": "gpt-4",
        "tokenUsage": 1200,
        "processTime": 2500
    }
}
```

---

## 6. AI Provider 抽象设计

### 6.1 Provider 接口

```java
public interface AiProvider {
    String getName();
    boolean isAvailable();
    OptimizeResponse optimize(OptimizeRequest request);
    long estimateTokens(String text);
}
```

### 6.2 支持的 Provider

| Provider | 配置项 | 说明 |
|----------|--------|------|
| OpenAI | apiKey, baseUrl, model | GPT-3.5/GPT-4 |
| Claude | apiKey, baseUrl, model | Claude 3 系列 |
| Custom | baseUrl, model | 自定义兼容 OpenAI API 的模型 |

### 6.3 Provider 选择策略

| 场景 | 推荐 Provider |
|------|---------------|
| 通用优化 | OpenAI GPT-4 |
| 中文优化 | Claude 3 Opus |
| 本地部署 | Custom ( Ollama, LM Studio 等 ) |

---

## 7. 提示词优化策略

### 7.1 优化 Prompt 模板

```
你是一个提示词优化专家。请优化以下提示词，使其更加清晰、有效。

## 原始提示词
{{originalPrompt}}

## 优化类型
{{optimizationType}}

## 优化要求
1. 使指令更加明确具体
2. 添加必要的约束条件
3. 如有必要，添加结构化格式
4. 添加适当的示例（如适用）

## 输出格式
请按以下JSON格式输出：
{
    "optimizedPrompt": "优化后的提示词",
    "improvements": ["改进点1", "改进点2", ...]
}
```

### 7.2 不同优化类型的 Prompt

| 类型 | 优化 Prompt 侧重点 |
|------|---------------------|
| general | 全面优化，提升质量 |
| clarity | 消除歧义，明确意图 |
| structure | 添加格式和层次 |
| examples | 添加 Few-shot 示例 |
| role | 明确角色设定 |

---

## 8. 前端设计

### 8.1 优化按钮位置

在 Prompt 编辑器区域添加"AI 优化"按钮：

```
┌─────────────────────────────────────────────┐
│  Prompt 名称                    [AI 优化 ▼] │
├─────────────────────────────────────────────┤
│                                             │
│  编辑器区域                                  │
│                                             │
└─────────────────────────────────────────────┘
```

### 8.2 优化下拉菜单

| 选项 | 描述 |
|------|------|
| 通用优化 | 综合提升提示词质量 |
| 提升清晰度 | 使指令更明确 |
| 优化结构 | 添加格式和层次 |
| 添加示例 | 生成 Few-shot 示例 |
| 角色设定 | 定义 AI 角色 |

### 8.3 优化结果展示

优化完成后，显示对比视图：

```
┌────────────────────┬────────────────────┐
│     原始版本       │     优化版本       │
├────────────────────┼────────────────────┤
│  写一段关于春天... │  请以散文风格描写..│
│                    │  包括：            │
│                    │  1. 自然景象...     │
├────────────────────┼────────────────────┤
│                    │  改进点：           │
│                    │  ✓ 明确文体要求    │
│                    │  ✓ 列出描写维度    │
│                    │  ✓ 添加约束条件    │
└────────────────────┴────────────────────┘
       [取消]        [采纳优化] [复制]
```

---

## 9. 配置设计

### 9.1 application.yml 配置

```yaml
ai:
  provider: openai  # openai|claude|custom
  openai:
    api-key: ${OPENAI_API_KEY:}
    base-url: https://api.openai.com/v1
    model: gpt-4
    timeout: 60000
  claude:
    api-key: ${CLAUDE_API_KEY:}
    base-url: https://api.anthropic.com
    model: claude-3-opus-20240229
    timeout: 60000
  custom:
    base-url: http://localhost:11434/v1
    model: llama2
    api-key: none
    timeout: 120000
```

### 9.2 配置管理 API

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/config/ai | 获取当前 AI 配置 |
| PUT | /api/config/ai | 更新 AI 配置 |
| GET | /api/config/ai/test | 测试 AI 连接 |

---

## 10. 实施计划

### 阶段一：基础框架 (30 分钟)

| 任务 | 描述 | 状态 |
|------|------|------|
| 1.1 | 创建 OptimizeRequest/Response DTO | 待实施 |
| 1.2 | 创建 AiProvider 接口和抽象类 | 待实施 |
| 1.3 | 创建 AiConfig 配置类 | 待实施 |

### 阶段二：Provider 实现 (45 分钟)

| 任务 | 描述 | 状态 |
|------|------|------|
| 2.1 | 实现 OpenAI Provider | 待实施 |
| 2.2 | 实现 Claude Provider | 待实施 |
| 2.3 | 实现 Custom Provider | 待实施 |

### 阶段三：服务层 (30 分钟)

| 任务 | 描述 | 状态 |
|------|------|------|
| 3.1 | 创建 AiOptimizationService | 待实施 |
| 3.2 | 实现优化逻辑和 Prompt 模板 | 待实施 |
| 3.3 | 添加缓存机制（可选） | 待实施 |

### 阶段四：Controller (15 分钟)

| 任务 | 描述 | 状态 |
|------|------|------|
| 4.1 | 添加优化 API 端点 | 待实施 |
| 4.2 | 添加配置管理端点 | 待实施 |

### 阶段五：前端集成 (30 分钟)

| 任务 | 描述 | 状态 |
|------|------|------|
| 5.1 | 添加优化按钮和下拉菜单 | 待实施 |
| 5.2 | 实现优化结果对比展示 | 待实施 |
| 5.3 | 添加采纳/复制功能 | 待实施 |

---

## 11. 风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| API 调用失败 | 功能不可用 | 提供友好的错误提示，支持切换 Provider |
| Token 费用 | 成本增加 | 添加使用统计，优化 Prompt 减少 Token |
| 优化效果差 | 用户不满意 | 提供多种优化类型，用户可选择 |
| 网络延迟 | 体验差 | 添加加载状态显示，支持本地模型 |

---

## 12. 验收标准

| 标准 | 描述 |
|------|------|
| ✅ | 可以选择不同 Provider (OpenAI/Claude/本地) |
| ✅ | 支持 5 种优化类型 |
| ✅ | 优化结果正确显示改进点 |
| ✅ | 可以采纳优化或复制内容 |
| ✅ | 配置可通过 UI 修改 |
| ✅ | 优雅的错误处理 |

---

## 13. 总结

本方案提供了一个完整的提示词优化功能设计，包括：

1. **多 Provider 支持**：OpenAI、Claude、本地模型
2. **多种优化类型**：通用、清晰度、结构、示例、角色
3. **完整的前端集成**：优化按钮、结果对比、采纳/复制
4. **灵活的配置管理**：可通过 API 或配置文件管理

该设计遵循现有项目的技术栈（Java 8 + SpringBoot 2.7.x），保持代码风格一致性。
