# 游戏盒子平台（仅积分模式 · 学习用途）

多游戏品类 + 多级代理分销平台。Monorepo，全栈 TypeScript。

## 模块

| 目录 | 角色 | 技术（最优方案） | 状态 |
|------|------|------------------|------|
| `server` | **大脑**：账本/爆率/开奖/分润/风控/实时 | NestJS + Prisma + PostgreSQL + Redis + Socket.IO + BullMQ | 🚧 搭建中 |
| `client-app` | 客户端（玩家/代理/代分/分公司端 APP） | Vue 3 + Capacitor（由原型迁移） | 原型保留，待迁移 |
| `admin-panel` | 管理后台（含 game-control 调爆率） | Vue 3 + Element Plus + ECharts | 原型保留，待迁移 |
| `games-assets` | H5 游戏仓库（被 WebView 嵌入） | Phaser 3 / Canvas | 多款原型，待接 server |
| `packages/shared` | 多端共享：类型/契约/枚举/校验 | TypeScript | 🚧 搭建中 |

> 现有原生 HTML/JS 原型（client-app / admin-panel / games-assets）是**页面样式与交互逻辑的迁移蓝本**，按 `docs/05-工程实施清单.md` 分阶段迁移到最优框架。

## 文档（开工前必读）

见 [`docs/`](./docs)：
1. `00-最优架构方案.md` — 总体技术架构（权威）
2. `01-落地方案.md` — 定位/目录/部署/开发顺序
3. `02-开发规范.md` — 命名/Git/代码/API/安全红线
4. `03-数据库设计.md` — 表设计说明（schema 在 `server/prisma/schema.prisma`）
5. `04-开工前准备清单.md` — 环境/账号/初始化
6. `05-工程实施清单.md` — 一步步实施清单

## 核心原则

**前端只负责展示和操作；凡涉及钱、爆率、开奖结果、分润、风控的逻辑，全部在 `server` 裁决。**

> ⚠️ 仅供学习，严禁用于任何违法用途。
