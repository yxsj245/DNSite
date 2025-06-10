export interface Resource {
  id: number
  file_path: string
  display_name: string
  category: string[]
  description: string
  file_size?: number
  file_size_formatted?: string
  last_modified?: string
  last_modified_formatted?: string
}

export interface ResourceResponse {
  resources: Resource[]
  pagination: {
    page: number
    per_page: number
    total: number
    pages: number
  }
  categories: string[]
  category_counts: { [key: string]: number }
}

export interface VerifyKeyResponse {
  valid: boolean
  message: string
}

export interface DownloadStats {
  active_downloads: number
  total_ips: number
  download_counts: number
  total_traffic: {
    total_bytes: number
    total_downloads: number
    total_traffic_formatted: string
  }
}

export interface ApiError {
  error: string
}

export interface PartnerSite {
  name: string;
  description: string;
  url: string;
}