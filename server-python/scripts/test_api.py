import requests, json, random, string

BASE = 'http://localhost:3456/api'

def req(method, path, data=None, token=None):
    headers = {}
    if token: headers['Authorization'] = f'Bearer {token}'
    url = f'{BASE}{path}'
    if method == 'GET':
        r = requests.get(url, headers=headers, timeout=10)
    elif method == 'POST':
        r = requests.post(url, json=data, headers=headers, timeout=10)
    elif method == 'PUT':
        r = requests.put(url, json=data, headers=headers, timeout=10)
    elif method == 'DELETE':
        r = requests.delete(url, headers=headers, timeout=10)
    return r.json()

def ok(result): return result.get('code') == 200

print("=" * 50)
print("1. 认证测试")
print("=" * 50)

# 登录
s = ''.join(random.choices(string.ascii_lowercase, k=6))
result = req('POST', '/auth/login', {'username': 'test', 'password': 'test123'})
token = result.get('data', {}).get('token') if ok(result) else None
print(f"  {'通过' if token else '失败'} 登录: {result.get('message','')}")

if not token:
    # 尝试注册
    result = req('POST', '/auth/register', {'username': f'test_{s}', 'password': 'test123', 'nickname': f'测试{s}'})
    token = result.get('data', {}).get('token') if ok(result) else None
    print(f"  {'通过' if token else '失败'} 注册: {result.get('message','')}")

if not token:
    print("  ❌ 无法获取token，跳过后续认证测试")
else:
    # 获取当前用户
    result = req('GET', '/auth/me', token=token)
    user = result.get('data', {})
    print(f"  {'通过' if ok(result) else '失败'} 当前用户: {user.get('username','?')}")

    # 更新资料
    result = req('PUT', '/auth/profile', {'nickname': '测试昵称', 'bio': '测试简介'}, token=token)
    print(f"  {'通过' if ok(result) else '失败'} 更新资料")

    print("\n" + "=" * 50)
    print("2. 设计CRUD测试")
    print("=" * 50)

    # 创建设计
    result = req('POST', '/designs', {
        'title': f'测试设计_{s}', 'description': '自动化测试',
        'gridWidth': 58, 'gridHeight': 58,
        'gridData': [[{'id': 1, 'name': 'White', 'hex': '#FFFFFF', 'brand': 'Hama'}] * 58] * 58,
        'brand': 'Hama', 'isPublic': False
    }, token=token)
    design_id = result.get('data', {}).get('id') if ok(result) else None
    print(f"  {'通过' if design_id else '失败'} 创建设计: id={design_id}")

    if design_id:
        # 获取设计
        result = req('GET', f'/designs/{design_id}', token=token)
        print(f"  {'通过' if ok(result) else '失败'} 获取设计: {result.get('data',{}).get('title','?')}")

        # 更新设计
        result = req('PUT', f'/designs/{design_id}', {
            'title': '更新后的标题', 'description': '更新后的描述', 'isPublic': True
        }, token=token)
        print(f"  {'通过' if ok(result) else '失败'} 更新设计")

        # 点赞
        result = req('POST', f'/designs/{design_id}/like', token=token)
        print(f"  {'通过' if ok(result) else '失败'} 点赞")

        # 我的设计列表
        result = req('GET', '/designs', token=token)
        designs = result.get('data', {}).get('list', [])
        total = result.get('data', {}).get('total', 0)
        print(f"  {'通过' if ok(result) else '失败'} 我的设计: {len(designs)}个 (共{total})")

        # 删除设计
        result = req('DELETE', f'/designs/{design_id}', token=token)
        print(f"  {'通过' if ok(result) else '失败'} 删除设计")

print("\n" + "=" * 50)
print("3. 公开接口测试")
print("=" * 50)

# 探索广场
result = req('GET', '/explore?sort=latest')
items = result.get('data', {}).get('list', [])
total = result.get('data', {}).get('total', 0)
print(f"  {'通过' if ok(result) else '失败'} 探索广场: {len(items)}项 (共{total})")

# 搜索
result = req('GET', '/search?q=测试')
print(f"  {'通过' if ok(result) else '失败'} 搜索")

# 珠子数据
result = req('GET', '/beads')
print(f"  {'通过' if ok(result) else '失败'} 珠子数据")

result = req('GET', '/beads/colors')
colors = result.get('data', [])
print(f"  {'通过' if ok(result) else '失败'} 珠子颜色: {len(colors) if isinstance(colors,list) else '?'}种")

# 公开接口（无需认证）
result = req('GET', '/public/app/version')
print(f"  {'通过' if ok(result) else '失败'} 版本信息: {result.get('data',{}).get('latestVersion','?')}")

print("\n完成！请分析哪些端点失败。")
