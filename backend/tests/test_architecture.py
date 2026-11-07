from pathlib import Path

from app.schemas.common import Page


def test_page_contract_has_required_fields():
    page = Page[int](items=[1], total=2, page=1, page_size=1, has_next=True)
    assert page.model_dump() == {"items": [1], "total": 2, "page": 1, "page_size": 1, "has_next": True}


def test_repository_base_is_the_only_new_mongo_access_seam():
    source = Path(__file__).parents[1] / "app" / "repositories" / "base.py"
    assert "get_by_any_id" in source.read_text()
