"""Build web copies without modifying originals. Requires Pillow with WebP support.

Usage: python3 scripts/prepare-travel-photos.py /path/to/pic
Editorial copy lives separately in lib/photo-copy.json and is never overwritten.
"""

import io
import json
import sys
from pathlib import Path

from PIL import Image, ImageCms, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]).expanduser().resolve()
DEST = ROOT / 'public/photos'
files = sorted(p for p in SOURCE.rglob('*') if p.suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff'})
if not files:
    raise SystemExit('No supported images found')
DEST.mkdir(parents=True, exist_ok=True)
(DEST / 'thumbs').mkdir(exist_ok=True)
records = []
seen = set()


def encode(image, destination, edge, quality, budget):
    image = image.copy()
    image.thumbnail((edge, edge), Image.Resampling.LANCZOS)
    while True:
        buffer = io.BytesIO()
        image.save(buffer, 'WEBP', quality=quality, method=6)
        if buffer.tell() <= budget:
            break
        if quality > 66:
            quality -= 4
        else:
            image.thumbnail((int(image.width * .9), int(image.height * .9)), Image.Resampling.LANCZOS)
    destination.write_bytes(buffer.getvalue())
    return {'width': image.width, 'height': image.height, 'bytes': buffer.tell()}


for source in files:
    # The export folder preserves the original camera filename.
    name = (source.parent.name if source.parent != SOURCE else source.stem).lower()
    if name in seen:
        raise SystemExit(f'Duplicate image ID: {name}')
    seen.add(name)
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original)
        profile = original.info.get('icc_profile')
        if profile:
            image = ImageCms.profileToProfile(image, ImageCms.ImageCmsProfile(io.BytesIO(profile)), ImageCms.createProfile('sRGB'), outputMode='RGB')
        else:
            image = image.convert('RGB')
        full = encode(image, DEST / f'{name}.webp', 1920, 82, 650_000)
        thumb = encode(image, DEST / 'thumbs' / f'{name}.webp', 960, 78, 180_000)
    records.append({'id': name, 'file': f'{name}.webp', 'source': str(source.relative_to(SOURCE)), 'originalBytes': source.stat().st_size, **full, 'thumbnail': thumb})
    print(f'{name}: {full["bytes"]:,} + {thumb["bytes"]:,} bytes', flush=True)

(ROOT / 'lib/photo-assets.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'count': len(records), 'originalBytes': sum(r['originalBytes'] for r in records), 'webBytes': sum(r['bytes'] + r['thumbnail']['bytes'] for r in records)}, indent=2))
