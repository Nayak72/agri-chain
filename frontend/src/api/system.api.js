import { healthClient } from './client'

export const systemApi = {
  healthLive: () =>
    healthClient.get('/health/live'),

  healthReady: () =>
    healthClient.get('/health/ready'),
}

