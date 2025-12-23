import yaml from 'js-yaml'
import type { ConvertOptions, ConvertResult, OutputFile, ComposeFile, ComposeService } from './types'

export async function convertCompose(input: string, options: ConvertOptions): Promise<ConvertResult> {
  const files: OutputFile[] = []
  const warnings: string[] = []

  // Parse compose file
  let compose: ComposeFile
  try {
    compose = yaml.load(input) as ComposeFile
  } catch (e: any) {
    throw new Error(`Invalid YAML: ${e.message}`)
  }

  if (!compose || !compose.services) {
    throw new Error('Invalid compose file: missing services section')
  }

  // Generate resources for each service
  for (const [serviceName, service] of Object.entries(compose.services)) {
    const normalizedName = normalizeServiceName(serviceName)
    
    // Generate Deployment/DaemonSet/ReplicationController
    const workload = generateWorkload(normalizedName, service, options)
    files.push(workload)

    // Generate Service if ports are defined
    if (service.ports && service.ports.length > 0) {
      const svc = generateService(normalizedName, service, options)
      files.push(svc)
    }

    // Generate PVC if volumes are defined
    if (service.volumes && service.volumes.length > 0 && options.volumeType === 'persistentVolumeClaim') {
      const pvcs = generatePVCs(normalizedName, service, options)
      files.push(...pvcs)
    }

    // Generate Ingress if wompose.service.expose is set
    const labels = service.labels || {}
    if (labels['wompose.service.expose'] && service.ports && service.ports.length > 0) {
      const ingress = generateIngress(normalizedName, service, options)
      files.push(ingress)
    }
  }

  // Generate NetworkPolicies if enabled
  if (options.generateNetworkPolicies) {
    for (const [serviceName, service] of Object.entries(compose.services)) {
      const normalizedName = normalizeServiceName(serviceName)
      const networkPolicy = generateNetworkPolicy(normalizedName, service, compose.services, options)
      files.push(networkPolicy)
    }
  }

  return { files, warnings }
}

function normalizeServiceName(name: string): string {
  return name.replace(/[_.]/g, '-').toLowerCase()
}

function generateWorkload(name: string, service: ComposeService, options: ConvertOptions): OutputFile {
  const labels = service.labels || {}
  const controllerType = labels['wompose.controller.type'] || options.controller
  
  let kind: string
  let apiVersion: string
  
  if (options.provider === 'openshift') {
    kind = 'DeploymentConfig'
    apiVersion = 'apps.openshift.io/v1'
  } else {
    switch (controllerType) {
      case 'daemonset':
        kind = 'DaemonSet'
        apiVersion = 'apps/v1'
        break
      case 'replicationcontroller':
        kind = 'ReplicationController'
        apiVersion = 'v1'
        break
      default:
        kind = 'Deployment'
        apiVersion = 'apps/v1'
    }
  }

  const replicas = service.deploy?.replicas || options.replicas
  const container = buildContainer(name, service, options)
  const volumes = buildVolumes(name, service, options)

  const workload: any = {
    apiVersion,
    kind,
    metadata: {
      name,
      ...(options.withKomposeAnnotations && {
        annotations: {
          
          'wompose.version': '1.0.0'
        }
      }),
      labels: {
        'io.wompose.service': name
      }
    },
    spec: {
      ...(kind !== 'DaemonSet' && { replicas }),
      selector: kind === 'ReplicationController' 
        ? { 'io.wompose.service': name }
        : { matchLabels: { 'io.wompose.service': name } },
      template: {
        metadata: {
          labels: {
            'io.wompose.service': name
          }
        },
        spec: {
          containers: [container],
          ...(volumes.length > 0 && { volumes }),
          restartPolicy: getRestartPolicy(service.restart)
        }
      }
    }
  }

  // Handle OpenShift specific fields
  if (options.provider === 'openshift') {
    workload.spec.selector = { 'io.wompose.service': name }
    delete workload.spec.selector.matchLabels
  }

  const content = options.generateJson 
    ? JSON.stringify(workload, null, 2)
    : yaml.dump(workload, { indent: 2, lineWidth: -1 })

  return {
    name: `${name}-${kind.toLowerCase()}.${options.generateJson ? 'json' : 'yaml'}`,
    content,
    kind
  }
}

