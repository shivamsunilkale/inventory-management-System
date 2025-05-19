from pydantic import BaseModel, validator
from datetime import date
from typing import Optional, List
from fastapi import UploadFile, Form

class LocatorBase(BaseModel):
    code: str
    description: Optional[str] = None
    length: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None

class LocatorCreate(LocatorBase):
    pass

class Locator(LocatorBase):
    id: int
    sub_inventory_id: int

    class Config:
        from_attributes = True

class SubInventoryBase(BaseModel):
    name: str
    type: str

class SubInventoryCreate(SubInventoryBase):
    pass

class SubInventory(SubInventoryBase):
    id: int
    organization_id: int
    locators: List[Locator] = []

    class Config:
        from_attributes = True

class OrganizationBase(BaseModel):
    name: str
    legal_address: Optional[str] = None
    gst_number: Optional[str] = None
    vat_number: Optional[str] = None
    cin: Optional[str] = None
    pan_number: Optional[str] = None
    start_date: Optional[date] = None

class OrganizationCreate(OrganizationBase):
    @classmethod
    def as_form(
        cls,
        name: str = Form(...),
        legal_address: Optional[str] = Form(""),
        gst_number: Optional[str] = Form(""),
        vat_number: Optional[str] = Form(""),
        cin: Optional[str] = Form(""),
        pan_number: Optional[str] = Form(""),
        start_date: Optional[str] = Form(None),
        attachment: Optional[UploadFile] = None
    ):
        return cls(
            name=name,
            legal_address=legal_address or None,
            gst_number=gst_number or None,
            vat_number=vat_number or None,
            cin=cin or None,
            pan_number=pan_number or None,
            start_date=date.fromisoformat(start_date) if start_date else None
        )

class Organization(OrganizationBase):
    id: int
    attachment_path: Optional[str] = None
    sub_inventories: List[SubInventory] = []

    class Config:
        from_attributes = True
