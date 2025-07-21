
import logging
from fastapi import APIRouter, UploadFile, File, Form, Depends
from common.schemas.sample_form import SampleFormCreate

router = APIRouter()
logger = logging.getLogger("fastapi_app")

@router.post("/submit-sample-form")
async def submit_sample_form(
    name: str = Form(...),
    email: str = Form(...),
    category: str = Form(...),
    file: UploadFile = File(...)
):
    logger.info(f"Received form data: Name={name}, Email={email}, Category={category}")
    logger.info(f"Received file: Filename={file.filename}, ContentType={file.content_type}")
    return {"message": "Form submitted successfully!", "filename": file.filename}
