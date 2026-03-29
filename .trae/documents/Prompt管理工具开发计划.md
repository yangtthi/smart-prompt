# Prompt 管理工具开发计划

## 项目概述

开发一个本地文件-based 的 Prompt 管理工具，提供 Web 界面查看和使用，支持版本管理、变量替换、在线调试和结果评分等功能。

## 技术栈

- **后端**: Java 8 + SpringBoot 2.7.x
- **前端**: 纯静态 HTML + CSS + JavaScript (无框架)
- **数据存储**: 本地文件系统 (JSON文件)
- **构建工具**: Maven

## 核心功能需求

### 1. 基础功能

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 本地文件管理 | 基于文件系统的 Prompt 存储 | P0 |
| Web界面 | 静态 HTML 查看和使用 | P0 |
| 无需登录 | 开放访问 | P0 |
| 版本管理 | 版本历史记录（不支持回溯） | P0 |
| 变量替换 | 支持 `{{var}}` 格式 | P0 |
| 在线调试 | 仅支持文生文 | P0 |
| 结果评分 | 1-5分评分 | P0 |
| 结构化输出 | 支持 MD、JSON 格式 | P0 |

### 2. 高级功能

| 功能 | 描述 | 优先级 |
|------|------|--------|
| AI优化提示词 | 调用大模型优化 | P1 |
| 导入导出 | JSON格式导入导出 | P1 |

---

## 阶段一：项目初始化与基础架构

### 目标
搭建 SpringBoot 项目结构，配置基础 Web 服务和静态资源访问。

### 成功标准
- 项目可以成功编译和启动
- 访问 `/` 返回静态 HTML 页面
- 访问 `/api/prompts` 返回示例数据

### 任务清单
1. 创建 Maven 项目结构 (pom.xml)
2. 配置 SpringBoot 启动类和配置文件
3. 创建静态资源目录结构
4. 创建基础 HTML 入口页面
5. 创建基础 Controller 提供 REST API 骨架
6. 配置日志和异常处理
7. 编写启动脚本

### 测试用例
- [ ] 启动成功，端口 8080 可访问
- [ ] 根路径返回 index.html
- [ ] API 路径可正常响应

---

## 阶段二：Prompt 数据模型与文件存储

### 目标
定义数据结构，实现基于本地文件的 CRUD 操作。

### 成功标准
- 可以创建、读取、更新、删除 Prompt
- 数据持久化到本地 JSON 文件

### 数据结构设计

```json
{
  "id": "uuid",
  "name": "Prompt名称",
  "content": "Prompt内容",
  "description": "描述",
  "category": "分类",
  "variables": ["var1", "var2"],
  "outputFormat": "markdown|json|text",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "versions": [
    {
      "version": 1,
      "content": "版本内容",
      "createdAt": "2024-01-01T00:00:00Z",
      "score": 4,
      "testResult": "测试结果内容"
    }
  ]
}
```

### 任务清单
1. 创建 Prompt 实体类
2. 创建 VersionRecord 版本记录类
3. 创建 PromptRepository 文件存储实现
4. 实现基础 CRUD API
5. 实现版本保存逻辑

### 测试用例
- [ ] 创建新 Prompt 成功
- [ ] 获取 Prompt 列表成功
- [ ] 更新 Prompt 内容创建新版本（不支持回溯）
- [ ] 删除 Prompt 成功

---

## 阶段三：Web 前端界面开发

### 目标
开发完整的静态 HTML 界面，支持 Prompt 管理、版本查看、变量替换预览。

### 成功标准
- 界面美观易用
- 所有功能可通过界面操作

### 界面设计

#### 3.1 主页面 (index.html)
- 左侧：Prompt 列表（支持分类筛选、搜索）
- 中间：Prompt 编辑器（支持 Markdown 预览）
- 右侧：版本历史和评分

#### 3.2 功能模块
- **Prompt 列表**: 展示所有 Prompt，支持搜索和分类
- **编辑器**: 支持语法高亮、变量高亮、预览
- **版本历史**: 展示所有版本（仅查看，不支持回溯）
- **调试面板**: 输入变量值，预览替换结果

### 任务清单
1. 创建 CSS 样式文件
2. 创建主页面 HTML 结构
3. 实现 Prompt 列表组件
4. 实现编辑器组件（变量高亮）
5. 实现版本历史组件
6. 实现变量替换预览
7. 实现调试面板

