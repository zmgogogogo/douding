"""珠子数据路由"""
from fastapi import APIRouter
from db.connection import get_db

router = APIRouter()


@router.get("/beads")
def get_beads():
    """获取珠子层级数据（品牌→系列→颜色）"""
    db = get_db()
    brands = db.execute("SELECT id, name, slug FROM bead_brands ORDER BY id").fetchall()
    result = []
    for b in brands:
        series = db.execute(
            "SELECT id, name FROM bead_series WHERE brand_id=? ORDER BY sort_order",
            (b['id'],)
        ).fetchall()
        series_list = []
        for s in series:
            colors = db.execute(
                "SELECT id, name, hex FROM bead_colors WHERE series_id=? ORDER BY sort_order",
                (s['id'],)
            ).fetchall()
            series_list.append({
                'id': s['id'],
                'name': s['name'],
                'colors': [{'id': c['id'], 'name': c['name'], 'hex': c['hex']} for c in colors]
            })
        result.append({
            'id': b['id'],
            'name': b['name'],
            'slug': b['slug'],
            'series': series_list
        })
    db.close()
    return {'code': 200, 'data': result}


@router.get("/beads/colors")
def get_bead_colors_flat():
    """获取珠子扁平列表（编辑器调色板用）"""
    db = get_db()
    rows = db.execute("""
        SELECT c.id, c.name, c.hex, s.name as series, b.name as brand
        FROM bead_colors c
        JOIN bead_series s ON c.series_id = s.id
        JOIN bead_brands b ON s.brand_id = b.id
        ORDER BY c.id
    """).fetchall()
    db.close()
    return {'code': 200, 'data': [
        {'id': r['id'], 'name': r['name'], 'hex': r['hex'], 'series': r['series'], 'brand': r['brand']}
        for r in rows
    ]}
