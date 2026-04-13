# app/core/cloudinary.py
import cloudinary
import cloudinary.uploader
from app.core.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)


async def upload_media(file_bytes: bytes, filename: str,
                       folder: str = "civicimpact/posts") -> dict:
    is_video = any(
        filename.lower().endswith(e) for e in [".mp4", ".mov", ".avi", ".webm"]
    )
    resource_type = "video" if is_video else "image"
    transformation = (
        [{"quality": "auto", "fetch_format": "mp4"}]
        if is_video
        else [{"quality": "auto", "fetch_format": "auto", "width": 1080, "crop": "limit"}]
    )
    result = cloudinary.uploader.upload(
        file_bytes,
        folder=folder,
        resource_type=resource_type,
        transformation=transformation,
    )
    return {
        "url":        result["secure_url"],
        "public_id":  result["public_id"],
        "type":       resource_type,
    }


async def upload_avatar(file_bytes: bytes) -> dict:
    result = cloudinary.uploader.upload(
        file_bytes,
        folder="civicimpact/avatars",
        resource_type="image",
        transformation=[{"width": 400, "height": 400, "crop": "fill", "quality": "auto"}],
    )
    return {"url": result["secure_url"], "public_id": result["public_id"]}


def delete_media(public_id: str, resource_type: str = "image"):
    try:
        cloudinary.uploader.destroy(public_id, resource_type=resource_type)
    except Exception:
        pass
