"""Azure Cosmos DB client and container helpers."""

from azure.cosmos.aio import CosmosClient

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
