// 下载站配置文件
// 此文件包含可调整的系统参数，方便后续修改

export const downloadConfig = {
  // 下载等待时间（秒）
  // 非赞助者用户点击下载后需要等待的时间
  waitTime: 5,
  
  // 非赞助者用户下载次数限制
  // 每小时最多下载次数
  maxDownloadsPerHour: 5,
  
  // 非赞助者用户下载速度限制
  // 显示给用户的速度限制信息
  nonSponsorSpeedLimit: '10Mbps',
  
  // 赞助者下载速度
  // 显示给赞助者的速度信息
  sponsorSpeed: '无限速',
  
  // 广告弹窗配置
  adModal: {
    // 浪浪云相关信息
    langlangyun: {
      name: '浪浪云',
      slogan: '算力如浪，奔涌不息；稳定如山，始终如一！',
      website: 'https://langlangy.cn/',
      description: '感谢浪浪云提供网络和云计算支持'
    },
    
    // 赞助相关信息
    sponsor: {
      url: 'https://afdian.com/a/xiaozhuhouses',
      description: '您的赞助将帮助我们提供更好的服务'
    }
  }
}

// 导出单个配置项，方便直接使用
export const {
  waitTime,
  maxDownloadsPerHour,
  nonSponsorSpeedLimit,
  sponsorSpeed,
  adModal
} = downloadConfig