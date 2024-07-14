import type { Job, WorkerOptions } from 'bullmq'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function defineWorkerHandler<DataType = any, ReturnType = any>(
  handler: (job: Job<DataType>) => Promise<ReturnType> | ReturnType,
  workerOptions?: Omit<WorkerOptions, 'connection'>,
) {
  return [handler, workerOptions]
}
