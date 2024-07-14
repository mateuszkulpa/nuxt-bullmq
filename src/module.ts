import { readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import * as path from 'node:path'
import {
  defineNuxtModule,
  createResolver,
  addServerImportsDir,
  addTypeTemplate,
  updateRuntimeConfig, useLogger,
} from '@nuxt/kit'
import { Worker, type WorkerOptions } from 'bullmq'
import { relative } from 'pathe'

export interface ModuleOptions {
  connection: WorkerOptions['connection']
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-bullmq',
    configKey: 'bullmq',
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const logger = useLogger('nuxt-bullmq')

    updateRuntimeConfig({ bullmq: { connection: options.connection } })

    addServerImportsDir(resolver.resolve('./runtime/server/utils'))

    const workerDir = join(nuxt.options.rootDir, 'server', 'workers')
    if (!existsSync(workerDir)) {
      logger.warn(`Directory /server/workers not found. Workers will not be initialized.`)
      return
    }

    const workerFiles = (await readdir(workerDir)).filter(file => file.endsWith('.ts'))

    addTypeTemplate({
      filename: 'workers/types.d.ts',
      getContents: () => {
        const relativeWorkerDir = relative(path.join(nuxt.options.buildDir, 'workers'), workerDir)
        return `import type { Job } from 'bullmq'
export type Workers = ${workerFiles.map((file) => {
  const workerName = file.replace(/\.(ts|js)$/, '')
  return `'${workerName}'`
}).join(' | ')}

export type WorkerInputTypes = {
  ${workerFiles.map((file) => {
    const workerName = file.replace(/\.(ts|js)$/, '')
    const workerPath = path.join(relativeWorkerDir, file).replace(/\\/g, '/')
    return `${workerName}: Parameters<typeof import("${workerPath}").default>[0] extends Job<infer DataType> ? DataType : never`
  }).join(',\n  ')}
}
        `
      },
    })

    nuxt.hook('nitro:init', ({ options: config }) => {
      config.alias['#workers'] = './workers'
    })

    for (const file of workerFiles) {
      const workerPath = await resolver.resolvePath(path.join(workerDir, file))
      const workerName = file.replace(/\.(ts|js)$/, '')
      const [workerHandler, workerOptions] = await import(workerPath)
      logger.info(`Initializing BullMQ worker: ${workerName}`)
      new Worker(workerName, workerHandler, { connection: options.connection, ...workerOptions } as WorkerOptions)
    }
  },
})
