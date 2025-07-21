import pytest
import uuid

@pytest.mark.asyncio
async def test_submit_sample_form(fixture_app_test):
    trace_id = str(uuid.uuid4())
    headers = {"X-Trace-ID": trace_id}
    form_data = {
        "name": "Test User",
        "email": "test@example.com",
        "category": "Technical",
    }
    file_to_upload = {"file": ("testfile.txt", b"this is a test file", "text/plain")}

    client = fixture_app_test
    response = client.post(
        '/api/submit-sample-form',
        data=form_data,
        files=file_to_upload,
        headers=headers
    )
    print(response.json())
    assert response.status_code == 200, f"Request failed: {response.json()}"
    assert response.json() == {"message": "Form submitted successfully!", "filename": "testfile.txt"}
    assert "X-Process-Time" in response.headers
    assert response.headers["X-Trace-ID"] == trace_id
