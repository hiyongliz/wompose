# Wompose

A web-based tool for converting Docker Compose files to Kubernetes manifests. Built with Nuxt 3 and Monaco Editor.

[中文文档](./README.zh-CN.md)

## Features

- **Visual Editor**: Monaco Editor with YAML/JSON syntax highlighting
- **Real-time Conversion**: Convert Docker Compose to Kubernetes resources instantly
- **Multiple Output Types**: Generate Deployments, Services, PVCs, Ingress, NetworkPolicies
- **Provider Support**: Kubernetes and OpenShift
- **Controller Options**: Deployment, DaemonSet, ReplicationController
- **Volume Types**: PersistentVolumeClaim, EmptyDir, HostPath, ConfigMap
- **Resizable Panels**: Drag to resize editor panels horizontally and vertically
- **Download Options**: Download individual files or all at once
- **Labels Reference**: Built-in documentation for Wompose labels

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Wompose Labels

Wompose supports special labels in Docker Compose files to customize Kubernetes resource generation:

| Label | Description |
|-------|-------------|
| `wompose.service.type` | Service type (nodeport, clusterip, loadbalancer, headless) |
| `wompose.service.expose` | Create Ingress (true or domain name) |
| `wompose.controller.type` | Controller type (deployment, daemonset, statefulset) |
| `wompose.volume.size` | PVC storage size (e.g., 1Gi, 10Gi) |
| `wompose.volume.storage-class-name` | StorageClass name |
| `wompose.hpa.cpu` | HPA CPU threshold (%) |
| `wompose.hpa.replicas.min` | HPA minimum replicas |
| `wompose.hpa.replicas.max` | HPA maximum replicas |
| `wompose.cronjob.schedule` | CronJob schedule expression |
| `wompose.image-pull-policy` | Image pull policy |

See the Labels page in the app for complete documentation.

## Example

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

## Tech Stack

- [Nuxt 3](https://nuxt.com/) - Vue.js Framework
- [Vue 3](https://vuejs.org/) - Progressive JavaScript Framework
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code Editor
- [js-yaml](https://github.com/nodeca/js-yaml) - YAML Parser
- TypeScript

## Project Structure

```
kompose-web/
├── assets/css/        # Global styles
├── pages/             # Page components
│   ├── index.vue      # Main converter page
│   └── docs.vue       # Labels documentation
├── plugins/           # Nuxt plugins
├── public/            # Static assets
└── utils/             # Utility functions
    ├── constants.ts   # App constants
    ├── converter.ts   # Conversion logic
    └── types.ts       # TypeScript types
```

## License

MIT
