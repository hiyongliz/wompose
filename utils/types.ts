export interface ConvertOptions {
  provider: 'kubernetes' | 'openshift'
  controller: 'deployment' | 'daemonset' | 'replicationcontroller'
  replicas: number
  volumeType: 'persistentVolumeClaim' | 'emptyDir' | 'hostPath' | 'configMap'
  generateJson: boolean
  withKomposeAnnotations: boolean
  generateNetworkPolicies: boolean
  pvcRequestSize?: string
  namespace?: string
}

export interface OutputFile {
  name: string
  content: string
  kind: string
}

export interface ConvertResult {
  files: OutputFile[]
  warnings: string[]
}

export interface ComposeService {
  image?: string
  build?: string | { context?: string; dockerfile?: string }
  ports?: (string | { target: number; published: number })[]
  volumes?: string[]
  environment?: Record<string, string> | string[]
  command?: string | string[]
  entrypoint?: string | string[]
  depends_on?: string[] | Record<string, { condition: string }>
  labels?: Record<string, string>
  deploy?: {
    replicas?: number
    resources?: {
      limits?: { cpus?: string; memory?: string }
      reservations?: { cpus?: string; memory?: string }
    }
  }
  healthcheck?: {
    test?: string | string[]
    interval?: string
    timeout?: string
    retries?: number
    start_period?: string
  }
  restart?: string
  networks?: string[]
  container_name?: string
}

export interface ComposeFile {
  version?: string
  services: Record<string, ComposeService>
  volumes?: Record<string, any>
  networks?: Record<string, any>
}
