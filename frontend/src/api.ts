import axios from 'axios'
import type { ResourceResponse, VerifyKeyResponse, DownloadStats, PartnerSite } from './types'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// 响应拦截器
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

/**
 * 获取资源列表，支持分页和搜索
 */
export const getResources = async (params?: {
  page?: number
  per_page?: number
  search?: string
  category?: string
}): Promise<ResourceResponse> => {
  const response = await api.get('/resources', { params })
  return response.data
}

/**
 * 验证赞助者密钥
 */
export const verifySponsorKey = async (key: string): Promise<VerifyKeyResponse> => {
  const response = await api.post('/verify-key', { key })
  return response.data
}

/**
 * 下载资源文件
 */
export const downloadResource = async (
  resourceId: number, 
  sponsorKey?: string,
  onProgress?: (progress: number) => void
): Promise<void> => {
  const config: any = {
    responseType: 'blob',
    timeout: 0, // 下载不设置超时
  }

  // 如果有赞助者密钥，添加到请求头
  if (sponsorKey) {
    config.headers = {
      'X-Sponsor-Key': sponsorKey
    }
  }

  // 添加下载进度监听
  if (onProgress) {
    config.onDownloadProgress = (progressEvent: any) => {
      if (progressEvent.lengthComputable) {
        const progress = (progressEvent.loaded / progressEvent.total) * 100
        onProgress(progress)
      }
    }
  }

  try {
    const response = await api.get(`/download/${resourceId}`, config)
    
    // 从响应头获取文件名
    const contentDisposition = response.headers['content-disposition']
    let filename = `download_${resourceId}.zip`
  
  if (contentDisposition) {
    // 处理 RFC 6266 格式的文件名
    const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/)
    if (filenameStarMatch) {
      filename = decodeURIComponent(filenameStarMatch[1])
    } else {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/)
      if (filenameMatch) {
        filename = filenameMatch[1]
      }
    }
  }

  // 创建下载链接
  const blob = new Blob([response.data])
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  
    // 清理
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error: any) {
    // 处理404 资源不存在错误
    if (error.response?.status === 404 && error.response.data) {
      // 404 错误通常返回json，可以直接使用
      const errorMessage = error.response.data.error || '资源不存在'
      throw new Error(errorMessage)
    }

    // 处理下载次数限制错误
    if (error.response?.status === 429 && error.response.data) {
      // 因为 responseType 是 'blob', 我们需要手动解析错误
      try {
        const errorJson = await error.response.data.text()
        const errorData = JSON.parse(errorJson)
        const message = errorData.error + (errorData.remaining_time ? `，${errorData.remaining_time}` : '')
        throw new Error(message)
      } catch (e) {
        // 如果解析失败，抛出通用错误
        throw new Error('下载次数已达上限，请稍后再试。')
      }
    }
    // 重新抛出其他错误，确保有错误信息
    throw new Error(error.message || '下载失败，请稍后重试')
  }
}

/**
 * 获取下载统计信息
 */
export const getDownloadStats = async (): Promise<DownloadStats> => {
  const response = await api.get('/stats')
  return response.data
}

/**
 * 获取合作站点列表
 */
export const getPartnerSites = async (): Promise<PartnerSite[]> => {
  const response = await api.get('/partner-sites')
  return response.data
}