function buildContainer(name: string, service: ComposeService, options: ConvertOptions): any {
  const container: any = {
    name,
    image: service.image || 'placeholder:latest'
  }

  // Ports
  if (service.ports && service.ports.length > 0) {
    container.ports = service.ports.map(port => {
      if (typeof port === 'string') {
        const parts = port.split(':')
        const containerPort = parseInt(parts[parts.length - 1])
        return { containerPort }
      }
      return { containerPort: port.target }
    })
  }

  // Environment variables
  if (service.environment) {
    if (Array.isArray(service.environment)) {
      container.env = service.environment.map(env => {
        const [key, value] = env.split('=')
        return { name: key, value: value || '' }
      })
    } else {
      container.env = Object.entries(service.environment).map(([key, value]) => ({
        name: key,
        value: String(value)
      }))
    }
  }

  // Command
  if (service.command) {
    container.args = Array.isArray(service.command) 
      ? service.command 
      : service.command.split(' ')
  }

  // Entrypoint
  if (service.entrypoint) {
    container.command = Array.isArray(service.entrypoint)
      ? service.entrypoint
      : [service.entrypoint]
  }

  // Resources
  if (service.deploy?.resources) {
    container.resources = {}
    if (service.deploy.resources.limits) {
      container.resources.limits = {}
      if (service.deploy.resources.limits.memory) {
        container.resources.limits.memory = service.deploy.resources.limits.memory
      }
      if (service.deploy.resources.limits.cpus) {
        container.resources.limits.cpu = service.deploy.resources.limits.cpus
      }
    }
    if (service.deploy.resources.reservations) {
      container.resources.requests = {}
      if (service.deploy.resources.reservations.memory) {
        container.resources.requests.memory = service.deploy.resources.reservations.memory
      }
      if (service.deploy.resources.reservations.cpus) {
        container.resources.requests.cpu = service.deploy.resources.reservations.cpus
      }
    }
  }

  // Volume mounts
  if (service.volumes && service.volumes.length > 0) {
    container.volumeMounts = service.volumes.map((vol, index) => {
      const parts = vol.split(':')
      const mountPath = parts[1] || parts[0]
      return {
        name: `${name}-vol${index}`,
        mountPath
      }
    })
  }

  // Health check
  if (service.healthcheck) {
    const probe: any = {}
    
    if (service.healthcheck.test) {
      const test = Array.isArray(service.healthcheck.test) 
        ? service.healthcheck.test 
        : service.healthcheck.test.split(' ')
      
      if (test[0] === 'CMD' || test[0] === 'CMD-SHELL') {
        probe.exec = { command: test.slice(1) }
      } else {
        probe.exec = { command: test }
      }
    }

    if (service.healthcheck.interval) {
      probe.periodSeconds = parseDuration(service.healthcheck.interval)
    }
    if (service.healthcheck.timeout) {
      probe.timeoutSeconds = parseDuration(service.healthcheck.timeout)
    }
    if (service.healthcheck.retries) {
      probe.failureThreshold = service.healthcheck.retries
    }
    if (service.healthcheck.start_period) {
      probe.initialDelaySeconds = parseDuration(service.healthcheck.start_period)
    }

    container.livenessProbe = probe
  }

  // Image pull policy from labels
  const labels = service.labels || {}
  if (labels['wompose.image-pull-policy']) {
    container.imagePullPolicy = labels['wompose.image-pull-policy']
  }

  return container
}

