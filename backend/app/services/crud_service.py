from bson import ObjectId

from app.database.mongo import get_db


class CRUDService:
    def __init__(self, collection_name: str):
        self.collection_name = collection_name

    @property
    def collection(self):
        return get_db()[self.collection_name]

    async def list(self, query: dict | None = None):
        rows = []
        async for doc in self.collection.find(query or {}):
            doc['_id'] = str(doc['_id'])
            rows.append(doc)
        return rows

    async def get(self, item_id: str):
        try:
            key = ObjectId(item_id)
        except Exception:
            key = item_id
        doc = await self.collection.find_one({'_id': key})
        if doc:
            doc['_id'] = str(doc['_id'])
        return doc

    async def create(self, data: dict):
        result = await self.collection.insert_one(data)
        return await self.get(str(result.inserted_id))

    async def update(self, item_id: str, data: dict):
        try:
            key = ObjectId(item_id)
        except Exception:
            key = item_id
        await self.collection.update_one({'_id': key}, {'$set': data})
        return await self.get(item_id)

    async def delete(self, item_id: str):
        try:
            key = ObjectId(item_id)
        except Exception:
            key = item_id
        result = await self.collection.delete_one({'_id': key})
        return result.deleted_count > 0
