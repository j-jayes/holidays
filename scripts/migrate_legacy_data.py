"""
One-time migration script: parse legacy Excel/CSV vacation data and import
it into Azure Cosmos DB.

Usage:
    python scripts/migrate_legacy_data.py \
        --input path/to/legacy_data.xlsx \
        --cosmos-url https://<account>.documents.azure.com:443/ \
        --cosmos-key <key> \
        --db-name vacation-tracker

This script is intentionally idempotent: it uses the legacy row's unique
identifier as the Cosmos DB document id, so re-running will upsert existing
records without creating duplicates.
"""

import argparse
import asyncio
import uuid
from datetime import datetime
from pathlib import Path

# Third-party — install with: pip install openpyxl pandas azure-cosmos
import pandas as pd
from azure.cosmos.aio import CosmosClient

LEAVE_REQUESTS_CONTAINER = "LeaveRequests"

# Mapping from legacy Excel column codes to the app's LeaveStatus values.
LEGACY_STATUS_MAP: dict[str, str] = {
    "A": "A",   # Requested
    "B": "B",   # Approved
    "FL": "FL", # Parental Leave
    "C": "C",   # Comp Time
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate legacy vacation data to Cosmos DB.")
    parser.add_argument("--input", required=True, help="Path to the legacy Excel or CSV file.")
    parser.add_argument("--cosmos-url", required=True, help="Cosmos DB account URL.")
    parser.add_argument("--cosmos-key", required=True, help="Cosmos DB account key.")
    parser.add_argument("--db-name", default="vacation-tracker", help="Cosmos DB database name.")
    return parser.parse_args()


def load_legacy_data(file_path: str) -> pd.DataFrame:
    """Load the legacy Excel or CSV file into a DataFrame."""
    path = Path(file_path)
    if path.suffix in {".xlsx", ".xls"}:
        return pd.read_excel(path)
    elif path.suffix == ".csv":
        return pd.read_csv(path)
    else:
        raise ValueError(f"Unsupported file format: {path.suffix}")


def transform_row(row: pd.Series) -> dict:
    """
    Transform a legacy DataFrame row into a Cosmos DB document.

    TODO: update the column name mapping below to match your actual Excel
    column headers (e.g. 'employee_id', 'start', 'end', 'type').
    """
    return {
        "id": str(row.get("id", uuid.uuid4())),
        "userId": str(row.get("employee_id", "")),
        "businessUnitId": str(row.get("business_unit", "")),
        "startDate": str(row.get("start_date", "")),
        "endDate": str(row.get("end_date", "")),
        "leaveType": LEGACY_STATUS_MAP.get(str(row.get("leave_type", "B")).upper(), "B"),
        "status": LEGACY_STATUS_MAP.get(str(row.get("status", "B")).upper(), "B"),
        "notes": str(row.get("notes", "")),
        "migratedAt": datetime.utcnow().isoformat(),
    }


async def migrate(args: argparse.Namespace) -> None:
    df = load_legacy_data(args.input)
    print(f"Loaded {len(df)} rows from {args.input}")

    async with CosmosClient(url=args.cosmos_url, credential=args.cosmos_key) as client:
        container = client.get_database_client(args.db_name).get_container_client(
            LEAVE_REQUESTS_CONTAINER
        )
        success = 0
        for _, row in df.iterrows():
            doc = transform_row(row)
            await container.upsert_item(doc)
            success += 1

    print(f"Migration complete: {success}/{len(df)} records upserted.")


if __name__ == "__main__":
    asyncio.run(migrate(parse_args()))
