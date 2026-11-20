"""Tests validating deployment configuration files and settings for Vercel, Render, Atlas, and GitHub Actions."""

import json
from pathlib import Path
import pytest
import yaml
from app.core.config import Settings
from app.db.mongodb import get_sanitized_uri
from scripts.seed_demo import validate_demo_target
from types import SimpleNamespace
from fastapi.testclient import TestClient
from app.main import create_app


REPO_ROOT = Path(__file__).parents[2]


class TestVercelConfiguration:
    def test_vercel_json_structure_and_order(self):
        vercel_path = REPO_ROOT / "frontend" / "vercel.json"
        assert vercel_path.exists(), "frontend/vercel.json must exist"

        data = json.loads(vercel_path.read_text())
        assert "rewrites" in data
        rewrites = data["rewrites"]
        assert len(rewrites) >= 4

        sources = [r["source"] for r in rewrites]
        assert "/api/:path*" in sources
        assert "/health/:path*" in sources
        assert "/uploads/:path*" in sources
        assert "/(.*)" in sources

        # Verify fallback is the last rule
        assert rewrites[-1]["source"] == "/(.*)"
        assert rewrites[-1]["destination"] == "/index.html"

        # Verify backend destinations point to the Render host pattern
        api_rewrite = next(r for r in rewrites if r["source"] == "/api/:path*")
        assert "/api/:path*" in api_rewrite["destination"]
        assert "onrender.com" in api_rewrite["destination"]


class TestRenderConfiguration:
    def test_render_yaml_validity(self):
        render_path = REPO_ROOT / "render.yaml"
        assert render_path.exists(), "render.yaml must exist at repository root"

        data = yaml.safe_load(render_path.read_text())
        assert "services" in data
        assert len(data["services"]) == 1

        service = data["services"][0]
        assert service["type"] == "web"
        assert service["runtime"] == "python"
        assert service["rootDir"] == "backend"
        assert service["plan"] == "free"
        assert "$PORT" in service["startCommand"]
        assert service["healthCheckPath"] == "/health/live"

    def test_python_version_file(self):
        py_ver_path = REPO_ROOT / "backend" / ".python-version"
        assert py_ver_path.exists(), "backend/.python-version must exist"
        content = py_ver_path.read_text().strip()
        assert content.startswith("3.12")


class TestGitHubKeepaliveWorkflow:
    def test_keepalive_workflow_validity(self):
        workflow_path = REPO_ROOT / ".github" / "workflows" / "render-keepalive.yml"
        assert workflow_path.exists(), "render-keepalive.yml must exist"

        content = workflow_path.read_text()
        data = yaml.safe_load(content)

        # Verify trigger schedule
        assert "schedule" in data[True] or "schedule" in data.get("on", {})
        on_block = data.get("on") or data.get(True)
        cron_expr = on_block["schedule"][0]["cron"]
        assert cron_expr == "7,17,27,37,47,57 * * * *"
        assert "workflow_dispatch" in on_block

        # Verify secret usage and no hardcoded secret
        assert "RENDER_HEALTH_URL" in content
        assert "https://koushik" not in content
        assert "RENDER_HEALTH_URL: ${{ secrets.RENDER_HEALTH_URL }}" in content


class TestSanitizedUri:
    def test_atlas_srv_sanitization(self):
        uri = "mongodb+srv://user:secretpass@cluster0.tlzc73k.mongodb.net/agri_chain?retryWrites=true&w=majority"
        sanitized = get_sanitized_uri(uri)
        assert "secretpass" not in sanitized
        assert "user" not in sanitized
        assert sanitized == "mongodb+srv://[REDACTED]@cluster0.tlzc73k.mongodb.net/agri_chain?retryWrites=true&w=majority"

    def test_standard_replica_set_sanitization(self):
        uri = "mongodb://user:secretpass@localhost:27017/agri_chain?replicaSet=rs0"
        sanitized = get_sanitized_uri(uri)
        assert "secretpass" not in sanitized
        assert sanitized == "mongodb://[REDACTED]@localhost:27017/agri_chain?replicaSet=rs0"

    def test_uri_without_credentials(self):
        uri = "mongodb://localhost:27017/agri_chain?replicaSet=rs0"
        assert get_sanitized_uri(uri) == uri


class TestProductionSecuritySettings:
    def test_production_rejects_default_jwt_secret(self):
        with pytest.raises(ValueError, match="JWT_SECRET_KEY must be at least 32 characters"):
            Settings(
                app_env="production",
                jwt_secret_key="dev-secret-change-in-production",
                _env_file=None,
            )

    def test_production_rejects_short_jwt_secret(self):
        with pytest.raises(ValueError, match="JWT_SECRET_KEY must be at least 32 characters"):
            Settings(
                app_env="production",
                jwt_secret_key="short_secret_under_32_chars",
                _env_file=None,
            )

    def test_production_accepts_strong_jwt_secret(self):
        settings = Settings(
            app_env="production",
            jwt_secret_key="a" * 32,
            _env_file=None,
        )
        assert settings.jwt_secret_key == "a" * 32

    def test_cors_origins_comma_separated_parsing(self):
        settings = Settings(
            cors_origins="https://agrichain.vercel.app, https://preview.agrichain.vercel.app",
            _env_file=None,
        )
        assert settings.cors_origins == [
            "https://agrichain.vercel.app",
            "https://preview.agrichain.vercel.app",
        ]

    def test_seed_demo_rejects_production_env(self):
        with pytest.raises(RuntimeError, match="Demo seed requires development/test APP_ENV"):
            validate_demo_target(SimpleNamespace(app_env="production", database_name="agri_chain_demo"))


class TestHealthEndpoints:
    @pytest.fixture
    def client(self):
        # Create app without triggering lifespan's mongo connect
        app = create_app()
        return TestClient(app, raise_server_exceptions=False)

    def test_health_live_endpoint(self, client):
        response = client.get("/health/live")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

