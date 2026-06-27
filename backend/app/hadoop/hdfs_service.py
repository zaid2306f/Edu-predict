from __future__ import annotations

import subprocess
from io import BytesIO
from typing import Any
from urllib.parse import urlparse, urlunparse

import httpx
import requests
from hdfs import InsecureClient
from loguru import logger

from app.config.settings import settings


class HDFSError(Exception):
    pass


def _rewrite_datanode_redirect(response: requests.Response, *args, **kwargs) -> requests.Response:
    """WebHDFS redirects to internal Docker hostnames — rewrite to localhost for host-side clients."""
    location = response.headers.get("Location", "")
    if location and (":9864" in location or ":9866" in location):
        parsed = urlparse(location)
        port = parsed.port or (9864 if ":9864" in location else 9866)
        response.headers["Location"] = urlunparse(parsed._replace(netloc=f"localhost:{port}"))
    return response


def _build_hdfs_client() -> InsecureClient:
    session = requests.Session()
    session.hooks["response"].append(_rewrite_datanode_redirect)
    return InsecureClient(f"http://{settings.hdfs_host}:{settings.hdfs_port}", user=settings.hdfs_user, session=session)


class HDFSService:
    def __init__(self):
        self.web_url = f"http://{settings.hdfs_host}:{settings.hdfs_port}"
        self.client = _build_hdfs_client()

    def is_connected(self) -> bool:
        try:
            self.client.status("/")
            return True
        except Exception as exc:
            logger.warning("HDFS not connected: {}", exc)
            return False

    def ensure_base_path(self) -> None:
        try:
            self.client.makedirs(settings.hdfs_base_path)
        except Exception as exc:
            logger.debug("mkdir {}: {}", settings.hdfs_base_path, exc)

    def _upload_via_docker(self, filename: str, content: bytes) -> str:
        """Fallback: pipe file into namenode container when WebHDFS redirect fails."""
        path = f"{settings.hdfs_base_path}/{filename}"
        proc = subprocess.run(
            ["docker", "exec", "-i", "edupredict-namenode", "hdfs", "dfs", "-put", "-f", "-", path],
            input=content,
            capture_output=True,
            timeout=120,
        )
        if proc.returncode != 0:
            raise HDFSError(proc.stderr.decode() or "docker hdfs put failed")
        return path

    def upload_file(self, filename: str, content: bytes) -> str:
        if not self.is_connected():
            raise HDFSError("Hadoop HDFS cluster is not available. Start: docker compose up -d namenode datanode")
        self.ensure_base_path()
        path = f"{settings.hdfs_base_path}/{filename}"
        try:
            self.client.write(path, data=BytesIO(content), overwrite=True)
        except Exception as exc:
            logger.warning("WebHDFS upload failed ({}), trying docker exec fallback", exc)
            path = self._upload_via_docker(filename, content)
        logger.info("Uploaded {} to HDFS ({})", filename, path)
        return path

    def read_file(self, path: str) -> bytes:
        try:
            with self.client.read(path) as reader:
                return reader.read()
        except Exception:
            proc = subprocess.run(
                ["docker", "exec", "edupredict-namenode", "hdfs", "dfs", "-cat", path],
                capture_output=True,
                timeout=120,
            )
            if proc.returncode != 0:
                raise HDFSError(proc.stderr.decode() or "read failed") from None
            return proc.stdout

    def delete_file(self, path: str) -> bool:
        try:
            return self.client.delete(path, recursive=False)
        except Exception:
            proc = subprocess.run(
                ["docker", "exec", "edupredict-namenode", "hdfs", "dfs", "-rm", path],
                capture_output=True,
                timeout=60,
            )
            return proc.returncode == 0

    def list_files(self, path: str | None = None) -> list[str]:
        target = path or settings.hdfs_base_path
        self.ensure_base_path()
        try:
            return self.client.list(target)
        except Exception:
            proc = subprocess.run(
                ["docker", "exec", "edupredict-namenode", "hdfs", "dfs", "-ls", target],
                capture_output=True,
                text=True,
                timeout=60,
            )
            if proc.returncode != 0:
                return []
            names = []
            for line in proc.stdout.strip().splitlines():
                parts = line.split()
                if len(parts) >= 8 and not parts[-1].endswith("/."):
                    names.append(parts[-1].split("/")[-1])
            return names

    def list_files_detailed(self) -> list[dict[str, Any]]:
        self.ensure_base_path()
        files: list[dict[str, Any]] = []
        try:
            names = self.client.list(settings.hdfs_base_path)
        except Exception:
            names = self.list_files()

        for name in names:
            path = f"{settings.hdfs_base_path}/{name}"
            size = 0
            try:
                status = self.client.status(path)
                size = int(status.get("length", 0))
            except Exception:
                pass
            files.append(
                {
                    "name": name,
                    "path": path,
                    "size_bytes": size,
                    "size": _format_bytes(size),
                    "type": "FILE",
                }
            )
        return files

    def get_cluster_metrics(self) -> dict[str, Any]:
        if not self.is_connected():
            return {"connected": False, "cluster_status": "unavailable", "error": "HDFS not reachable"}

        metrics: dict[str, Any] = {
            "connected": True,
            "namenode_url": self.web_url,
            "namenode_ui": f"{self.web_url}/dfshealth.html#tab-overview",
            "base_path": settings.hdfs_base_path,
        }
        try:
            response = httpx.get(
                f"{self.web_url}/jmx",
                params={"qry": "Hadoop:service=NameNode,name=NameNodeInfo"},
                timeout=8,
            )
            beans = response.json().get("beans", [])
            info = beans[0] if beans else {}
            total = float(info.get("Total", 0))
            used = float(info.get("Used", 0))
            metrics.update(
                {
                    "total_bytes": total,
                    "used_bytes": used,
                    "free_bytes": float(info.get("Free", 0)),
                    "total_human": _format_bytes(total),
                    "used_human": _format_bytes(used),
                    "usage_percent": round(used / total * 100, 2) if total else 0,
                    "live_datanodes": int(info.get("NumLiveDataNodes", 0)),
                    "dead_datanodes": int(info.get("NumDeadDataNodes", 0)),
                    "cluster_status": "healthy" if int(info.get("NumLiveDataNodes", 0)) > 0 else "degraded",
                }
            )
        except Exception as exc:
            metrics["jmx_error"] = str(exc)
            metrics["cluster_status"] = "degraded"

        files = self.list_files_detailed()
        metrics["file_count"] = len(files)
        metrics["files"] = files
        metrics["data_processed_bytes"] = sum(int(f.get("size_bytes", 0)) for f in files)
        metrics["data_processed"] = _format_bytes(metrics["data_processed_bytes"])
        return metrics


def _format_bytes(num: float) -> str:
    if num <= 0:
        return "0 B"
    units = ["B", "KB", "MB", "GB", "TB"]
    idx = 0
    value = float(num)
    while value >= 1024 and idx < len(units) - 1:
        value /= 1024
        idx += 1
    return f"{value:.2f} {units[idx]}"


hdfs_service = HDFSService()
