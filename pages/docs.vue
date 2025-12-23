<script setup lang="ts">
import { GITHUB_URL } from '~/utils/constants'

const labels = [
  { 
    key: 'wompose.service.type', 
    values: 'nodeport, clusterip, loadbalancer, headless', 
    desc: 'Service type',
    detail: 'Specifies the Kubernetes Service type. Use "loadbalancer" for external access, "nodeport" for node-level access, "clusterip" for internal-only access, or "headless" for StatefulSet DNS discovery.'
  },
  { 
    key: 'wompose.service.expose', 
    values: 'true, domain.com', 
    desc: 'Create Ingress/Route',
    detail: 'Creates an Ingress resource to expose the service externally. Set to "true" for auto-generated hostname, or specify a domain name like "api.example.com". Multiple domains can be comma-separated.'
  },
  { 
    key: 'wompose.service.expose.tls-secret', 
    values: 'my-tls-secret', 
    desc: 'TLS secret for Ingress',
    detail: 'Specifies the Kubernetes Secret containing TLS certificate and key for HTTPS. The secret must exist in the same namespace and contain "tls.crt" and "tls.key" data.'
  },
  { 
    key: 'wompose.service.expose.ingress-class-name', 
    values: 'nginx, traefik', 
    desc: 'Ingress class',
    detail: 'Specifies which Ingress controller should handle this Ingress resource. Common values include "nginx", "traefik", "haproxy", or cloud-specific controllers.'
  },
  { 
    key: 'wompose.service.nodeport.port', 
    values: '30000-32767', 
    desc: 'NodePort port number',
    detail: 'Specifies a fixed NodePort number. Must be in the range 30000-32767. If not specified, Kubernetes will auto-assign a port.'
  },
  { 
    key: 'wompose.controller.type', 
    values: 'deployment, daemonset, replicationcontroller, statefulset', 
    desc: 'Controller type',
    detail: 'Specifies the workload controller type. Use "deployment" for stateless apps, "daemonset" for node-level services, "statefulset" for stateful apps requiring stable network identity and storage.'
  },
  { 
    key: 'wompose.image-pull-policy', 
    values: 'Always, IfNotPresent, Never', 
    desc: 'Image pull policy',
    detail: 'Controls when Kubernetes pulls the container image. "Always" pulls on every restart, "IfNotPresent" only pulls if not cached locally, "Never" uses only local images.'
  },
  { 
    key: 'wompose.image-pull-secret', 
    values: 'my-registry-secret', 
    desc: 'Image pull secret',
    detail: 'Specifies the Secret containing credentials for pulling images from private registries. The secret must be of type kubernetes.io/dockerconfigjson.'
  },
  { 
    key: 'wompose.volume.size', 
    values: '1Gi, 10Gi, 100Gi', 
    desc: 'PVC storage size',
    detail: 'Specifies the storage capacity for PersistentVolumeClaim. Use standard Kubernetes resource quantities like "1Gi", "500Mi", "10Gi".'
  },
  { 
    key: 'wompose.volume.storage-class-name', 
    values: 'standard, fast-ssd, gp2', 
    desc: 'StorageClass name',
    detail: 'Specifies the StorageClass for dynamic volume provisioning. Common values depend on your cluster: "standard", "premium-rwo", "gp2" (AWS), "pd-ssd" (GCP).'
  },
  { 
    key: 'wompose.volume.type', 
    values: 'persistentVolumeClaim, emptyDir, hostPath, configMap', 
    desc: 'Volume type',
    detail: 'Specifies how volumes are provisioned. "persistentVolumeClaim" for persistent storage, "emptyDir" for temporary storage, "hostPath" for node filesystem, "configMap" for configuration data.'
  },
  { 
    key: 'wompose.volume.subpath', 
    values: 'data, config', 
    desc: 'Volume subpath',
    detail: 'Mounts a specific subdirectory from the volume instead of the root. Useful when sharing a volume between multiple containers or mounting specific files.'
  },
  { 
    key: 'wompose.hpa.cpu', 
    values: '50, 80', 
    desc: 'HPA CPU threshold (%)',
    detail: 'Creates a HorizontalPodAutoscaler that scales pods when average CPU utilization exceeds this percentage. Requires metrics-server in the cluster.'
  },
  { 
    key: 'wompose.hpa.memory', 
    values: '200Mi, 1Gi', 
    desc: 'HPA memory threshold',
    detail: 'Creates a HorizontalPodAutoscaler that scales pods when average memory usage exceeds this value. Requires metrics-server in the cluster.'
  },
  { 
    key: 'wompose.hpa.replicas.min', 
    values: '1, 2, 3', 
    desc: 'HPA min replicas',
    detail: 'Minimum number of pod replicas the HPA will maintain. The autoscaler will never scale below this number.'
  },
  { 
    key: 'wompose.hpa.replicas.max', 
    values: '5, 10, 20', 
    desc: 'HPA max replicas',
    detail: 'Maximum number of pod replicas the HPA can scale to. Set based on your resource capacity and cost constraints.'
  },
  { 
    key: 'wompose.cronjob.schedule', 
    values: '*/5 * * * *, 0 2 * * *', 
    desc: 'CronJob schedule',
    detail: 'Cron expression for scheduling jobs. Format: "minute hour day month weekday". Examples: "*/5 * * * *" (every 5 min), "0 2 * * *" (daily at 2am).'
  },
  { 
    key: 'wompose.cronjob.concurrency_policy', 
    values: 'Allow, Forbid, Replace', 
    desc: 'CronJob concurrency',
    detail: 'Controls concurrent job execution. "Allow" permits overlapping jobs, "Forbid" skips new jobs if previous is running, "Replace" cancels current job and starts new one.'
  },
  { 
    key: 'wompose.cronjob.backoff_limit', 
    values: '3, 6', 
    desc: 'CronJob retry limit',
    detail: 'Number of retries before marking a job as failed. Each retry uses exponential backoff delay.'
  },
  { 
    key: 'wompose.security-context.fsgroup', 
    values: '1000, 1001', 
    desc: 'Filesystem group ID',
    detail: 'Sets the group ID for volume ownership. All files created in volumes will be owned by this group. Important for shared storage access.'
  },
  { 
    key: 'wompose.service.group', 
    values: 'frontend, backend', 
    desc: 'Service group',
    detail: 'Groups multiple services into a single Pod as sidecar containers. Services with the same group label will be deployed together.'
  },
  { 
    key: 'wompose.init.containers.name', 
    values: 'init-db, wait-for-redis', 
    desc: 'Init container name',
    detail: 'Adds an init container that runs before the main container. Use for setup tasks like database migrations, waiting for dependencies, or downloading configs.'
  },
  { 
    key: 'wompose.init.containers.image', 
    values: 'busybox, alpine', 
    desc: 'Init container image',
    detail: 'Docker image for the init container. Typically lightweight images like busybox or alpine for simple setup scripts.'
  },
  { 
    key: 'wompose.init.containers.command', 
    values: '["sh", "-c", "echo hello"]', 
    desc: 'Init container command',
    detail: 'Command to run in the init container. JSON array format. The main container starts only after all init containers complete successfully.'
  },
]