### 测试用例
- [ ] 界面正常加载
- [ ] 可以创建新 Prompt
- [ ] 可以编辑 Prompt 内容
- [ ] 变量 `{{var}}` 正确高亮显示

---

## 阶段四：在线调试功能

### 目标
实现在线变量替换和文生文调试功能。

### 成功标准
- 输入变量值，生成替换后的完整 Prompt
- 调用文生文 API 获取返回结果

### 调试流程
1. 用户选择 Prompt
2. 填写变量值
3. 点击调试按钮
4. 后端进行变量替换
5. 调用大模型 API
6. 返回结果并展示

### 任务清单
1. 创建变量提取工具类（解析 `{{var}}`）
2. 实现变量替换服务
3. 创建调试 API
4. 添加调试面板 UI
5. 集成文生文 API 调用

### 测试用例
- [ ] 正确提取变量 `{{name}}`, `{{age}}`
- [ ] 变量替换正确
- [ ] 调试结果正确返回

---

## 阶段五：评分与结构化输出

### 目标
支持对调试结果进行 1-5 分评分，支持 MD/JSON 结构化输出。

### 成功标准
- 可以对每次调试结果评分
- 评分记录保存到版本历史
- 支持输出格式切换

### 任务清单
1. 添加评分 API
2. 更新版本历史展示评分
3. 实现输出格式切换（MD/JSON/TEXT）
4. 添加复制功能

### 测试用例
- [ ] 评分成功保存
- [ ] 评分在版本历史中展示
- [ ] 输出格式切换正常

---

## 阶段六：高级功能（AI优化与导入导出）

### 目标
实现 AI 优化提示词和导入导出功能。

### 成功标准
- 可以调用 AI 优化提示词
- 可以导出全部 Prompt 为 JSON
- 可以导入 JSON 文件

### 任务清单
1. 配置 AI API (OpenAI/Claude/本地模型)
2. 创建 AI 优化 API
3. 添加优化按钮 UI
4. 实现导出功能（全量导出）
5. 实现导入功能（JSON 格式）

### 测试用例
- [ ] AI 优化功能正常工作
- [ ] 导出生成正确 JSON 文件
- [ ] 导入成功加载 Prompt

---

## 阶段七：优化与完善

### 目标
完善细节，提升用户体验。

### 任务清单
1. 完善错误处理
2. 添加加载状态提示
3. 优化界面细节
4. 添加快捷键支持
5. 编写 README 文档

---

## 文件结构

```
prompt-manager/
├── src/main/java/com/promptmgr/
│   ├── PromptManagerApplication.java
│   ├── controller/
│   │   └── PromptController.java
│   ├── model/
│   │   ├── Prompt.java
│   │   └── VersionRecord.java
│   ├── repository/
│   │   └── PromptRepository.java
│   ├── service/
│   │   ├── PromptService.java
│   │   ├── VariableService.java
│   │   └── AiService.java
│   └── config/
│       └── AppConfig.java
├── src/main/resources/
│   ├── application.yml
│   └── prompts/
│       └── (prompt data files)
├── src/main/resources/static/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
├── pom.xml
└── start.sh / start.bat
```

---

## API 设计

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/prompts | 获取所有 Prompt |
| GET | /api/prompts/{id} | 获取单个 Prompt |
| POST | /api/prompts | 创建 Prompt |
| PUT | /api/prompts/{id} | 更新 Prompt |
| DELETE | /api/prompts/{id} | 删除 Prompt |
| POST | /api/prompts/{id}/debug | 调试 Prompt |
| POST | /api/prompts/{id}/versions/{versionId}/score | 评分 |
| POST | /api/prompts/optimize | AI 优化 |
| GET | /api/prompts/export | 导出全部 |
| POST | /api/prompts/import | 导入 |

---

## 实施顺序

1. **阶段一** → 项目初始化 (预计 30 分钟)
2. **阶段二** → 数据模型与存储 (预计 45 分钟)
3. **阶段三** → Web 前端 (预计 60 分钟)
4. **阶段四** → 在线调试 (预计 45 分钟)
5. **阶段五** → 评分与输出 (预计 30 分钟)
6. **阶段六** → 高级功能 (预计 45 分钟)
7. **阶段七** → 优化完善 (预计 30 分钟)

**总计预计**: 约 4.75 小时
