"""
Seed the Cosmos DB with representative test data.

Usage:
    python scripts/seed_db.py \
        --cosmos-url https://<account>.documents.azure.com:443/ \
        --cosmos-key <key> \
        --db-name vacation-tracker

Creates:
  - 3 BusinessUnit documents
  - 5 User documents
  - 10 LeaveRequest documents (mix of statuses and types)
"""

import argparse
import asyncio
from datetime import date

from azure.cosmos.aio import CosmosClient

BUSINESS_UNITS = [
    {"id": "bu-malmo", "name": "CU Malmö", "managerUserId": "user-rasmus"},
    {"id": "bu-goteborg", "name": "CU Göteborg", "managerUserId": "user-magnus"},
    {"id": "bu-stockholm", "name": "CU Stockholm", "managerUserId": "user-christian"},
]

USERS = [
    {"id": "user-rasmus",    "email": "rasmus@example.com",    "displayName": "Rasmus Bodin Löfgren",  "role": "Manager", "businessUnitId": "bu-malmo",     "annualLeaveBalance": 25, "compTimeBalance": 0},
    {"id": "user-magnus",    "email": "magnus@example.com",    "displayName": "Magnus Hillman",         "role": "Manager", "businessUnitId": "bu-goteborg",   "annualLeaveBalance": 25, "compTimeBalance": 0},
    {"id": "user-christian", "email": "christian@example.com", "displayName": "Christian Carlborg",     "role": "Manager", "businessUnitId": "bu-stockholm",  "annualLeaveBalance": 25, "compTimeBalance": 0},
    {"id": "user-alice",     "email": "alice@example.com",     "displayName": "Alice Svensson",         "role": "Employee","businessUnitId": "bu-malmo",     "annualLeaveBalance": 25, "compTimeBalance": 8},
    {"id": "user-bob",       "email": "bob@example.com",       "displayName": "Bob Lindqvist",          "role": "Employee","businessUnitId": "bu-stockholm",  "annualLeaveBalance": 20, "compTimeBalance": 4},
]

LEAVE_REQUESTS = [
    {"id": "lr-001", "userId": "user-alice", "businessUnitId": "bu-malmo",    "startDate": "2025-07-14", "endDate": "2025-07-18", "leaveType": "B",  "status": "B",  "notes": "Summer holiday"},
    {"id": "lr-002", "userId": "user-alice", "businessUnitId": "bu-malmo",    "startDate": "2025-12-22", "endDate": "2025-12-26", "leaveType": "A",  "status": "A",  "notes": "Christmas"},
    {"id": "lr-003", "userId": "user-bob",   "businessUnitId": "bu-stockholm","startDate": "2025-06-06", "endDate": "2025-06-06", "leaveType": "B",  "status": "B",  "notes": "National Day (bridge)"},
    {"id": "lr-004", "userId": "user-bob",   "businessUnitId": "bu-stockholm","startDate": "2025-08-04", "endDate": "2025-08-08", "leaveType": "C",  "status": "B",  "notes": "Comp time"},
    {"id": "lr-005", "userId": "user-alice", "businessUnitId": "bu-malmo",    "startDate": "2025-09-01", "endDate": "2025-11-30", "leaveType": "FL", "status": "FL", "notes": "Parental leave"},
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed the Cosmos DB with test data.")
    parser.add_argument("--cosmos-url", required=True)
    parser.add_argument("--cosmos-key", required=True)
    parser.add_argument("--db-name", default="vacation-tracker")
    return parser.parse_args()


async def seed(args: argparse.Namespace) -> None:
    async with CosmosClient(url=args.cosmos_url, credential=args.cosmos_key) as client:
        db = client.get_database_client(args.db_name)

        for bu in BUSINESS_UNITS:
            await db.get_container_client("BusinessUnits").upsert_item(bu)
        print(f"Seeded {len(BUSINESS_UNITS)} business units.")

        for user in USERS:
            await db.get_container_client("Users").upsert_item(user)
        print(f"Seeded {len(USERS)} users.")

        for lr in LEAVE_REQUESTS:
            await db.get_container_client("LeaveRequests").upsert_item(lr)
        print(f"Seeded {len(LEAVE_REQUESTS)} leave requests.")

    print("Seeding complete.")


if __name__ == "__main__":
    asyncio.run(seed(parse_args()))
