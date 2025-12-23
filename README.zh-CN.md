# Wompose

基于 Web 的 Docker Compose 转 Kubernetes 清单文件工具。使用 Nuxt 3 和 Monaco Editor 构建。

[English](./README.md)

## 功能特性

- **可视化编辑器**：Monaco Editor，支持 YAML/JSON 语法高亮
- **实时转换**：即时将 Docker Compose 转换为 Kubernetes 资源
- **多种输出类型**：生成 Deployment、Service、PVC、Ingress、NetworkPolicy
- **多平台支持**：支持 Kubernetes 和 OpenShift
- **控制器选项**：Deployment、DaemonSet、ReplicationController
- **卷类型**：PersistentVolumeClaim、EmptyDir、HostPath、ConfigMap
- **可调整面板**：支持水平和垂直拖动调整编辑器面板大小
- **下载选项**：支持单独下载或批量下载所有文件
- **标签参考**：内置 Wompose 标签文档

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## Wompose 标签

Wompose 支持在 Docker Compose 文件中使用特殊标签来自定义 Kubernetes 资源生成：

| 标签 | 说明 |
|------|------|
| `wompose.service.type` | Service 类型（nodeport、clusterip、loadbalancer、headless） |
| `wompose.service.expose` | 创建 Ingress（true 或域名） |
| `wompose.controller.type` | 控制器类型（deployment、daemonset、statefulset） |
| `wompose.volume.size` | PVC 存储大小（如 1Gi、10Gi） |
| `wompose.volume.storage-class-name` | StorageClass 名称 |
| `wompose.hpa.cpu` | HPA CPU 阈值（%） |
| `wompose.hpa.replicas.min` | HPA 最小副本数 |
| `wompose.hpa.replicas.max` | HPA 最大副本数 |
| `wompose.cronjob.schedule` | CronJob 调度表达式 |
| `wompose.image-pull-policy` | 镜像拉取策略 |

完整文档请查看应用内的 Labels 页面。

## 示例

```yaml
services:
  web:
    image: nginx:latest
    ports:
      - "80:80"
    labels:
      wompose.service.type: loadbalancer
      wompose.service.expose: api.example.com

  db:
    image: postgres:15
    volumes:
      - db-data:/var/lib/postgresql/data
    labels:
      wompose.volume.size: 10Gi

volumes:
  db-data:
```

## 技术栈

- [Nuxt 3](https://nuxt.com/) - Vue.js 框架
- [Vue 3](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - 代码编辑器
- [js-yaml](https://github.com/nodeca/js-yaml) - YAML 解析器
- TypeScript

## 项目结构

```
kompose-web/
├── assets/css/        # 全局样式
├── pages/             # 页面组件
│   ├── index.vue      # 主转换器页面
│   └── docs.vue       # 标签文档页面
├── plugins/           # Nuxt 插件
├── public/            # 静态资源
└── utils/             # 工具函数
    ├── constants.ts   # 应用常量
    ├── converter.ts   # 转换逻辑
    └── types.ts       # TypeScript 类型
```

## 许可证

MIT
