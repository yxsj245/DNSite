from flask import Flask, jsonify, request, send_from_directory, Response
from flask_cors import CORS
import json
import os
import time
import requests
from collections import defaultdict
from threading import Lock
import threading
from werkzeug.utils import secure_filename
from urllib.parse import quote

app = Flask(__name__)
CORS(app)

# 全局变量
ip_download_stats = defaultdict(lambda: {'last_reset': time.time(), 'bytes_downloaded': 0})
ip_download_count = defaultdict(lambda: {'last_reset': time.time(), 'download_count': 0})
# 从文件加载统计数据，如果文件不存在则使用默认值
total_traffic_stats = None  # 将在应用启动时初始化
stats_lock = Lock()

# 配置
MAX_SPEED_MBPS = 10  # 非赞助者最大下载速度 10Mbps
MAX_DOWNLOADS_PER_HOUR = 5  # 非赞助者每小时最大下载次数
CHUNK_SIZE = 8192  # 8KB chunks
VERIFY_URL = "http://82.156.35.55:5001/verify"

def format_file_size(size_bytes):
    """格式化文件大小显示"""
    if size_bytes == 0:
        return "0 B"
    
    size_names = ["B", "KB", "MB", "GB", "TB"]
    import math
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return f"{s} {size_names[i]}"

