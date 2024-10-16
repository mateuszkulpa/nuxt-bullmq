export default defineWorkerHandler<{ filter: 'blur' | 'sepia' }>(async (job) => {
  console.log('Processing video started...', job.data)

  await new Promise((resolve) => {
    setTimeout(resolve, 5000)
  })

  console.log('Processing video completed...')
}, { concurrency: 50 })
