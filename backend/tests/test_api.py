"""End-to-end API + agent pipeline integration tests."""


def _report(client, **over):
    body = {
        "description": "deep pothole full of water on the main road",
        "lat": 17.4948,
        "lng": 78.3030,
        "reporter_handle": "tester",
    }
    body.update(over)
    return client.post("/api/issues", json=body)


def test_report_runs_intake_and_validation(client):
    r = _report(client)
    assert r.status_code == 201
    issue = r.json()
    assert issue["issue_type"] == "pothole"
    assert 1 <= issue["severity"] <= 5
    assert issue["status"] == "REPORTED"
    # Transparency: intake + validation reasoning recorded.
    agents = {x["agent"] for x in issue["reasonings"]}
    assert "Intake Agent" in agents
    assert "Validation Agent" in agents


def test_geo_cluster_escalates_to_verified(client):
    # Three same-type reports within 200m should escalate the cluster.
    _report(client, lat=17.4948, lng=78.3030)
    _report(client, lat=17.4949, lng=78.3031)
    third = _report(client, lat=17.4950, lng=78.3032).json()
    assert third["status"] in ("VERIFIED", "ASSIGNED")
    assert third["department"]  # routed once verified


def test_upvotes_verify_and_route(client):
    issue = _report(client, lat=10.0, lng=10.0).json()  # isolated location
    assert issue["status"] == "REPORTED"
    for i in range(10):
        resp = client.post(
            f"/api/issues/{issue['id']}/vote",
            json={"user_handle": f"voter_{i}", "value": 1},
        )
        assert resp.status_code == 200
    final = client.get(f"/api/issues/{issue['id']}").json()
    assert final["status"] in ("VERIFIED", "ASSIGNED")


def test_duplicate_vote_rejected(client):
    issue = _report(client, lat=20.0, lng=20.0).json()
    a = client.post(f"/api/issues/{issue['id']}/vote", json={"user_handle": "same", "value": 1})
    b = client.post(f"/api/issues/{issue['id']}/vote", json={"user_handle": "same", "value": 1})
    assert a.status_code == 200
    assert b.status_code == 409


def test_resolve_requires_photo_proof(client):
    # Verify + route first.
    issue = _report(client, lat=30.0, lng=30.0).json()
    for i in range(10):
        client.post(f"/api/issues/{issue['id']}/vote", json={"user_handle": f"v{i}", "value": 1})
    # Missing proof -> rejected.
    bad = client.post(f"/api/issues/{issue['id']}/resolve", json={"proof_image_url": ""})
    assert bad.status_code == 400
    # With proof -> resolved + reasoning logged.
    ok = client.post(
        f"/api/issues/{issue['id']}/resolve",
        json={"proof_image_url": "https://x/y.jpg", "note": "fixed"},
    )
    assert ok.status_code == 200
    assert ok.json()["status"] == "RESOLVED"


def test_auth_signup_login_and_official(client):
    s = client.post("/api/auth/signup", json={"handle": "alice", "password": "pw1234"})
    assert s.status_code == 201
    assert s.json()["role"] == "citizen"

    dup = client.post("/api/auth/signup", json={"handle": "alice", "password": "pw1234"})
    assert dup.status_code == 409

    good = client.post("/api/auth/login", json={"handle": "alice", "password": "pw1234"})
    assert good.status_code == 200
    bad = client.post("/api/auth/login", json={"handle": "alice", "password": "nope"})
    assert bad.status_code == 401

    # Official login (default account bootstrapped on app startup).
    off = client.post(
        "/api/auth/official/login",
        json={"handle": "ghmc_official", "password": "official123"},
    )
    assert off.status_code == 200
    assert off.json()["role"] == "official"
    # Citizens cannot use the official endpoint.
    deny = client.post(
        "/api/auth/official/login", json={"handle": "alice", "password": "pw1234"}
    )
    assert deny.status_code == 401


def test_dashboard_requires_official(client):
    # Unauthenticated requests are denied (Req 14.3).
    assert client.get("/api/dashboard/stats").status_code == 401
    # A real citizen account is forbidden from official endpoints.
    client.post("/api/auth/signup", json={"handle": "bob", "password": "pw1234"})
    citizen = client.get("/api/dashboard/stats", headers={"X-Auth-Handle": "bob"})
    assert citizen.status_code == 403


def test_dashboard_stats_shape(client):
    _report(client)
    stats = client.get(
        "/api/dashboard/stats", headers={"X-Auth-Handle": "ghmc_official"}
    ).json()
    for key in ("total_reported", "total_resolved", "by_status", "sla_compliance"):
        assert key in stats
