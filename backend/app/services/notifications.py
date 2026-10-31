from __future__ import annotations

from typing import List, Dict, Any


class NotificationService:
    def send(self, recipients: List[str], title: str, body: str, channel: str = "email") -> Dict[str, Any]:
        return {"status": "queued", "channel": channel, "recipients": recipients, "title": title, "body": body}
