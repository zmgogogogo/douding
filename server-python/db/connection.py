"""
数据库连接 — MySQL（直连 Java 后端同库，读取珠子色板数据）

之前使用独立 SQLite，与 MySQL 是两套数据，容易出现「调色板为空」。
现改为 PyMySQL 直连 MySQL，读取 Java 后端（Flyway 迁移）维护的
bead_brands / bead_series / bead_colors 表，保证色板数据始终一致。
"""
import os

import pymysql
from pymysql.cursors import DictCursor


# MySQL 连接配置（与 Java application-prod.yml 的 DB_* 保持一致）
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USERNAME", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "douding")


def _connect() -> pymysql.Connection:
    """创建 MySQL 连接"""
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=True,
    )


class DbWrapper:
    """
    MySQL 连接包装器，暴露与 sqlite3.Connection 兼容的 execute 接口。

    兼容旧代码的调用方式：
        db.execute(sql, params).fetchall()   # 返回 dict 列表，可按列名访问 r['hex']
        db.execute(sql).fetchone()
        db.close()
    """

    def __init__(self):
        self._conn = _connect()
        self._cursor = self._conn.cursor()

    def execute(self, sql, params=()):
        """执行 SQL，返回游标（可继续 .fetchall() / .fetchone()）"""
        self._cursor.execute(sql, params)
        return self._cursor

    def close(self):
        """关闭底层 MySQL 连接"""
        self._conn.close()


def get_db() -> DbWrapper:
    """获取数据库连接（直连 MySQL）"""
    return DbWrapper()


def init_db():
    """验证 MySQL 连接与珠子色板数据可用。

    表结构由 Java 后端 Flyway 迁移维护，这里只做连接自检。
    """
    db = get_db()
    try:
        count = db.execute("SELECT COUNT(*) AS n FROM bead_brands").fetchone()['n']
        print(f"[db] MySQL 连接正常，bead_brands={count} 个品牌")
        if count == 0:
            print("⚠️  [db] bead_brands 为空，请确认 Java 后端已完成种子数据迁移")
    finally:
        db.close()
