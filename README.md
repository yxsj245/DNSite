# 资源下载站

一个基于 TypeScript + Python + Docker 的现代化资源下载站，支持赞助者验证和下载限速功能。
![image](https://github.com/user-attachments/assets/9a4f3156-21a2-41e1-9cea-8b65b308e542)

## 功能特性

### 前端功能
- 🎨 现代化响应式设计，完美适配移动端
- 🔑 赞助者密钥验证界面
- 📱 移动端友好的用户界面
- 🚀 基于 React + TypeScript + Tailwind CSS
- 📦 资源分类展示和搜索
- 💫 流畅的动画效果和用户体验

### 后端功能
- 🗃️ JSON 文件存储资源信息
- 🔐 赞助者密钥验证系统
- 🚦 IP 限速控制（非赞助者 10Mbps）
- ⚡ 赞助者无限速下载
- 📊 下载统计和监控
- 🐍 基于 Flask + Python

### 部署功能
- 🐳 完整的 Docker 容器化部署
- 🔄 Nginx 反向代理和负载均衡
- 📈 健康检查和自动重启
- 🔧 生产环境优化配置

## 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **图标**: Lucide React
- **通知**: React Hot Toast
- **HTTP客户端**: Axios

### 后端
- **框架**: Flask + Python 3.11
- **跨域**: Flask-CORS
- **HTTP客户端**: Requests
- **文件处理**: Werkzeug

### 部署
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx
- **进程管理**: Docker 健康检查

## 项目结构

```
下载站/
├── backend/                 # 后端 Python 应用
│   ├── app.py              # Flask 主应用
│   ├── resources.json      # 资源配置文件
│   ├── requirements.txt    # Python 依赖
│   └── Dockerfile         # 后端容器配置
├── frontend/               # 前端 React 应用
│   ├── src/
│   │   ├── App.tsx        # 主应用组件
│   │   ├── api.ts         # API 接口
│   │   ├── types.ts       # TypeScript 类型
│   │   ├── main.tsx       # 应用入口
│   │   └── index.css      # 全局样式
│   ├── package.json       # 前端依赖
│   ├── vite.config.ts     # Vite 配置
│   ├── tailwind.config.js # Tailwind 配置
│   └── Dockerfile         # 前端容器配置
├── nginx/                  # Nginx 配置
│   ├── nginx.conf         # 主配置
│   └── default.conf       # 站点配置
├── files/                  # 下载文件存储目录
├── docker-compose.yml      # Docker 编排配置
└── README.md              # 项目文档
```

## 快速开始

### 环境要求
- Docker 20.0+
- Docker Compose 2.0+

### 部署步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd 下载站
```

2. **准备下载文件**
```bash
# 创建文件存储目录
mkdir -p files

# 将要提供下载的文件放入 files 目录
cp your-files/* files/
```

3. **配置资源信息**
编辑 `backend/resources.json` 文件，配置可下载的资源：
```json
[
  {
    "file_path": "/app/files/your-file.zip",
    "display_name": "显示名称.zip",
    "category": "软件工具",
    "description": "文件描述信息",
    "image": "/static/images/icon.png"
  }
]
```

4. **启动服务**
```bash
# 构建并启动所有服务
docker-compose up -d --build

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

5. **访问应用**
- 前端界面: http://localhost
- 后端API: http://localhost/api
- 直接前端: http://localhost:3000
- 直接后端: http://localhost:5000

### 开发模式

**后端开发**
```bash
cd backend
pip install -r requirements.txt
python app.py
```

**前端开发**
```bash
cd frontend
npm install
npm run dev
```

## 配置说明

### 赞助者验证

系统会向 `http://82.156.35.55:5001/verify` 发送验证请求，请求头包含用户输入的密钥：

```python
headers = {
    'key': '用户输入的密钥',
    'User-Agent': 'DownloadStation/1.0.0',
    'Accept': '*/*',
    'Connection': 'keep-alive'
}
```

### 下载限速

- **非赞助者**: 限制下载速度为 10Mbps
- **赞助者**: 验证成功后无限速下载
- **IP统计**: 按IP地址进行流量统计和限速

### 资源管理

在 `backend/resources.json` 中配置可下载的资源：

```json
{
  "file_path": "/app/files/文件名.zip",     // 文件在容器内的绝对路径
  "display_name": "用户看到的文件名.zip",    // 显示给用户的文件名
  "category": "软件工具",                   // 资源分类
  "description": "详细的文件描述信息",       // 文件描述
  "image": "/static/images/icon.png"      // 图标路径（可选）
}
```

## 监控和维护

### 查看日志
```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs backend
docker-compose logs frontend
docker-compose logs nginx

# 实时查看日志
docker-compose logs -f
```

### 重启服务
```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
```

### 更新应用
```bash
# 停止服务
docker-compose down

# 重新构建并启动
docker-compose up -d --build
```

### 备份数据
```bash
# 备份资源配置
cp backend/resources.json backup/

# 备份下载文件
cp -r files/ backup/
```

## 故障排除

### 常见问题

1. **端口冲突**
   - 修改 `docker-compose.yml` 中的端口映射
   - 确保 80、3000、5000 端口未被占用

2. **文件下载失败**
   - 检查 `files/` 目录中是否存在对应文件
   - 确认 `resources.json` 中的路径配置正确
   - 查看后端日志排查错误

3. **赞助者验证失败**
   - 确认验证服务器 `http://82.156.35.55:5001/verify` 可访问
   - 检查网络连接和防火墙设置

4. **前端无法访问后端**
   - 检查 Docker 网络配置
   - 确认 Nginx 代理配置正确

### 性能优化

1. **增加并发处理能力**
   - 调整 Nginx worker 进程数
   - 增加 Flask 应用实例

2. **优化下载速度**
   - 调整 `CHUNK_SIZE` 参数
   - 优化网络和磁盘IO

3. **减少内存使用**
   - 启用 Nginx gzip 压缩
   - 优化静态资源缓存

## 安全注意事项

1. **文件安全**
   - 定期扫描上传的文件
   - 限制文件类型和大小
   - 使用安全的文件存储路径

2. **访问控制**
   - 配置防火墙规则
   - 启用 HTTPS（生产环境）
   - 定期更新依赖包

3. **监控告警**
   - 监控下载流量和频率
   - 设置异常访问告警
   - 记录详细的访问日志

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

如有问题，请通过以下方式联系：
- 提交 GitHub Issue
- 发送邮件至项目维护者

---

**注意**: 请确保遵守相关法律法规，仅分享合法的资源文件。
