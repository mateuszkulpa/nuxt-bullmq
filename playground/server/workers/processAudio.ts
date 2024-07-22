export default defineWorkerHandler<{ volume: number }>(async (job) => {
  console.log('Processing audio started...', job.data)

  await new Promise((resolve) => {
    setTimeout(resolve, 5000)
  })

  console.log('Processing audio completed...')
}, { concurrency: 50 })
