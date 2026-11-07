from typing import List, Any, Optional
from math import ceil


class PaginationParams:
    def __init__(self, page: int = 1, page_size: int = 20):
        self.page = max(1, page)
        self.page_size = max(1, min(100, page_size))

    @property
    def skip(self) -> int:
        return (self.page - 1) * self.page_size


class PaginatedResult:
    def __init__(self, items: List[Any], total: int, page: int, page_size: int):
        self.items = items
        self.total = total
        self.page = page
        self.page_size = page_size
        self.total_pages = ceil(total / page_size) if page_size > 0 else 0
        self.has_next = page < self.total_pages
        self.has_prev = page > 1

    def to_dict(self) -> dict:
        return {
            "items": self.items,
            "total": self.total,
            "page": self.page,
            "page_size": self.page_size,
            "total_pages": self.total_pages,
            "has_next": self.has_next,
            "has_prev": self.has_prev,
        }


def paginate(items: List[Any], page: int, page_size: int) -> PaginatedResult:
    total = len(items)
    skip = (page - 1) * page_size
    paginated_items = items[skip:skip + page_size]
    return PaginatedResult(paginated_items, total, page, page_size)


def filter_items(items: List[Any], filter_func) -> List[Any]:
    return [item for item in items if filter_func(item)]


def sort_items(items: List[Any], key_func, reverse: bool = False) -> List[Any]:
    return sorted(items, key=key_func, reverse=reverse)


def search_items(items: List[Any], search_term: str, search_fields: List[str]) -> List[Any]:
    if not search_term:
        return items
    term = search_term.lower()
    results = []
    for item in items:
        for field in search_fields:
            value = str(item.get(field, "")).lower()
            if term in value:
                results.append(item)
                break
    return results