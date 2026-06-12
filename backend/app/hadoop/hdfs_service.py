from io import BytesIO

from hdfs import InsecureClient

from app.config.settings import settings


class HDFSService:
    def __init__(self):
        self.client = InsecureClient(f"http://{settings.hdfs_host}:{settings.hdfs_port}", user=settings.hdfs_user)

    async def upload_file(self, filename: str, content: bytes) -> str:
        path = f"{settings.hdfs_base_path}/{filename}"
        self.client.write(path, data=BytesIO(content), overwrite=True)
        return path

    async def read_file(self, path: str) -> bytes:
        with self.client.read(path) as reader:
            return reader.read()

    async def delete_file(self, path: str) -> bool:
        return self.client.delete(path)

    async def list_files(self, path: str | None = None):
        return self.client.list(path or settings.hdfs_base_path)
