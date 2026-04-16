"""Azure Cosmos DB client and container helpers."""

from azure.cosmos.aio import CosmosClient
from azure.cosmos.exceptions import CosmosResourceNotFoundError

from app.config import settings

_client: CosmosClient | None = None


def get_cosmos_client() -> CosmosClient:
    """Return a singleton Cosmos DB async client."""
    global _client
    if _client is None:
        _client = CosmosClient(
            url=settings.cosmos_db_url,
            credential=settings.cosmos_db_key,
        )
    return _client


async def get_container(container_name: str):
    """Return a Cosmos DB container proxy."""
    client = get_cosmos_client()
    database = client.get_database_client(settings.cosmos_db_name)
    return database.get_container_client(container_name)


# Container name constants
USERS_CONTAINER = "Users"
LEAVE_REQUESTS_CONTAINER = "LeaveRequests"
BUSINESS_UNITS_CONTAINER = "BusinessUnits"


# ─── Generic CRUD helpers ────────────────────────────────────────────────────

async def list_items(container_name: str, query: str = "SELECT * FROM c", params: list | None = None) -> list[dict]:
    """Return all documents matching *query* from *container_name*."""
    container = await get_container(container_name)
    results = []
    async for item in container.query_items(
        query=query,
        parameters=params or [],
    ):
        results.append(item)
    return results


async def get_item(container_name: str, item_id: str) -> dict | None:
    """Point-read a single document by id (partition key = id)."""
    container = await get_container(container_name)
    try:
        return await container.read_item(item=item_id, partition_key=item_id)
    except CosmosResourceNotFoundError:
        return None


async def upsert_item(container_name: str, item: dict) -> dict:
    """Create or replace a document. *item* must contain an 'id' field."""
    container = await get_container(container_name)
    return await container.upsert_item(item)


async def delete_item(container_name: str, item_id: str) -> None:
    """Delete a document by id (partition key = id). Silent if not found."""
    container = await get_container(container_name)
    try:
        await container.delete_item(item=item_id, partition_key=item_id)
    except CosmosResourceNotFoundError:
        pass