const examples = [
  {
    title: 'Web App with LoadBalancer',
    desc: 'Expose a web application externally using a LoadBalancer service',
    code: `services:
  web:
    image: nginx:latest
    ports:
      - "80:80"
    labels:
      wompose.service.type: loadbalancer`
  },
  {
    title: 'Database with Persistent Storage',
    desc: 'PostgreSQL with persistent volume and custom storage class',
    code: `services:
  db:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - db-data:/var/lib/postgresql/data
    labels:
      wompose.volume.size: 10Gi
      wompose.volume.storage-class-name: fast-ssd

volumes:
  db-data:`
  },
  {
    title: 'Auto-scaling API Service',
    desc: 'API with horizontal pod autoscaler based on CPU usage',
    code: `services:
  api:
    image: myapi:latest
    ports:
      - "8080:8080"
    deploy:
      replicas: 2
    labels:
      wompose.hpa.cpu: 70
      wompose.hpa.replicas.min: 2
      wompose.hpa.replicas.max: 10`
  },
  {
    title: 'Service with Ingress',
    desc: 'Expose service via Ingress with TLS termination',
    code: `services:
  frontend:
    image: frontend:latest
    ports:
      - "3000:3000"
    labels:
      wompose.service.expose: api.example.com
      wompose.service.expose.tls-secret: tls-cert
      wompose.service.expose.ingress-class-name: nginx`
  },
  {
    title: 'Scheduled Backup Job',
    desc: 'CronJob that runs daily at 2am',
    code: `services:
  backup:
    image: backup-tool:latest
    restart: "no"
    labels:
      wompose.cronjob.schedule: "0 2 * * *"
      wompose.cronjob.concurrency_policy: Forbid
      wompose.cronjob.backoff_limit: 3`
  },
  {
    title: 'DaemonSet for Logging',
    desc: 'Deploy a log collector on every node',
    code: `services:
  fluentd:
    image: fluentd:latest
    volumes:
      - /var/log:/var/log:ro
    labels:
      wompose.controller.type: daemonset
      wompose.volume.type: hostPath`
  }
]
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="container header-content">
        <NuxtLink to="/" class="logo">
          <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="16" height="16" rx="2" fill="#0e639c"/>
            <text x="8" y="12" text-anchor="middle" fill="white" font-size="10" font-weight="bold">W</text>
          </svg>
          <span>Wompose</span>
        </NuxtLink>
        <nav class="nav-links">
          <NuxtLink to="/">Converter</NuxtLink>
          <a :href="GITHUB_URL" target="_blank" title="GitHub">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
          </a>
        </nav>
      </div>
    </header>

    <main class="main docs-main">
      <div class="docs-container">
        <h1>Wompose Labels Reference</h1>
        <p class="intro">
          Wompose uses special labels in Docker Compose files to customize Kubernetes resource generation.
          Add these labels to your service definitions to control service types, volumes, autoscaling, and more.
        </p>

        <div class="labels-grid">
          <div v-for="label in labels" :key="label.key" class="label-card">
            <div class="label-header">
              <code class="label-key">{{ label.key }}</code>
              <span class="label-desc">{{ label.desc }}</span>
            </div>
            <div class="label-values">
              <span class="values-label">Values:</span>
              <code>{{ label.values }}</code>
            </div>
            <p class="label-detail">{{ label.detail }}</p>
          </div>
        </div>

        <h2>Examples</h2>
        
        <div class="examples-grid">
          <div v-for="example in examples" :key="example.title" class="example-card">
            <div class="example-header">
              <h3>{{ example.title }}</h3>
              <p>{{ example.desc }}</p>
            </div>
            <pre><code>{{ example.code }}</code></pre>
          </div>
        </div>
      </div>
    </main>

    <footer class="footer">
      Wompose - Convert Docker Compose to Kubernetes
    </footer>
  </div>
