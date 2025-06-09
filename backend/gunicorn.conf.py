# Gunicorn配置文件

# 绑定地址和端口
bind = "0.0.0.0:5000"

# 工作进程数
workers = 1

# 工作进程类型
worker_class = "sync"

# 每个工作进程的线程数
threads = 2

# 工作进程连接数
worker_connections = 1000

# 超时设置
timeout = 30
keepalive = 2

# 最大请求数（防止内存泄漏）
max_requests = 1000
max_requests_jitter = 50

# 预加载应用
preload_app = True

# 日志配置
loglevel = "info"
accesslog = "-"
errorlog = "-"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# 进程名称
proc_name = "download-station"

# 用户和组（在容器中通常不需要）
# user = "www-data"
# group = "www-data"

# 临时目录
tmp_upload_dir = None

# 安全设置
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190