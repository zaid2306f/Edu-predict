from datetime import datetime
from io import BytesIO

import pandas as pd

from app.database.mongo import get_db
from app.hadoop.hdfs_service import HDFSService


class DatasetService:
    def __init__(self):
        self.hdfs = HDFSService()

    async def process_and_store(self, filename: str, content: bytes, content_type: str):
        if filename.endswith(".csv"):
            frame = pd.read_csv(BytesIO(content))
        elif filename.endswith(".xlsx"):
            frame = pd.read_excel(BytesIO(content))
        elif filename.endswith(".json"):
            frame = pd.read_json(BytesIO(content))
        else:
            raise ValueError("Unsupported file type")

        before = len(frame)
        frame = frame.drop_duplicates().ffill().fillna(0)
        cleaned = frame.to_csv(index=False).encode("utf-8")
        hdfs_path = await self.hdfs.upload_file(filename, cleaned)

        metadata = {
            "filename": filename,
            "content_type": content_type,
            "rows_before": before,
            "rows_after": len(frame),
            "columns": list(frame.columns),
            "hdfs_path": hdfs_path,
            "created_at": datetime.utcnow(),
        }
        result = await get_db().datasets.insert_one(metadata)
        metadata["_id"] = str(result.inserted_id)
        return metadata
