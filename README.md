# Smart Prompt

智能 Prompt 管理工具 - 让你轻松管理和优化 AI 提示词。

## 特性

- 本地存储 - 数据保存在本地文件系统，安全可控
- 版本管理 - 每次修改自动记录版本，保留完整历史
- 变量替换 - 支持 {{变量}} 语法，调试预览一键搞定
- AI 调试 - 集成 DeepSeek API 在线测试效果
- 评分系统 - 1-5 星评分，记录每个版本的实际效果
- 主题切换 - 明暗主题，随心所欲
- 导入导出 - JSON 格式，迁移无忧

## 技术栈

- 后端: Java 8 + SpringBoot 2.7
- 前端: 原生 HTML/CSS/JavaScript
- 存储: 本地文件系统（JSON）
- AI: DeepSeek API

## 快速开始

### 环境要求

- JDK 8+
- Maven 3.x

### 构建运行

```bash
# 进入项目目录
cd smart-prompt

# 打包
mvn clean package

# 运行
mvn spring-boot:run

# 或使用启动脚本
./start.bat
```

### 访问应用

打开浏览器访问: [http://localhost:8080](http://localhost:8080)

## 使用指南

### 创建 Prompt

1. 点击界面上的"新建"按钮
2. 输入 Prompt 标题和内容
3. 使用 {{变量名}} 语法定义变量

### 版本管理

- 每次保存都会自动创建新版本
- 可以查看历史版本并对比
- 支持版本回滚

### AI 调试

1. 配置 DeepSeek API（在 application.yml 中设置 api-key）
2. 选择要测试的 Prompt
3. 点击"AI 测试"按钮
4. 输入变量值并提交

### 变量替换

在 Prompt 中使用 {{变量名}} 语法：

```
请帮我写一个{{语言}}的{{函数类型}}函数，函数名为{{函数名}}
```

预览时填入变量值即可实时替换。

## 配置

配置文件位于 `src/main/resources/application.yml`：

```yaml
server:
  port: 8080

app:
  data-dir: ./data/prompts
  ai:
    api-url: https://api.deepseek.com/v1/chat/completions
    api-key: your-api-key-here
    model: deepseek-chat
```

## 项目结构

```
smart-prompt/
├── src/main/
│   ├── java/com/promptmgr/
│   │   ├── controller/    # REST API 控制器
│   │   ├── model/          # 数据模型
│   │   ├── repository/     # 数据访问层
│   │   └── service/        # 业务逻辑
│   └── resources/
│       ├── static/         # 前端静态资源
│       └── application.yml # 配置文件
├── data/prompts/           # Prompt 数据存储
└── pom.xml                 # Maven 配置
```

## 🚀 迭代计划

### v2.0 路线图

- [ ] **多模型调试支持** - 支持多个 AI 模型的调试，扩展内部模型接入
  - [ ] 添加模型选择器，支持切换不同 AI 提供商
  - [ ] 设计可插拔的模型适配器接口
  - [ ] 支持内部私有模型的对接

- [ ] **协作功能** - 修改分类为创建人，支持多人编辑
  - [ ] 将分类字段改为创建人字段
  - [ ] 实现多人协作编辑功能

- [ ] **多模态输出** - 支持更多输出类型：图片、视频调试
  - [ ] 支持图片生成调试
  - [ ] 支持视频生成调试
  - [ ] 添加多模态结果预览组件

## 许可证

Apache License 2.0

