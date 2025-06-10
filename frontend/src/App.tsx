import { useState, useEffect } from 'react'
import { Download, Shield, Zap, FileText, Image, Music, Code, Filter, Settings, Trash2, Edit, CheckCircle, AlertCircle, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { downloadResource, getResources, verifySponsorKey, getDownloadStats, getPartnerSites } from './api'
import type { Resource, DownloadStats, PartnerSite } from './types'
import { waitTime, maxDownloadsPerHour, nonSponsorSpeedLimit, sponsorSpeed, adModal } from './config'

function App() {
  const [resources, setResources] = useState<Resource[]>([])
  const [sponsorKey, setSponsorKey] = useState('')
  const [isKeyVerified, setIsKeyVerified] = useState(false)
  const [loading, setLoading] = useState(true)
  const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set())
  const [downloadProgress, setDownloadProgress] = useState<{[key: number]: number}>({})
  const [selectedCategory, setSelectedCategory] = useState<string>('全部')
  const [currentPage, setCurrentPage] = useState<'all' | 'settings' | 'partners'>('all')
  const [partnerSites, setPartnerSites] = useState<PartnerSite[]>([])
  const [isEditingKey, setIsEditingKey] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [currentPageNumber, setCurrentPageNumber] = useState(1)
  const [itemsPerPage] = useState(20)
  const [pagination, setPagination] = useState({ page: 1, per_page: 20, total: 0, pages: 0 })
  const [allResourceIds, setAllResourceIds] = useState<number[]>([])
  const [trafficStats, setTrafficStats] = useState<DownloadStats | null>(null)
  const [allCategories, setAllCategories] = useState<string[]>([])

  useEffect(() => {
    loadSponsorKey()
    loadTrafficStats()
    loadPartnerSites()
    // 从URL参数中读取初始分类
    const urlParams = new URLSearchParams(window.location.search)
    const categoryParam = urlParams.get('category')
    const searchParam = urlParams.get('search')
    const pageParam = urlParams.get('page')
    
    if (categoryParam) {
      setSelectedCategory(categoryParam)
    }
    if (searchParam) {
      setSearchKeyword(searchParam)
      setSearchInput(searchParam)
    }
    if (pageParam) {
      const page = parseInt(pageParam)
      if (page > 0) {
        setCurrentPageNumber(page)
      }
    }
  }, [])

  useEffect(() => {
    loadResources()
    // 更新URL参数
    updateURLParams()
  }, [currentPageNumber, selectedCategory, searchKeyword])

  // 从localStorage加载赞助者密钥
  const loadSponsorKey = () => {
    const savedKey = localStorage.getItem('sponsorKey')
    if (savedKey) {
      setSponsorKey(savedKey)
      // 自动验证已保存的密钥
      verifySavedKey(savedKey)
    }
  }

  // 验证已保存的密钥
  const verifySavedKey = async (key: string) => {
    try {
      const result = await verifySponsorKey(key)
      setIsKeyVerified(result.valid)
      if (!result.valid) {
        // 如果密钥无效，清除本地存储
        localStorage.removeItem('sponsorKey')
        setSponsorKey('')
      }
    } catch (error) {
      console.error('Auto verification failed:', error)
    }
  }

  // 加载流量统计
  const loadTrafficStats = async () => {
    try {
      const stats = await getDownloadStats()
      setTrafficStats(stats)
    } catch (error) {
      console.error('Failed to load traffic stats:', error)
    }
  }

  // 加载合作站点
  const loadPartnerSites = async () => {
    try {
      const sites = await getPartnerSites()
      setPartnerSites(sites)
    } catch (error) {
      console.error('Failed to load partner sites:', error)
    }
  }

  // 保存密钥到localStorage
  const saveSponsorKey = (key: string) => {
    if (key.trim()) {
      localStorage.setItem('sponsorKey', key.trim())
    } else {
      localStorage.removeItem('sponsorKey')
    }
  }

  // 删除密钥
  const deleteSponsorKey = () => {
    localStorage.removeItem('sponsorKey')
    setSponsorKey('')
    setIsKeyVerified(false)
    setIsEditingKey(false)
    toast.success('密钥已删除')
  }

  // 更新URL参数
  const updateURLParams = () => {
    const params = new URLSearchParams()
    
    if (selectedCategory && selectedCategory !== '全部') {
      params.set('category', selectedCategory)
    }
    if (searchKeyword) {
      params.set('search', searchKeyword)
    }
    if (currentPageNumber > 1) {
      params.set('page', currentPageNumber.toString())
    }
    
    const newURL = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname
    window.history.replaceState({}, '', newURL)
  }

  // 处理分类选择
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category)
    setCurrentPageNumber(1)
  }

  // 处理页码变化
  const handlePageChange = (page: number) => {
    setCurrentPageNumber(page)
  }

  // 处理搜索
  const handleSearch = () => {
    setSearchKeyword(searchInput)
    setCurrentPageNumber(1) // 重置到第一页
  }

  // 处理回车键搜索
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // 清除搜索
  const handleClearSearch = () => {
    setSearchInput('')
    setSearchKeyword('')
    setCurrentPageNumber(1)
  }

  const handleShowDetail = (resource: Resource) => {
    setSelectedResource(resource)
    setShowDetailModal(true)
  }

  const handleCloseDetail = () => {
    setShowDetailModal(false)
    setSelectedResource(null)
  }

  const loadResources = async () => {
    try {
      setLoading(true)
      const data = await getResources({
        page: currentPageNumber,
        per_page: itemsPerPage,
        search: searchKeyword,
        category: selectedCategory === '全部' ? '' : selectedCategory
      })
      
      setResources(data.resources)
      setPagination(data.pagination)
      // 设置所有分类数据
      if (data.categories) {
        setAllCategories(data.categories)
      }
      
      // 生成当前页面资源的全局ID映射
      const startIndex = (data.pagination.page - 1) * data.pagination.per_page
      const resourceIds = data.resources.map((_, index) => startIndex + index)
      setAllResourceIds(resourceIds)
      
    } catch (error) {
      toast.error('加载资源列表失败')
      console.error('Failed to load resources:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyKey = async () => {
    if (!sponsorKey.trim()) {
      toast.error('请输入赞助者密钥')
      return
    }

    try {
      const result = await verifySponsorKey(sponsorKey)
      setIsKeyVerified(result.valid)
      
      if (result.valid) {
        saveSponsorKey(sponsorKey)
        setIsEditingKey(false)
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('验证失败，请稍后重试')
      console.error('Key verification failed:', error)
    }
  }

  const [waitingDownloads, setWaitingDownloads] = useState<Set<number>>(new Set())
  const [waitingProgress, setWaitingProgress] = useState<{[key: number]: number}>({})
  const [showAdModal, setShowAdModal] = useState(false)
  const [currentWaitingResource, setCurrentWaitingResource] = useState<{id: number, resource: Resource} | null>(null)

  const handleDownload = async (resourceId: number, resource: Resource) => {
    if (downloadingIds.has(resourceId) || waitingDownloads.has(resourceId)) {
      return
    }

    // 如果是赞助者，直接下载
    if (isKeyVerified) {
      startDirectDownload(resourceId, resource)
      return
    }

    // 非赞助者需要等待5秒
    setWaitingDownloads(prev => new Set(prev).add(resourceId))
    setWaitingProgress(prev => ({ ...prev, [resourceId]: 0 }))
    setCurrentWaitingResource({ id: resourceId, resource })
    setShowAdModal(true)
    
    toast.success(`准备下载：${resource.display_name} (需等待${waitTime}秒)`)
     
     // 倒计时
     let countdown = waitTime
     const timer = setInterval(() => {
       countdown--
       const progress = ((waitTime - countdown) / waitTime) * 100
       setWaitingProgress(prev => ({ ...prev, [resourceId]: progress }))
       
       if (countdown <= 0) {
        clearInterval(timer)
        setWaitingDownloads(prev => {
          const newSet = new Set(prev)
          newSet.delete(resourceId)
          return newSet
        })
        setWaitingProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[resourceId]
          return newProgress
        })
        setShowAdModal(false)
        setCurrentWaitingResource(null)
        
        // 开始实际下载
        startDirectDownload(resourceId, resource)
      }
    }, 1000)
  }

  const startDirectDownload = async (resourceId: number, resource: Resource) => {
    setDownloadingIds(prev => new Set(prev).add(resourceId))
    setDownloadProgress(prev => ({ ...prev, [resourceId]: 0 }))
    
    try {
      const speedInfo = isKeyVerified ? sponsorSpeed : `限速${nonSponsorSpeedLimit}`
      toast.success(`开始下载：${resource.display_name} (${speedInfo})`)
      
      // 使用真实的下载进度回调
      await downloadResource(
        resourceId, 
        isKeyVerified ? sponsorKey : undefined,
        (progress) => {
          setDownloadProgress(prev => ({ ...prev, [resourceId]: progress }))
        }
      )
      
      // 下载完成
      setDownloadProgress(prev => ({ ...prev, [resourceId]: 100 }))
      toast.success(`下载完成：${resource.display_name}`)
      
      // 刷新流量统计
      loadTrafficStats()
      
      // 延迟清除进度条
      setTimeout(() => {
        setDownloadProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[resourceId]
          return newProgress
        })
      }, 2000)
      
    } catch (error: any) {
      // 显示具体的错误信息
      const errorMessage = error.message || '下载失败，请稍后重试'
      toast.error(errorMessage)
      console.error('Download failed:', error)
      // 清除失败的进度
      setDownloadProgress(prev => {
        const newProgress = { ...prev }
        delete newProgress[resourceId]
        return newProgress
      })
    } finally {
      setDownloadingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(resourceId)
        return newSet
      })
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case '运行环境':
        return <Code className="w-3.5 h-3.5" />
      case '游戏资源':
        return <Zap className="w-3.5 h-3.5" />
      case '文档资料':
        return <FileText className="w-3.5 h-3.5" />
      case '多媒体':
        return <Music className="w-3.5 h-3.5" />
      case '软件工具':
        return <Settings className="w-3.5 h-3.5" />
      case 'Docker':
        return <Image className="w-3.5 h-3.5" /> // Docker图标
      default:
        return <Image className="w-3.5 h-3.5" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case '软件工具':
        return 'bg-indigo-100 text-indigo-800'
      case '运行环境':
        return 'bg-emerald-100 text-emerald-800'
      case '游戏资源':
        return 'bg-purple-100 text-purple-800'
      case '文档资料':
        return 'bg-green-100 text-green-800'
      case '多媒体':
        return 'bg-orange-100 text-orange-800'
      case 'Docker':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // 获取一级分类列表（使用后端返回的完整分类列表）
  const getMainCategories = () => {
    return allCategories.sort()
  }

  // 获取指定一级分类下的所有二级分类
  const getSubCategories = (mainCategory: string) => {
    const subCategories = new Set<string>()
    resources.forEach(resource => {
      if (resource.category && resource.category.length > 1 && resource.category[0] === mainCategory) {
        subCategories.add(resource.category[1])
      }
    })
    return Array.from(subCategories).sort()
  }

  // 获取分类下的资源数量（注意：这里显示的是当前搜索条件下的总数量，不是当前页面的数量）
  const getCategoryCount = (category: string) => {
    // 如果是"全部"分类，返回总数量
    if (category === '全部') {
      return pagination.total
    }
    // 对于其他分类，由于我们只有当前页面的数据，这里的计数可能不准确
    // 理想情况下应该从后端获取每个分类的准确计数
    return resources.filter(resource => 
      resource.category && resource.category.includes(category)
    ).length
  }

  // 当筛选条件改变时重置页码
  useEffect(() => {
    setCurrentPageNumber(1)
  }, [selectedCategory, searchKeyword])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Download className="w-8 h-8 text-primary-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">星辰的资源下载站</h1>
            </div>
            <div className="text-sm text-gray-500">
              {isKeyVerified ? (
                <span className="flex items-center text-green-600">
                  <Shield className="w-4 h-4 mr-1" />
                  赞助者模式
                </span>
              ) : (
                <span>普通用户模式</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setCurrentPage('all')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                currentPage === 'all'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="flex items-center">
                <Download className="w-4 h-4 mr-2" />
                全部
              </span>
            </button>
            <button
              onClick={() => setCurrentPage('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                currentPage === 'settings'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                设置
              </span>
            </button>
            <button
              onClick={() => setCurrentPage('partners')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                currentPage === 'partners'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                合作站点
              </span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPage === 'all' && (
          <div className="animate-fade-in">
            {/* Search Bar */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-4">
              <div className="flex items-center mb-3">
                <Search className="w-4 h-4 text-primary-600 mr-2" />
                <h2 className="text-base font-semibold text-gray-900">搜索资源</h2>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    placeholder="搜索资源名称或描述..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200"
                  />
                  {searchInput && (
                    <button
                      onClick={handleClearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    >
                      ×
                    </button>
                  )}
                </div>
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-200 flex items-center"
                >
                  <Search className="w-4 h-4 mr-1" />
                  搜索
                </button>
              </div>
              {searchKeyword && (
                <div className="mt-2 text-sm text-gray-500">
                  搜索关键词："{searchKeyword}" ({pagination.total} 个结果)
                </div>
              )}
            </div>
            
            {/* Category Filter */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <div className="flex items-center mb-3">
                <Filter className="w-4 h-4 text-primary-600 mr-2" />
                <h2 className="text-base font-semibold text-gray-900">资源分类</h2>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {/* 全部分类按钮 */}
                <div className="relative group">
                  <button
                    onClick={() => handleCategorySelect('全部')}
                    className={`w-full flex flex-col items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedCategory === '全部'
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:shadow-sm'
                    }`}
                  >
                    <Filter className="w-4 h-4 mb-1" />
                    <span className="text-center">全部</span>
                    <span className="text-xs opacity-75">({pagination.total})</span>
                  </button>
                </div>
                
                {/* 一级分类列表 */}
                {getMainCategories().map((mainCategory) => {
                  const subCategories = getSubCategories(mainCategory)
                  const categoryCount = getCategoryCount(mainCategory)
                  
                  return (
                    <div key={mainCategory} className="relative group">
                      <button
                        onClick={() => handleCategorySelect(mainCategory)}
                        className={`w-full flex flex-col items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          selectedCategory === mainCategory
                            ? 'bg-primary-600 text-white shadow-md'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          {getCategoryIcon(mainCategory)}
                          <span className="mt-1 text-center">{mainCategory}</span>
                          <span className="text-xs opacity-75">({categoryCount})</span>
                        </div>
                      </button>
                      
                      {/* 二级标签悬停展示 */}
                      {subCategories.length > 0 && (
                        <div className="absolute left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                          <div className="p-2">
                            <div className="text-xs text-gray-500 mb-2 px-2">二级标签：</div>
                            <div className="flex flex-wrap gap-1">
                              {subCategories.map((subCategory) => (
                                <button
                                  key={subCategory}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCategorySelect(subCategory)
                                  }}
                                  className={`px-2 py-1 rounded text-xs transition-colors duration-200 ${
                                    selectedCategory === subCategory
                                      ? 'bg-primary-100 text-primary-700 border border-primary-300'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  {subCategory}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 text-sm text-gray-500">
                当前显示：{selectedCategory} ({pagination.total} 个资源)
              </div>
            </div>
          </div>
        )}

        {currentPage === 'settings' && (
          <div className="space-y-6 animate-fade-in">
            {/* 赞助者密钥管理 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">赞助者密钥</h3>
              <p className="text-gray-600 mb-4">
                输入赞助者密钥享受无限速下载，否则将限制在{nonSponsorSpeedLimit}且每小时最多下载{maxDownloadsPerHour}次
              </p>
              
              {isKeyVerified && !isEditingKey ? (
                 <div className="space-y-4">
                   <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                     <div className="flex items-center">
                       <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                       <div>
                         <p className="text-sm font-medium text-green-800">密钥已验证</p>
                         <p className="text-xs text-green-600">享受无限速下载</p>
                       </div>
                     </div>
                     <div className="flex space-x-2">
                       <button
                         onClick={() => setIsEditingKey(true)}
                         className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                       >
                         <Edit className="w-4 h-4 mr-1" />
                         更换
                       </button>
                       <button
                         onClick={deleteSponsorKey}
                         className="flex items-center px-3 py-1 text-sm text-red-600 hover:text-red-800"
                       >
                         <Trash2 className="w-4 h-4 mr-1" />
                         删除
                       </button>
                     </div>
                   </div>
                 </div>
               ) : (
                 <div className="space-y-4">
                   <div className="flex space-x-2">
                     <input
                       type="text"
                       value={sponsorKey}
                       onChange={(e) => setSponsorKey(e.target.value)}
                       placeholder="请输入赞助者密钥"
                       className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                     />
                     <button
                       onClick={handleVerifyKey}
                       disabled={!sponsorKey.trim() || loading}
                       className="btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       {loading ? (
                         <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                       ) : (
                         '验证'
                       )}
                     </button>
                   </div>
                   
                   {!isKeyVerified && sponsorKey && (
                     <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                       <AlertCircle className="w-5 h-5 text-yellow-600 mr-3" />
                       <p className="text-sm text-yellow-800">
                         密钥验证失败，请检查密钥是否正确
                       </p>
                     </div>
                   )}
                   
                   <div className="text-sm text-gray-600">
                     <p>• 赞助者可享受无限速下载</p>
                     <p>• 密钥将安全存储在您的浏览器中</p>
                     <p>• 如需获取密钥，<a href="https://afdian.com/a/xiaozhuhouses">赞助项目</a>后，可联系管理员QQ3354416548</p>
                   </div>
                 </div>
               )}
            </div>
          </div>
        )}

        {currentPage === 'all' && (
          <div>
            {/* Resources List */}
            <div className="space-y-2">
              {resources.map((resource, index) => {
                const resourceId = allResourceIds[index] || index
                const isDownloading = downloadingIds.has(resourceId)
                const isWaiting = waitingDownloads.has(resourceId)
                const progress = downloadProgress[resourceId] || 0
                const waitProgress = waitingProgress[resourceId] || 0
                
                return (
                  <div 
                    key={resourceId} 
                    className="group bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden animate-fade-in-up"
                    style={{
                      animationDelay: `${index * 100}ms`,
                      animationFillMode: 'both'
                    }}
                  >
                    {/* 主要信息行 - 始终显示 */}
                    <div className="flex items-center justify-between p-4 cursor-pointer">
                      <div className="flex items-center flex-1 min-w-0">
                        {/* 分类图标 */}
                        <div className="flex-shrink-0 mr-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(resource.category[0])}`}>
                          {getCategoryIcon(resource.category[0])}
                          <span className="ml-1">{resource.category[0]}</span>
                          {resource.category.length > 1 && (
                            <span className="ml-1 text-xs opacity-75">/ {resource.category[1]}</span>
                          )}
                        </span>
                        </div>
                        
                        {/* 文件名 */}
                        <div className="flex-1 min-w-0 mr-4">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {resource.display_name}
                          </h3>
                          <p className="text-xs text-gray-500 truncate">
                            {resource.file_size_formatted || '未知大小'} • {resource.last_modified_formatted || '未知时间'}
                          </p>
                        </div>
                        
                        {/* 下载状态 */}
                        <div className="flex-shrink-0 mr-4">
                          {isWaiting && (
                            <div className="flex items-center text-orange-600">
                              <div className="animate-pulse rounded-full h-2 w-2 bg-orange-500 mr-2"></div>
                              <span className="text-xs">等待中 {Math.round((waitTime - (waitProgress / (100 / waitTime))))}s</span>
                            </div>
                          )}
                          {isDownloading && (
                            <div className="flex items-center text-primary-600">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-600 mr-2"></div>
                              <span className="text-xs">{Math.round(progress)}%</span>
                            </div>
                          )}
                          {!isWaiting && !isDownloading && (
                            <span className="text-xs text-gray-500">
                              {isKeyVerified ? '无限速' : `限速${nonSponsorSpeedLimit.replace('bps', '')}`}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* 操作按钮 */}
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          onClick={() => handleDownload(resourceId, resource)}
                          disabled={isDownloading || isWaiting}
                          className="btn-primary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                          {isWaiting ? (
                            <>
                              <div className="animate-pulse rounded-full h-3 w-3 bg-orange-300 mr-2"></div>
                              等待中
                            </>
                          ) : isDownloading ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                              下载中
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              下载
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={() => handleShowDetail(resource)}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm transition-colors duration-200"
                        >
                          详情
                        </button>
                      </div>
                    </div>
                    
                    {/* 展开的详细信息 - 悬停时显示 */}
                    <div className="max-h-0 group-hover:max-h-96 transition-all duration-300 ease-in-out overflow-hidden">
                      <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                        <div className="pt-3 space-y-3">
                          {/* 描述信息 */}
                          <div>
                            <h4 className="text-xs font-medium text-gray-700 mb-1">资源描述</h4>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {resource.description || '暂无描述'}
                            </p>
                          </div>
                          
                          {/* 文件详细信息 */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-xs font-medium text-gray-700 mb-1">文件大小</h4>
                              <div className="flex items-center text-sm text-gray-600">
                                <FileText className="w-4 h-4 mr-1" />
                                {resource.file_size_formatted || '未知大小'}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-xs font-medium text-gray-700 mb-1">修改时间</h4>
                              <p className="text-sm text-gray-600">
                                {resource.last_modified_formatted || '未知时间'}
                              </p>
                            </div>
                          </div>
                          
                          {/* 进度条区域 */}
                          {(isWaiting || isDownloading) && (
                            <div>
                              {isWaiting && (
                                <div>
                                  <div className="flex justify-between text-xs text-orange-600 mb-1">
                                    <span>等待下载中...</span>
                                    <span>{Math.round((waitTime - (waitProgress / (100 / waitTime))))}秒后开始</span>
                                  </div>
                                  <div className="w-full bg-orange-200 rounded-full h-2">
                                    <div 
                                      className="bg-orange-500 h-2 rounded-full transition-all duration-300 ease-out"
                                      style={{ width: `${waitProgress}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                              
                              {isDownloading && (
                                <div>
                                  <div className="flex justify-between text-xs text-primary-600 mb-1">
                                    <span>下载进度</span>
                                    <span>{Math.round(progress)}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-primary-600 h-2 rounded-full transition-all duration-300 ease-out"
                                      style={{ width: `${progress}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* 下载限制提示 */}
                          <div className="text-xs text-gray-500 bg-white rounded p-2">
                            {isKeyVerified ? (
                              <span className="text-green-600 flex items-center">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                赞助用户：享受无限速下载
                              </span>
                            ) : (
                              <span className="text-orange-600 flex items-center">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                普通用户：限速{nonSponsorSpeedLimit.replace('bps', '')}，每小时最多{maxDownloadsPerHour}次下载
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="mt-8 flex items-center justify-between bg-white rounded-lg shadow-md p-4">
                <div className="text-sm text-gray-700">
                  显示第 {((pagination.page - 1) * pagination.per_page) + 1} - {Math.min(pagination.page * pagination.per_page, pagination.total)} 项，共 {pagination.total} 项资源
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                    disabled={pagination.page === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    上一页
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                      let pageNum;
                      if (pagination.pages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.pages - 2) {
                        pageNum = pagination.pages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                            pagination.page === pageNum
                              ? 'bg-primary-600 text-white'
                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(Math.min(pagination.pages, pagination.page + 1))}
                    disabled={pagination.page === pagination.pages}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {currentPage === 'partners' && (
          <div className="animate-fade-in">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center mb-4">
                <Shield className="w-5 h-5 text-primary-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">合作站点</h2>
              </div>
              <p className="text-gray-600 text-sm mb-6">
                以下是我们的合作伙伴站点，为您提供更多优质的资源和服务。
              </p>
              
              {/* 合作站点卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {partnerSites.map((site, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:border-primary-300">
                    <div className="space-y-3">
                      <h4 className="text-base font-semibold text-gray-900">{site.name}</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">{site.description}</p>
                      <div className="pt-2">
                        <a 
                          href={site.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-primary-600 hover:text-primary-800 font-medium transition-colors duration-200"
                        >
                          访问站点 →
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {partnerSites.length === 0 && (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">暂无合作站点</h3>
                  <p className="text-gray-500">我们正在寻找更多优质的合作伙伴</p>
                </div>
              )}
            </div>
          </div>
        )}

        {pagination.total === 0 && !loading && currentPage === 'all' && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              {searchKeyword ? (
                <Search className="w-16 h-16 mx-auto" />
              ) : (
                <Filter className="w-16 h-16 mx-auto" />
              )}
            </div>
            {searchKeyword ? (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">未找到相关资源</h3>
                <p className="text-gray-500 mb-4">没有找到包含 "{searchKeyword}" 的资源</p>
                <button
                  onClick={handleClearSearch}
                  className="btn-primary px-4 py-2"
                >
                  清除搜索条件
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">该分类下暂无资源</h3>
                <p className="text-gray-500">请选择其他分类查看</p>
              </>
            )}
          </div>
        )}
        
        {resources.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Download className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无可下载资源</h3>
            <p className="text-gray-500">请稍后再来查看</p>
          </div>
        )}
      </main>

      {/* 广告弹窗 */}
      {showAdModal && currentWaitingResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            {/* 弹窗头部 */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
              <h3 className="text-lg font-bold text-center">准备下载中...</h3>
              <p className="text-center text-blue-100 text-sm mt-1">
                {currentWaitingResource.resource.display_name}
              </p>
            </div>
            
            {/* 倒计时显示 */}
            <div className="p-4 bg-gray-50 border-b">
              <div className="text-center">
                 <div className="text-2xl font-bold text-orange-600 mb-2">
                   {Math.round((waitTime - (waitingProgress[currentWaitingResource.id] || 0) / (100 / waitTime)))} 秒
                 </div>
                <div className="w-full bg-orange-200 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${waitingProgress[currentWaitingResource.id] || 0}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">下载即将开始，请稍候...</p>
              </div>
            </div>
            
            {/* 广告内容 */}
            <div className="p-6">
              {/* 浪浪云广告 */}
              <div className="text-center mb-6">
                 <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-4 rounded-lg mb-4">
                   <h4 className="text-lg font-bold mb-2">{adModal.langlangyun.description}</h4>
                   <p className="text-cyan-100 text-sm mb-3 italic">
                     "{adModal.langlangyun.slogan}"
                   </p>
                   <a 
                     href={adModal.langlangyun.website} 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="inline-block bg-white text-blue-600 px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-50 transition-colors duration-200"
                   >
                     访问官网 →
                   </a>
                 </div>
               </div>
              
              {/* 赞助链接 */}
              <div className="text-center">
                 <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-4 rounded-lg">
                   <h4 className="text-lg font-bold mb-2">支持我们的发展</h4>
                   <p className="text-pink-100 text-sm mb-3">
                     {adModal.sponsor.description}
                   </p>
                   <a 
                     href={adModal.sponsor.url} 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="inline-block bg-white text-pink-600 px-4 py-2 rounded-full text-sm font-medium hover:bg-pink-50 transition-colors duration-200"
                   >
                     赞助支持 ❤️
                   </a>
                 </div>
               </div>
              
              {/* 提示信息 */}
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800 text-center">
                  💡 成为赞助者可享受无限速和次数下载，无需等待！
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
      {showDetailModal && selectedResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto animate-scaleIn">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedResource.display_name}
                </h2>
                <button
                  onClick={handleCloseDetail}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">分类</h3>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(selectedResource.category[0])}`}>
                          {getCategoryIcon(selectedResource.category[0])}
                          <span className="ml-1">{selectedResource.category[0]}</span>
                          {selectedResource.category.length > 1 && (
                            <span className="ml-1 text-xs opacity-75">/ {selectedResource.category[1]}</span>
                          )}
                        </span>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">文件信息</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>文件大小：{selectedResource.file_size_formatted || '未知大小'}</div>
                    <div>修改时间：{selectedResource.last_modified_formatted || '未知'}</div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">详细描述</h3>
                  <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                    {selectedResource.description || '暂无描述'}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={handleCloseDetail}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
                >
                  关闭
                </button>
                <button
                  onClick={() => {
                    handleCloseDetail()
                    // 找到当前资源在列表中的索引作为resourceId
                    const resourceIndex = resources.findIndex(r => r.file_path === selectedResource.file_path)
                    const resourceId = allResourceIds[resourceIndex] || resourceIndex
                    handleDownload(resourceId, selectedResource)
                  }}
                  className="btn-primary px-4 py-2 text-sm font-medium"
                >
                  <Download className="w-4 h-4 mr-2" />
                  下载
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-gray-500 text-sm space-y-3">
            {/* 流量统计 */}
            {trafficStats && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">📊 站点统计</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{trafficStats.total_traffic.total_traffic_formatted}</div>
                    <div className="text-gray-500">累计出流量</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{trafficStats.total_traffic.total_downloads.toLocaleString()}</div>
                    <div className="text-gray-500">总下载次数</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">{trafficStats.total_ips}</div>
                    <div className="text-gray-500">活跃用户</div>
                  </div>
                </div>
              </div>
            )}
            
            <p>© 2025 又菜又爱玩的小朱</p>
            <div className="flex justify-center items-center space-x-4 text-xs">
              <a 
                href={adModal.langlangyun.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 transition-colors duration-200"
              >
                感谢{adModal.langlangyun.name}提供云计算和网络支持
              </a>
              <span className="text-gray-300">|</span>
              <a 
                href={adModal.sponsor.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-pink-500 hover:text-pink-700 transition-colors duration-200"
              >
                赞助支持
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App