"""Seed the Cosmos DB from org_config.yaml.

Usage (from repo root):
    .venv/Scripts/python scripts/seed_db.py [--clear]

Flags:
    --clear   Delete all existing documents before seeding (default: upsert only)

Sweden BUs only.
"""

import argparse
import asyncio
import re
import sys
from pathlib import Path

# Allow importing app modules from the backend/ subdirectory
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from app.core.org_config import load_org_config
from app.db.cosmos import (
    get_container,
    list_items,
    upsert_item,
    delete_item,
    USERS_CONTAINER,
    BUSINESS_UNITS_CONTAINER,
    LEAVE_REQUESTS_CONTAINER,
)


SWEDEN_BUS = {"CU Malmö", "CU Göteborg", "CU Stockholm", "OH"}


def slugify(text: str) -> str:
    """Convert a display name or BU name to a URL-safe slug."""
    text = text.lower()
    # Normalise Swedish chars
    for src, dst in [("ä", "a"), ("å", "a"), ("ö", "o"), ("é", "e"), ("ę", "e"),
                     ("ó", "o"), ("ń", "n"), ("ł", "l"), ("ź", "z"), ("ż", "z"),
                     ("ą", "a"), ("ś", "s"), ("ć", "c"), ("ź", "z")]:
        text = text.replace(src, dst)
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text


def bu_id(bu_name: str) -> str:
    return f"bu-{slugify(bu_name)}"


def user_id(name: str) -> str:
    return f"user-{slugify(name)}"


async def clear_container(container_name: str) -> None:
    items = await list_items(container_name)
    for item in items:
        await delete_item(container_name, item["id"])
    print(f"  Cleared {len(items)} items from {container_name}")


async def seed(clear: bool = False) -> None:
    config = load_org_config()

    if clear:
        print("Clearing existing data...")
        for c in [USERS_CONTAINER, BUSINESS_UNITS_CONTAINER, LEAVE_REQUESTS_CONTAINER]:
            await clear_container(c)

    sweden_bus = {
        name: bu
        for name, bu in config.business_units.items()
        if name in SWEDEN_BUS
    }

    print(f"\nSeeding {len(sweden_bus)} Swedish business units...")
    for bu_name, bu_data in sweden_bus.items():
        # Determine manager user id
        manager_uid = user_id(bu_data.manager_name) if bu_data.manager_name else ""
        doc = {
            "id": bu_id(bu_name),
            "name": bu_name,
            "managerUserId": manager_uid,
        }
        await upsert_item(BUSINESS_UNITS_CONTAINER, doc)
        print(f"  BU: {bu_name} ({doc['id']})")

    # Collect all manager names so we can mark them with the Manager role
    manager_names = {bu_data.manager_name for bu_data in sweden_bus.values() if bu_data.manager_name}

    print(f"\nSeeding users...")
    for bu_name, bu_data in sweden_bus.items():
        this_bu_id = bu_id(bu_name)

        # Employees (managers are seeded via their actual BU's employee list)
        for emp in bu_data.employees:
            emp_doc = {
                "id": user_id(emp.name),
                "email": emp.email,
                "displayName": emp.name,
                "role": "Manager" if emp.name in manager_names else "Employee",
                "businessUnitId": this_bu_id,
                "entraOid": "",
                "annualLeaveBalance": 25.0,
                "compTimeBalance": 0.0,
            }
            await upsert_item(USERS_CONTAINER, emp_doc)
            print(f"  {'Manager' if emp.name in manager_names else 'Employee'}: {emp.name} ({emp_doc['id']})")

    print("\nSeeding complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--clear", action="store_true", help="Delete all existing documents first")
    args = parser.parse_args()
    asyncio.run(seed(clear=args.clear))
