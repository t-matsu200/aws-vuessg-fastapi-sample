from typing import Annotated
from fastapi import Form, UploadFile, File
from pydantic import BaseModel

class SampleFormCreate(BaseModel):
    name: Annotated[str, Form()]
    email: Annotated[str, Form()]
    category: Annotated[str, Form()]
    file: Annotated[UploadFile, File()]