function buildVolumes(name: string, service: ComposeService, options: ConvertOptions): any[] {
  if (!service.volumes || service.volumes.length === 0) return []

  return service.volumes.map((vol, index) => {
    const volName = `${name}-vol${index}`
    const parts = vol.split(':')
    const hostPath = parts[0]

    switch (options.volumeType) {
      case 'emptyDir':
        return { name: volName, emptyDir: {} }
      case 'hostPath':
        return { name: volName, hostPath: { path: hostPath } }
      case 'configMap':
        return { name: volName, configMap: { name: volName } }
      default:
        return { name: volName, persistentVolumeClaim: { claimName: volName } }
    }
  })
}

function generateService(name: string, service: ComposeService, options: ConvertOptions): OutputFile {
  const labels = service.labels || {}
  let serviceType = 'ClusterIP'
  
  const typeLabel = labels['wompose.service.type']
  if (typeLabel) {
    switch (typeLabel.toLowerCase()) {
      case 'nodeport':
        serviceType = 'NodePort'
        break
      case 'loadbalancer':
        serviceType = 'LoadBalancer'
        break
      case 'headless':
        serviceType = 'ClusterIP'
        break
    }
  }

  const ports = (service.ports || []).map((port, index) => {
    let targetPort: number
    let publishedPort: number

    if (typeof port === 'string') {
      const parts = port.split(':')
      if (parts.length === 2) {
        publishedPort = parseInt(parts[0])
        targetPort = parseInt(parts[1])
      } else {
        targetPort = parseInt(parts[0])
        publishedPort = targetPort
      }
    } else {
      targetPort = port.target
      publishedPort = port.published || port.target
    }

    const portSpec: any = {
      name: `${targetPort}-tcp`,
      port: publishedPort,
      targetPort
    }

    // NodePort specific port
    if (serviceType === 'NodePort' && labels['wompose.service.nodeport.port']) {
      portSpec.nodePort = parseInt(labels['wompose.service.nodeport.port'])
    }

    return portSpec
  })

  const svc: any = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name,
      ...(options.withKomposeAnnotations && {
        annotations: {
          
          'wompose.version': '1.0.0'
        }
      }),
      labels: {
        'io.wompose.service': name
      }
    },
    spec: {
      type: serviceType,
      ports,
      selector: {
        'io.wompose.service': name
      }
    }
  }

  // Headless service
  if (labels['wompose.service.type'] === 'headless') {
    svc.spec.clusterIP = 'None'
  }

  // External traffic policy
  if (labels['wompose.service.external-traffic-policy']) {
    svc.spec.externalTrafficPolicy = labels['wompose.service.external-traffic-policy']
  }

  const content = options.generateJson
    ? JSON.stringify(svc, null, 2)
    : yaml.dump(svc, { indent: 2, lineWidth: -1 })

  return {
    name: `${name}-service.${options.generateJson ? 'json' : 'yaml'}`,
    content,
    kind: 'Service'
  }
}

function generatePVCs(name: string, service: ComposeService, options: ConvertOptions): OutputFile[] {
  if (!service.volumes) return []

  return service.volumes.map((vol, index) => {
    const volName = `${name}-vol${index}`
    const labels = service.labels || {}
    
    const pvc: any = {
      apiVersion: 'v1',
      kind: 'PersistentVolumeClaim',
      metadata: {
        name: volName,
        ...(options.withKomposeAnnotations && {
          annotations: {
            
            'wompose.version': '1.0.0'
          }
        }),
        labels: {
          'io.wompose.service': name
        }
      },
      spec: {
        accessModes: ['ReadWriteOnce'],
        resources: {
          requests: {
            storage: labels['wompose.volume.size'] || options.pvcRequestSize || '100Mi'
          }
        }
      }
    }

    // Storage class
    if (labels['wompose.volume.storage-class-name']) {
      pvc.spec.storageClassName = labels['wompose.volume.storage-class-name']
    }

    const content = options.generateJson
      ? JSON.stringify(pvc, null, 2)
      : yaml.dump(pvc, { indent: 2, lineWidth: -1 })

    return {
      name: `${volName}-pvc.${options.generateJson ? 'json' : 'yaml'}`,
      content,
      kind: 'PersistentVolumeClaim'
    }
  })
}

