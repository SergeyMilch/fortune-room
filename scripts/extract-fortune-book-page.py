"""Build deterministic Fortune Book layers from the approved open artwork."""

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT_ROOT / "assets/fortune-book/scene/book-open.png"
PAGE_OUTPUT_DIR = PROJECT_ROOT / "assets/fortune-book/pages"
LAYER_OUTPUT_DIR = PROJECT_ROOT / "assets/fortune-book/layers"

# Visible top-right leaf, clockwise from the upper gutter. The candle-occluded
# lower-right corner is excluded so candle pixels never become page texture.
RIGHT_PAGE_CONTOUR = [
    (535, 530), (571, 528), (619, 531), (669, 537), (719, 545),
    (770, 553), (820, 562), (866, 571), (902, 580), (919, 591),
    (916, 631), (909, 685), (901, 742), (892, 800), (882, 860),
    (871, 922), (859, 984), (846, 1048), (832, 1110), (817, 1142),
    (802, 1162), (789, 1187), (779, 1215), (767, 1238), (759, 1253),
    (716, 1253), (667, 1249), (616, 1242), (565, 1235), (514, 1227),
    (465, 1219), (420, 1212), (385, 1208), (366, 1208), (374, 1171),
    (383, 1130), (393, 1086), (404, 1040), (415, 993), (426, 945),
    (438, 897), (450, 849), (462, 801), (474, 754), (486, 708),
    (497, 664), (508, 623), (518, 586), (527, 555),
]

# Visible left resting leaf, clockwise from the shared upper gutter.
LEFT_PAGE_CONTOUR = [
    (535, 530), (508, 513), (474, 499), (434, 489), (390, 481),
    (344, 477), (297, 475), (252, 476), (214, 479), (184, 485),
    (159, 501), (137, 531), (116, 568), (96, 611), (78, 660),
    (61, 714), (46, 772), (32, 835), (19, 902), (8, 970),
    (0, 1034), (0, 1084), (29, 1096), (70, 1108), (116, 1122),
    (164, 1138), (213, 1154), (261, 1170), (305, 1185), (339, 1198),
    (366, 1208), (374, 1171), (383, 1130), (393, 1086), (404, 1040),
    (415, 993), (426, 945), (438, 897), (450, 849), (462, 801),
    (474, 754), (486, 708), (497, 664), (508, 623), (518, 586),
    (527, 555),
]

# Full local book footprint. It is used only to split the approved image into
# scene and book-owned pixels; no content is synthesized behind the book.
BOOK_CONTOUR = [
    (176, 465), (250, 458), (350, 461), (445, 474), (535, 519),
    (638, 526), (745, 542), (852, 563), (925, 584), (941, 615),
    (941, 1248), (914, 1276), (842, 1302), (760, 1315), (650, 1304),
    (535, 1289), (430, 1270), (337, 1248), (245, 1219), (155, 1188),
    (74, 1150), (0, 1110), (0, 681), (37, 605), (82, 543),
    (128, 495),
]


def polygon_mask(
    size: tuple[int, int],
    contour: list[tuple[int, int]],
    *,
    antialias_scale: int = 4,
) -> Image.Image:
    scaled_size = (size[0] * antialias_scale, size[1] * antialias_scale)
    mask = Image.new("L", scaled_size, 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon(
        [(x * antialias_scale, y * antialias_scale) for x, y in contour],
        fill=255,
    )
    return mask.resize(size, Image.Resampling.LANCZOS)


def hard_mask(mask: Image.Image) -> Image.Image:
    return mask.point(lambda value: 255 if value >= 128 else 0)


def layer_from_source(source: Image.Image, mask: Image.Image) -> Image.Image:
    layer = source.copy()
    layer.putalpha(mask)
    return layer


def save(layer: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    layer.save(path, optimize=True)
    print(f"Saved {path.relative_to(PROJECT_ROOT)}")


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    if source.size != (941, 1671):
        raise RuntimeError(f"Unexpected source dimensions: {source.size}")

    right_mask = polygon_mask(source.size, RIGHT_PAGE_CONTOUR)
    left_mask = polygon_mask(source.size, LEFT_PAGE_CONTOUR)
    book_mask = hard_mask(polygon_mask(source.size, BOOK_CONTOUR))

    # Page interiors belong to their page layers. Book-body stays underneath
    # their antialiased edges, which keeps the decomposition fully opaque.
    page_interiors = ImageChops.lighter(hard_mask(right_mask), hard_mask(left_mask))
    body_mask = ImageChops.subtract(book_mask, page_interiors)
    scene_mask = ImageChops.invert(book_mask)

    moving_page = layer_from_source(source, right_mask)
    # Resting layers use the hard interior masks so scene + body + resting
    # pages form an exact opaque partition of the approved source artwork.
    # The antialiased mask belongs only to the moving top leaf.
    right_under_page = layer_from_source(source, hard_mask(right_mask))
    left_resting_page = layer_from_source(source, hard_mask(left_mask))
    book_body = layer_from_source(source, body_mask)
    scene_background = layer_from_source(source, scene_mask)

    save(right_mask, PAGE_OUTPUT_DIR / "right-page-mask.png")
    save(left_mask, PAGE_OUTPUT_DIR / "left-page-mask.png")
    save(moving_page, PAGE_OUTPUT_DIR / "right-page-cutout.png")
    save(scene_background, LAYER_OUTPUT_DIR / "scene-background.png")
    save(book_body, LAYER_OUTPUT_DIR / "book-body.png")
    save(left_resting_page, LAYER_OUTPUT_DIR / "left-resting-page.png")
    save(right_under_page, LAYER_OUTPUT_DIR / "right-under-page.png")
    save(moving_page, LAYER_OUTPUT_DIR / "moving-top-page.png")


if __name__ == "__main__":
    main()
