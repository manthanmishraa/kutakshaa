from uuid import uuid4


def register_user(client, role):
    unique = uuid4().hex
    username = f"{role}-{unique}"
    response = client.post(
        "/auth/register",
        json={
            "email": f"{username}@example.com",
            "username": username,
            "password": "test-pass-123",
            "role": role,
            "full_name": username,
        },
    )
    assert response.status_code == 201, response.text

    response = client.post(
        "/auth/login",
        json={"username": username, "password": "test-pass-123"},
    )
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_patient_tracking_alert_is_broadcast_to_caretakers_and_doctors(
    client, auth_headers
):
    patient_headers = register_user(client, "patient")
    caregiver_headers = register_user(client, "caregiver")
    caretaker_headers = register_user(client, "caretaker")
    payload = {
        "patient_id": "p1",
        "patient_name": "Rajesh Kumar",
        "patient_age": 64,
        "metric": "walking_speed",
        "label": "Walking Speed",
        "message": "Walking Speed is 40% below baseline.",
        "severity": "critical",
        "direction": "below",
        "current": 0.72,
        "baseline": 1.2,
        "deviation": 40,
        "unit": "m/s",
    }

    response = client.post(
        "/notifications/alerts", json=payload, headers=patient_headers
    )

    assert response.status_code == 201, response.text
    assert response.json()["recipient_count"] >= 3

    for recipient_headers in (auth_headers, caregiver_headers, caretaker_headers):
        response = client.get("/notifications/alerts", headers=recipient_headers)
        assert response.status_code == 200, response.text
        assert any(
            notification["patient_name"] == "Rajesh Kumar"
            and notification["title"] == "Critical alert - Walking Speed"
            and notification["metric"] == "walking_speed"
            and notification["direction"] == "below"
            for notification in response.json()
        )

    response = client.get("/notifications/alerts", headers=patient_headers)
    assert response.status_code == 403


def test_only_patient_accounts_can_broadcast_tracking_alerts(client, auth_headers):
    response = client.post(
        "/notifications/alerts",
        json={
            "patient_id": "p1",
            "patient_name": "Rajesh Kumar",
            "metric": "walking_speed",
            "label": "Walking Speed",
            "message": "Walking speed changed.",
            "severity": "warning",
            "direction": "below",
            "current": 0.8,
            "baseline": 1.2,
            "deviation": 33.3,
        },
        headers=auth_headers,
    )

    assert response.status_code == 403
