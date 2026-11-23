-- Applied on every start; every statement is idempotent.

CREATE TABLE IF NOT EXISTS reports (
  id          INTEGER PRIMARY KEY,
  code        TEXT    NOT NULL UNIQUE,
  category    TEXT    NOT NULL CHECK (category IN ('toponym', 'road', 'building', 'boundary', 'other')),
  description TEXT    NOT NULL,
  lon         REAL    NOT NULL CHECK (lon BETWEEN -180 AND 180),
  lat         REAL    NOT NULL CHECK (lat BETWEEN -90 AND 90),
  status      TEXT    NOT NULL CHECK (status IN ('open', 'in_review', 'resolved', 'dismissed')),
  public_note TEXT,
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL,
  version     INTEGER NOT NULL CHECK (version >= 1)
) STRICT;

CREATE INDEX IF NOT EXISTS reports_by_status ON reports (status, created_at);

-- Spatial index of report locations (a point is a box with min = max). R*Tree stores
-- 32-bit floats rounded outwards, so queries refine with the exact lon/lat columns.
CREATE VIRTUAL TABLE IF NOT EXISTS report_locations USING rtree (
  id, min_lon, max_lon, min_lat, max_lat
);
