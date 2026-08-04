"""从 SQLite 导出数据到 H2 兼容的 SQL INSERT 语句"""
import sqlite3, os

db_path = os.path.expanduser('~/first-cc/douding.db')
out_path = os.path.expanduser('~/first-cc/server-java/src/main/resources/db/migration-h2/V13__seed_data.sql')

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row

tables_ordered = [
    'bead_brands', 'bead_series', 'bead_colors', 'bead_barcodes',
    'users', 'folders', 'designs',
    'design_likes', 'design_favorites', 'design_comments', 'comment_likes',
    'user_follow', 'user_bead_inventory', 'inventory_logs',
    'design_bead_usage', 'download_logs',
    'make_sessions', 'make_records',
    'user_make_settings', 'user_stock_settings',
    'purchase_lists', 'purchase_items', 'replenish_alerts',
    'package_specs', 'warehouse_info', 'user_custom_colors',
    'wishlist_items', 'cross_brand_mappings',
    'sys_admins', 'sys_roles', 'sys_config', 'banners',
]

with open(out_path, 'w', encoding='utf-8') as f:
    f.write('-- V13: 从 SQLite 导入的种子数据\n\n')
    total = 0

    for table in tables_ordered:
        try:
            cursor = conn.execute(f'SELECT * FROM {table} ORDER BY 1')
            rows = cursor.fetchall()
            if not rows:
                continue

            columns = [desc[0] for desc in cursor.description]
            col_list = ', '.join(columns)
            f.write(f'-- {table}: {len(rows)} rows\n')

            for row in rows:
                values = []
                for val in row:
                    if val is None:
                        values.append('NULL')
                    elif isinstance(val, int):
                        values.append(str(val))
                    elif isinstance(val, float):
                        values.append(str(val))
                    elif isinstance(val, bytes):
                        values.append('NULL')
                    else:
                        s = str(val).replace("'", "''")
                        values.append(f"'{s}'")

                f.write(f'INSERT INTO {table}({col_list}) VALUES({", ".join(values)});\n')

            f.write('\n')
            total += len(rows)
        except Exception as e:
            f.write(f'-- SKIP {table}: {e}\n\n')

conn.close()
print(f'导出完成: {total} 条记录 → {out_path}')