function generateNetworkPolicy(
  name: string, 
  service: ComposeService, 
  allServices: Record<string, ComposeService>,
  options: ConvertOptions
): OutputFile {
  const dependsOn = service.depends_on || []
  const deps = Array.isArray(dependsOn) ? dependsOn : Object.keys(dependsOn)

  const ingress: any[] = []
  
  // Allow traffic from services that depend on this one
  for (const [svcName, svc] of Object.entries(allServices)) {
    const svcDeps = svc.depends_on || []
    const svcDepsList = Array.isArray(svcDeps) ? svcDeps : Object.keys(svcDeps)
    
    if (svcDepsList.includes(name)) {
      ingress.push({
        from: [{
          podSelector: {
            matchLabels: { 'io.wompose.service': normalizeServiceName(svcName) }
          }
        }]
      })
    }
  }

  const networkPolicy: any = {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'NetworkPolicy',
    metadata: {
      name: `${name}-network-policy`,
      labels: {
        'io.wompose.service': name
      }
    },
    spec: {
      podSelector: {
        matchLabels: { 'io.wompose.service': name }
      },
      policyTypes: ['Ingress'],
      ingress: ingress.length > 0 ? ingress : [{}]
    }
  }

  const content = options.generateJson
    ? JSON.stringify(networkPolicy, null, 2)
    : yaml.dump(networkPolicy, { indent: 2, lineWidth: -1 })

  return {
    name: `${name}-networkpolicy.${options.generateJson ? 'json' : 'yaml'}`,
    content,
    kind: 'NetworkPolicy'
  }
}

function getRestartPolicy(restart?: string): string {
  switch (restart) {
    case 'no':
      return 'Never'
    case 'on-failure':
      return 'OnFailure'
    default:
      return 'Always'
  }
}

function generateIngress(name: string, service: ComposeService, options: ConvertOptions): OutputFile {
  const labels = service.labels || {}
  const exposeValue = labels['wompose.service.expose']
  const hosts = exposeValue === 'true' ? [`${name}.local`] : exposeValue.split(',').map(h => h.trim())
  
  const port = service.ports?.[0]
  let servicePort = 80
  if (port) {
    if (typeof port === 'string') {
      const parts = port.split(':')
      servicePort = parseInt(parts[parts.length - 1])
    } else {
      servicePort = port.target
    }
  }

  const rules = hosts.map(host => ({
    host,
    http: {
      paths: [{
        path: '/',
        pathType: 'Prefix',
        backend: {
          service: {
            name,
            port: { number: servicePort }
          }
        }
      }]
    }
  }))

  const ingress: any = {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'Ingress',
    metadata: {
      name: `${name}-ingress`,
      ...(options.withKomposeAnnotations && {
        annotations: {
          
          'wompose.version': '1.0.0'
        }
      }),
      labels: {
        'io.wompose.service': name
      }
    },
    spec: {
      rules
    }
  }

  // Ingress class
  if (labels['wompose.service.expose.ingress-class-name']) {
    ingress.spec.ingressClassName = labels['wompose.service.expose.ingress-class-name']
  }

  // TLS
  if (labels['wompose.service.expose.tls-secret']) {
    ingress.spec.tls = [{
      hosts,
      secretName: labels['wompose.service.expose.tls-secret']
    }]
  }

  const content = options.generateJson
    ? JSON.stringify(ingress, null, 2)
    : yaml.dump(ingress, { indent: 2, lineWidth: -1 })

  return {
    name: `${name}-ingress.${options.generateJson ? 'json' : 'yaml'}`,
    content,
    kind: 'Ingress'
  }
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h)?$/)
  if (!match) return 30

  const value = parseInt(match[1])
  const unit = match[2] || 's'

  switch (unit) {
    case 'm':
      return value * 60
    case 'h':
      return value * 3600
    default:
      return value
  }
}