def load_resources():
    """加载资源配置文件"""
    # 确保/data目录存在
    os.makedirs('/data', exist_ok=True)
    
    try:
        with open('/data/resources.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def save_resources(resources):
    """保存资源配置文件"""
    # 确保/data目录存在
    os.makedirs('/data', exist_ok=True)
    with open('/data/resources.json', 'w', encoding='utf-8') as f:
        json.dump(resources, f, ensure_ascii=False, indent=2)

def load_traffic_stats():
    """加载流量统计数据"""
    # 确保/data目录存在
    os.makedirs('/data', exist_ok=True)
    
    try:
        with open('/data/traffic_stats.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data
    except FileNotFoundError:
        return {'total_bytes': 0, 'total_downloads': 0}
    except json.JSONDecodeError:
        return {'total_bytes': 0, 'total_downloads': 0}

def save_traffic_stats(stats):
    """保存流量统计数据"""
    try:
        # 确保/data目录存在
        os.makedirs('/data', exist_ok=True)
        with open('/data/traffic_stats.json', 'w', encoding='utf-8') as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"保存统计数据失败: {e}")

def load_partner_sites():
    """加载合作站点配置文件"""
    # 确保/data目录存在
    os.makedirs('/data', exist_ok=True)
    
    try:
        with open('/data/partner_sites.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def verify_sponsor_key(key, client_ip):
    """验证赞助者密钥"""
    try:
        headers = {
            'key': key,
            'User-Agent': 'DownloadStation/1.0.0',
            'Accept': '*/*',
            'Connection': 'keep-alive',
            'X-Client-IP': client_ip  # 添加用户IP到请求头
        }
        response = requests.get(VERIFY_URL, headers=headers, timeout=5)
        #print(f"远程验证响应状态码: {response.status_code}")
        #print(f"远程验证响应内容: {response.text}")
        #print(f"验证请求包含用户IP: {client_ip}")
        # 只要状态码是200就认为验证成功，不再检查响应内容
        return response.status_code == 200
    except:
        return False

def check_and_increment_download_limit(client_ip, is_sponsor):
    """检查下载次数限制并增加计数"""
    if is_sponsor:
        return True  # 赞助者无限制
    
    with stats_lock:
        current_time = time.time()
        count_stats = ip_download_count[client_ip]
        
        # 每小时重置统计
        if current_time - count_stats['last_reset'] >= 3600.0:  # 3600秒 = 1小时
            count_stats['download_count'] = 0
            count_stats['last_reset'] = current_time
        
        # 检查是否超过限制
        if count_stats['download_count'] >= MAX_DOWNLOADS_PER_HOUR:
            return False
        
        # 增加下载次数
        count_stats['download_count'] += 1
        total_traffic_stats['total_downloads'] += 1
        # 保存统计数据到文件
        save_traffic_stats(total_traffic_stats)
        return True

def calculate_speed_limit(client_ip, is_sponsor):
    """计算下载速度限制"""
    if is_sponsor:
        return None  # 无限制
    
    with stats_lock:
        current_time = time.time()
        stats = ip_download_stats[client_ip]
        
        # 每秒重置统计
        if current_time - stats['last_reset'] >= 1.0:
            stats['bytes_downloaded'] = 0
            stats['last_reset'] = current_time
        
        # 计算当前速度 (bytes/second)
        max_bytes_per_second = (MAX_SPEED_MBPS * 1000 * 1000) // 8  # Mbps to bytes/second
        return max_bytes_per_second

def controlled_file_stream(file_path, client_ip, is_sponsor):
    """控制下载速度的文件流"""
    def generate():
        with open(file_path, 'rb') as f:
            while True:
                chunk = f.read(CHUNK_SIZE)
                if not chunk:
                    break
                
                # 更新流量统计（所有用户都统计）
                with stats_lock:
                    total_traffic_stats['total_bytes'] += len(chunk)
                    # 每传输1MB数据保存一次统计（避免频繁写文件）
                    if total_traffic_stats['total_bytes'] % (1024 * 1024) == 0:
                        save_traffic_stats(total_traffic_stats)
                
                if not is_sponsor:
                    # 计算延迟以控制速度
                    max_bytes_per_second = calculate_speed_limit(client_ip, is_sponsor)
                    if max_bytes_per_second:
                        delay = len(chunk) / max_bytes_per_second
                        time.sleep(delay)
                    
                    # 更新IP下载统计（仅非赞助者）
                    with stats_lock:
                        ip_download_stats[client_ip]['bytes_downloaded'] += len(chunk)
                
                yield chunk
    
    return generate()

@app.route('/api/resources', methods=['GET'])
def get_resources():
    """获取资源列表，支持分页和搜索"""
    resources = load_resources()
    
    # 获取查询参数
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '', type=str)
    category = request.args.get('category', '', type=str)
    
    # 为每个资源添加文件信息
    for resource in resources:
        file_path = resource['file_path']
        if os.path.exists(file_path):
            file_size = os.path.getsize(file_path)
            resource['file_size'] = file_size
            resource['file_size_formatted'] = format_file_size(file_size)
            
            # 添加最后修改时间
            import datetime
            mtime = os.path.getmtime(file_path)
            resource['last_modified'] = datetime.datetime.fromtimestamp(mtime).isoformat()
            resource['last_modified_formatted'] = datetime.datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M')
        else:
            resource['file_size'] = 0
            resource['file_size_formatted'] = '文件不存在'
            resource['last_modified'] = None
            resource['last_modified_formatted'] = '未知'
    
    # 过滤资源
    filtered_resources = resources
    
    # 按分类过滤
    if category and category != '全部':
        filtered_resources = [r for r in filtered_resources if category in r['category']]
    
    # 按搜索关键词过滤
    if search:
        search_lower = search.lower()
        filtered_resources = [
            r for r in filtered_resources 
            if search_lower in r['display_name'].lower() or 
               search_lower in r['description'].lower() or 
               any(search_lower in cat.lower() for cat in r['category'])
        ]
    
    # 计算分页
    total = len(filtered_resources)
    start = (page - 1) * per_page
    end = start + per_page
    paginated_resources = filtered_resources[start:end]
    
    return jsonify({
        'resources': paginated_resources,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'pages': (total + per_page - 1) // per_page
        },
        'categories': list(set([cat for r in resources for cat in r['category']]))
    })

