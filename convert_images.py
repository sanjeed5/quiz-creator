#!/usr/bin/env python3
"""Convert HEIC images to JPEG format for processing."""

import logging
from pathlib import Path

from PIL import Image
from pillow_heif import register_heif_opener

# Register HEIF opener with Pillow
register_heif_opener()

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)


def convert_heic_to_jpeg(input_dir: Path, output_dir: Path) -> list[Path]:
    """Convert all HEIC files in input_dir to JPEG in output_dir."""
    output_dir.mkdir(exist_ok=True)
    
    heic_files = sorted(input_dir.glob("*.heic")) + sorted(input_dir.glob("*.HEIC"))
    converted = []
    
    for heic_path in heic_files:
        output_path = output_dir / f"{heic_path.stem}.jpg"
        
        try:
            with Image.open(heic_path) as img:
                # Convert to RGB if necessary (HEIC can have alpha)
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                img.save(output_path, "JPEG", quality=90)
            
            converted.append(output_path)
            logger.info(f"✓ Converted: {heic_path.name} -> {output_path.name}")
        except Exception as e:
            logger.error(f"✗ Failed: {heic_path.name} - {e}")
    
    return converted


def main():
    base_dir = Path(__file__).parent
    input_dir = base_dir / "images"
    output_dir = base_dir / "images_jpg"
    
    logger.info(f"Converting HEIC images from {input_dir} to {output_dir}\n")
    
    converted = convert_heic_to_jpeg(input_dir, output_dir)
    
    logger.info(f"\n✓ Converted {len(converted)} images to JPEG")
    logger.info(f"Output directory: {output_dir}")


if __name__ == "__main__":
    main()

