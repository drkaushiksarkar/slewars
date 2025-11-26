"""Test database connection"""
import psycopg2
from psycopg2.extras import RealDictCursor
import config

# Connect using configuration from .env
conn = psycopg2.connect(
    host=config.POSTGRES_HOST,
    port=config.POSTGRES_PORT,
    database=config.POSTGRES_DB,
    user=config.POSTGRES_USER,
    password=config.POSTGRES_PASSWORD
)

cursor = conn.cursor(cursor_factory=RealDictCursor)

query = """
    SELECT
        DATE_TRUNC('week', p.startdate) as week,
        p.startdate,
        p.enddate,
        SUM(CAST(dv.value AS INTEGER)) as cases,
        COUNT(DISTINCT dv.sourceid) as facilities_reporting
    FROM datavalue dv
    JOIN dataelement de ON dv.dataelementid = de.dataelementid
    JOIN period p ON dv.periodid = p.periodid
    JOIN organisationunit ou ON dv.sourceid = ou.organisationunitid
    WHERE dv.deleted = false
        AND de.uid = %s
        AND dv.value ~ '^[0-9]+$'
        AND EXISTS (
            SELECT 1 FROM organisationunit parent
            WHERE parent.uid = %s
            AND ou.path LIKE parent.path || '%'
        )
        AND p.startdate >= %s::date
        AND p.enddate <= %s::date
    GROUP BY week, p.startdate, p.enddate
    ORDER BY week
"""

params = ('wZwzzRnr9N4', 'O6uvpzGd5pu', '2023-11-17', '2025-11-16')

print(f"Executing query with params: {params}")
cursor.execute(query, params)
results = cursor.fetchall()

print(f"Got {len(results)} results")
if results:
    print(f"First result: {results[0]}")

cursor.close()
conn.close()
