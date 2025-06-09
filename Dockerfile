# 多阶段构建 Dockerfile
# 用于构建完整的下载站应用

# 阶段1: 构建前端
FROM node:18-alpine as frontend-builder

WORKDIR /app/frontend

# 复制前端package文件
COPY frontend/package*.json ./

# 配置npm国内源并安装前端依赖（包含构建工具）
RUN npm config set registry https://registry.npmmirror.com && \
    npm install

# 复制前端源代码
COPY frontend/ ./

# 构建前端应用
RUN npm run build

# 阶段2: 构建后端运行环境
FROM python:3.11-slim as backend

WORKDIR /app

# 配置apt国内源并安装系统依赖
RUN echo 'deb https://mirrors.tuna.tsinghua.edu.cn/debian/ bookworm main' > /etc/apt/sources.list && \
    echo 'deb https://mirrors.tuna.tsinghua.edu.cn/debian/ bookworm-updates main' >> /etc/apt/sources.list && \
    echo 'deb https://mirrors.tuna.tsinghua.edu.cn/debian-security bookworm-security main' >> /etc/apt/sources.list && \
    apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 复制后端依赖文件
COPY backend/requirements.txt ./

# 配置pip国内源并安装Python依赖
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple && \
    pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY backend/ ./

# 从前端构建阶段复制构建结果
COPY --from=frontend-builder /app/frontend/dist ./static

# 创建文件目录
RUN mkdir -p /app/files

# 设置环境变量
ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# 暴露端口
EXPOSE 5000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/resources || exit 1

# 启动应用（使用gunicorn）
CMD ["gunicorn", "--config", "gunicorn.conf.py", "app:app"]