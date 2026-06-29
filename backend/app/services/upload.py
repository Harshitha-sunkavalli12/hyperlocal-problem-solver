"""Image upload utility for handling base64 and file uploads."""
import base64
import hashlib
from pathlib import Path

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


def save_base64_image(data_url: str) -> str:
    """Save base64 image and return URL."""
    try:
        # Extract base64 data
        if "," in data_url:
            header, encoded = data_url.split(",", 1)
        else:
            encoded = data_url

        # Decode and save
        img_data = base64.b64decode(encoded)
        img_hash = hashlib.md5(img_data).hexdigest()[:12]

        # Determine extension
        ext = "jpg"
        if "data:image/png" in data_url:
            ext = "png"
        elif "data:image/jpeg" in data_url or "data:image/jpg" in data_url:
            ext = "jpg"

        filename = f"{img_hash}.{ext}"
        filepath = UPLOAD_DIR / filename

        with open(filepath, "wb") as f:
            f.write(img_data)

        return f"/uploads/{filename}"
    except Exception:
        # If upload fails, return the original data URL
        return data_url
