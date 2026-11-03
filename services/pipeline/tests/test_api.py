from fastapi.testclient import TestClient

from denialdesk_pipeline.api import app

client = TestClient(app)


def test_health_reports_ok() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_supported_code_returns_its_meaning() -> None:
    response = client.get("/codes/CO-197")

    assert response.status_code == 200
    body = response.json()
    assert body["code"] == "CO-197"
    assert body["supported"] is True
    assert "authorization" in body["plain_english"]


def test_known_carc_in_another_group_is_not_supported() -> None:
    response = client.get("/codes/OA-197")

    assert response.status_code == 200
    assert response.json()["supported"] is False


def test_lower_case_code_is_accepted() -> None:
    assert client.get("/codes/co-50").json()["code"] == "CO-50"


def test_unknown_code_is_not_found() -> None:
    assert client.get("/codes/CO-999").status_code == 404


def test_malformed_code_is_not_found() -> None:
    assert client.get("/codes/197").status_code == 404
    assert client.get("/codes/C-197").status_code == 404