</template>

<style scoped>
.docs-main {
  overflow: auto;
}

.docs-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.docs-container h1 {
  font-size: 20px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--text-bright);
}

.docs-container h2 {
  font-size: 16px;
  font-weight: 500;
  margin: 32px 0 16px;
  color: var(--text-bright);
  border-bottom: 1px solid var(--border);
  padding-bottom: 8px;
}

.intro {
  color: var(--text-muted);
  margin-bottom: 24px;
  font-size: 13px;
  line-height: 1.6;
}

.labels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 12px;
}

.label-card {
  background: var(--bg-sidebar);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 12px;
}

.label-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.label-key {
  background: var(--bg-input);
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
  color: var(--link);
  font-family: 'Menlo', 'Monaco', monospace;
  display: inline-block;
  width: fit-content;
}

.label-desc {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-bright);
}

.label-values {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.label-values code {
  color: var(--text);
  background: var(--bg-input);
  padding: 2px 4px;
  border-radius: 2px;
  font-family: 'Menlo', 'Monaco', monospace;
}

.values-label {
  margin-right: 4px;
}

.label-detail {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
  margin: 0;
}

.examples-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 16px;
}

.example-card {
  background: var(--bg-sidebar);
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
}

.example-header {
  padding: 12px;
  border-bottom: 1px solid var(--border);
}

.example-header h3 {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-bright);
  margin: 0 0 4px 0;
}

.example-header p {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
}

.example-card pre {
  padding: 12px;
  margin: 0;
  overflow-x: auto;
  font-size: 11px;
  line-height: 1.5;
  background: var(--bg-editor);
}

.example-card code {
  font-family: 'Menlo', 'Monaco', monospace;
}
</style>
