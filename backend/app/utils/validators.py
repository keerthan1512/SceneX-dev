import re


def is_valid_case_id(case_id: str) -> bool:
    """Validate format CS-YYYY-NNNN"""
    return bool(re.match(r"^CS-\d{4}-\d{4}$", case_id))