@app.route('/api/download/<int:resource_id>', methods=['GET'])
def download_resource(resource_id):
    """下载资源文件"""
    resources = load_resources()
    
    if resource_id >= len(resources) or resource_id < 0:
        return jsonify({'error': '资源不存在'}), 404
    
    resource = resources[resource_id]
    file_path = resource['file_path']
    
    if not os.path.exists(file_path):
        return jsonify({'error': '文件不存在'}), 404
    
    # 获取客户端IP
    client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
    
    # 检查赞助者密钥
    sponsor_key = request.headers.get('X-Sponsor-Key') or request.args.get('key')
    is_sponsor = False
    
    if sponsor_key:
        is_sponsor = verify_sponsor_key(sponsor_key, client_ip)
    
    # 检查下载次数限制
    if not check_and_increment_download_limit(client_ip, is_sponsor):
        with stats_lock:
            count_stats = ip_download_count[client_ip]
            remaining_time = 3600 - (time.time() - count_stats['last_reset'])
            remaining_minutes = int(remaining_time // 60)
        return jsonify({
            'error': f'下载次数已达上限，非赞助用户每小时最多下载{MAX_DOWNLOADS_PER_HOUR}次',
            'remaining_time': f'{remaining_minutes}分钟后重置'
        }), 429
    
    # 获取文件信息
    file_size = os.path.getsize(file_path)
    filename = resource['display_name']
    
    # 创建响应
    response = Response(
        controlled_file_stream(file_path, client_ip, is_sponsor),
        mimetype='application/octet-stream'
    )
    
    # 对中文文件名进行URL编码以避免编码错误
    encoded_filename = quote(filename.encode('utf-8'))
    response.headers['Content-Disposition'] = f'attachment; filename*=UTF-8\'\'{encoded_filename}'
    response.headers['Content-Length'] = str(file_size)
    response.headers['X-Download-Speed'] = 'unlimited' if is_sponsor else f'{MAX_SPEED_MBPS}Mbps'
    
    return response

@app.route('/api/verify-key', methods=['POST'])
def verify_key():
    """验证赞助者密钥接口"""
    data = request.get_json()
    key = data.get('key')
    
    if not key:
        return jsonify({'valid': False, 'message': '密钥不能为空'})
    
    # 获取客户端IP
    client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
    
    is_valid = verify_sponsor_key(key, client_ip)
    
    return jsonify({
        'valid': is_valid,
        'message': '验证成功，享受无限速下载！' if is_valid else '验证失败，将按照普通用户速度下载'
    })

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """获取下载统计信息"""
    with stats_lock:
        stats = dict(ip_download_stats)
        count_stats = dict(ip_download_count)
        total_stats = dict(total_traffic_stats)
    
    return jsonify({
        'active_downloads': len(stats),
        'total_ips': len(stats),
        'download_counts': len(count_stats),
        'total_traffic': {
            'total_bytes': total_stats['total_bytes'],
            'total_downloads': total_stats['total_downloads'],
            'total_traffic_formatted': format_file_size(total_stats['total_bytes'])
        }
    })

@app.route('/api/partner-sites', methods=['GET'])
def get_partner_sites():
    """获取合作站点列表"""
    partner_sites = load_partner_sites()
    return jsonify(partner_sites)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_static(path):
    """提供静态文件服务"""
    # 检查是否是API请求，如果是则返回404
    if path.startswith('api/'):
        return jsonify({'error': 'API endpoint not found'}), 404
    
    static_dir = '/app/static'
    if path != "" and os.path.exists(os.path.join(static_dir, path)):
        return send_from_directory(static_dir, path)
    else:
        return send_from_directory(static_dir, 'index.html')

# 初始化资源文件（在应用启动时执行）
if not os.path.exists('/data/resources.json'):
    sample_resources = [
        {
            "file_path": "/app/files/sample.zip",
            "display_name": "示例文件.zip",
            "category": "示例",
            "description": "这是一个示例下载文件",
            "image": "/static/images/sample.png"
        }
    ]
    save_resources(sample_resources)

# 初始化统计数据（在应用启动时执行）
total_traffic_stats = load_traffic_stats()
print(f"加载统计数据: 总流量 {format_file_size(total_traffic_stats['total_bytes'])}, 总下载次数 {total_traffic_stats['total_downloads']}")

# 注意：不使用atexit保存统计数据，因为会覆盖运行期间的实时数据
# 统计数据通过以下方式实时保存：
# 1. 每次下载完成时保存下载次数
# 2. 每传输1MB数据时保存流量统计
# 3. 这样确保数据的实时性和一致性

if __name__ == '__main__':
    # 开发环境下使用Flask开发服务器
    app.run(host='0.0.0.0', port=5000, debug=True)