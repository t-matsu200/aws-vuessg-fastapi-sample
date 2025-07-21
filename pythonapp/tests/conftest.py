import pytest

from fastapi.testclient import TestClient

from app import create_app


@pytest.fixture(scope='module')
def fixture_app_test():
    client = TestClient(create_app())
    return client
