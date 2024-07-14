import { Queue } from 'bullmq'
import { useRuntimeConfig } from '#imports'
import type { Workers, WorkerInputTypes } from '#workers/types'

export default function createQueue<QueueName extends Workers>(queueName: QueueName): Queue<WorkerInputTypes[QueueName]> {
  const { bullmq: { connection } } = useRuntimeConfig()
  return new Queue<WorkerInputTypes[typeof queueName]>(queueName, { connection })
}
