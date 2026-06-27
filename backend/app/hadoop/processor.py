from __future__ import annotations

from io import BytesIO

import pandas as pd
from loguru import logger

from app.hadoop.hdfs_service import HDFSService, HDFSError


class HadoopProcessor:
    """Batch data processing pipeline — read from HDFS, cleanse, aggregate."""

    def __init__(self):
        self.hdfs = HDFSService()

    def process_hdfs_file(self, hdfs_path: str) -> dict:
        if not self.hdfs.is_connected():
            raise HDFSError("Hadoop cluster unavailable")

        raw = self.hdfs.read_file(hdfs_path)
        if hdfs_path.endswith(".json"):
            frame = pd.read_json(BytesIO(raw))
        elif hdfs_path.endswith(".xlsx"):
            frame = pd.read_excel(BytesIO(raw))
        else:
            frame = pd.read_csv(BytesIO(raw))

        before = len(frame)
        frame = frame.drop_duplicates().ffill().fillna(0)

        stats = {
            "rows_before": before,
            "rows_after": len(frame),
            "columns": list(frame.columns),
            "numeric_summary": {},
        }

        for col in frame.select_dtypes(include="number").columns[:8]:
            stats["numeric_summary"][col] = {
                "mean": round(float(frame[col].mean()), 4),
                "min": round(float(frame[col].min()), 4),
                "max": round(float(frame[col].max()), 4),
            }

        logger.info("Hadoop batch processed {} rows from {}", len(frame), hdfs_path)
        return stats

    def export_dataframe_to_hdfs(self, filename: str, frame: pd.DataFrame) -> str:
        content = frame.to_csv(index=False).encode("utf-8")
        return self.hdfs.upload_file(filename, content)


hadoop_processor = HadoopProcessor()
