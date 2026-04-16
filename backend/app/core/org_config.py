"""Loads and exposes the org_config.yaml configuration."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import yaml

_ORG_CONFIG_PATH = Path(__file__).parent.parent.parent / "org_config.yaml"


@dataclass
class Employee:
    name: str
    email: str
    project: Optional[str] = None


@dataclass
class BusinessUnitConfig:
    manager_name: str
    manager_email: str
    employees: list[Employee] = field(default_factory=list)


@dataclass
class OrgConfig:
    business_units: dict[str, BusinessUnitConfig]

    def get_manager_email(self, bu_name: str) -> Optional[str]:
        bu = self.business_units.get(bu_name)
        return bu.manager_email if bu else None

    def get_manager_name(self, bu_name: str) -> Optional[str]:
        bu = self.business_units.get(bu_name)
        return bu.manager_name if bu else None


def load_org_config(path: Path = _ORG_CONFIG_PATH) -> OrgConfig:
    """Load org_config.yaml from disk. Raises FileNotFoundError if missing."""
    if not path.exists():
        raise FileNotFoundError(
            f"org_config.yaml not found at {path}. "
            "Copy org_config.example.yaml to org_config.yaml and fill in real values."
        )
    with path.open(encoding="utf-8") as f:
        data = yaml.safe_load(f)

    business_units: dict[str, BusinessUnitConfig] = {}
    for bu_name, bu_data in data.get("business_units", {}).items():
        employees = [
            Employee(
                name=emp["name"],
                email=emp["email"],
                project=emp.get("project"),
            )
            for emp in bu_data.get("employees", [])
        ]
        business_units[bu_name] = BusinessUnitConfig(
            manager_name=bu_data.get("manager_name", ""),
            manager_email=bu_data.get("manager_email", ""),
            employees=employees,
        )

    return OrgConfig(business_units=business_units)


# Module-level singleton — loaded once at startup.
org_config: OrgConfig = load_org_config()
