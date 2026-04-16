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
