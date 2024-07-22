export default defineEventHandler(async () => {
  const videoQueue = useQueue('processVideo')
  await videoQueue.add('video-123', { filter: 'blur' })

  const audioQueue = useQueue('processAudio')
  await audioQueue.add('audio-123', { volume: 123 })

  return { message: 'Queues initialized' }
})
