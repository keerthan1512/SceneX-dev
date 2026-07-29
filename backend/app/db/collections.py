from app.db.mongodb import get_db


def users_collection():
    return get_db().users


def organizations_collection():
    return get_db().organizations


def cases_collection():
    return get_db().cases
