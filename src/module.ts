import { readdir, readFile } from 'node:fs/promises'
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
import createJITI from 'jiti'
import type { Processor } from 'bullmq/dist/esm/interfaces'

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

    nuxt.hook('nitro:init', async ({ unimport, options: config }) => {
      const jiti = createJITI(config.rootDir!, {
        esmResolve: true,
        interopDefault: true,
        alias: config.alias,
      })

      for (const file of workerFiles) {
        const workerPath = await resolver.resolvePath(path.join(workerDir, file))
        const workerName = file.replace(/\.(ts|js)$/, '')
        const injectedResult = await unimport?.injectImports(await readFile(workerPath, 'utf-8'))
        if (!injectedResult) continue

        const [workerHandler, workerOptions] = jiti.evalModule(injectedResult.code, { filename: workerPath }) as [Processor, WorkerOptions]
        logger.info(`Initializing BullMQ worker: ${workerName}`)
        new Worker(workerName, workerHandler, { ...workerOptions, connection: options.connection } as WorkerOptions)
      }
    })
  },
})
