"""Define safe post projections for public discovery."""

from datetime import datetime

from pydantic import BaseModel


class PublicPostSummary(BaseModel):
    """Expose an allow-listed post preview to anonymous visitors."""

    id: str
    title: str
    excerpt: str
    created_at: datetime
