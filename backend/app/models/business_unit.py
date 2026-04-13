"""Business unit domain model."""


class BusinessUnit:
    """
    Represents a business unit (CU Malmö, CU Göteborg, CU Stockholm, etc.)
    stored in the BusinessUnits Cosmos DB container.
    """

    def __init__(
        self,
        id: str,
        name: str,
        manager_user_id: str,
    ) -> None:
        self.id = id
        self.name = name
        self.manager_user_id = manager_user_id


# Default routing table — can be overridden by Admin at runtime.
DEFAULT_BU_MANAGER_MAPPING: dict[str, str] = {
    "CU Malmö": "rasmus.bodin.lofgren@yourcompany.com",
    "CU Göteborg": "magnus.hillman@yourcompany.com",
    "CU Stockholm": "christian.carlborg@yourcompany.com",
    # OH / PL → admin-configurable
}
