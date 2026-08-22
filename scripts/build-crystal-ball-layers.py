from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageStat


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "visual-proof" / "crystal-ball-candlelit-axis.png"
CLEAN_PLATE = ROOT / "assets" / "crystal-ball" / "layers" / "scene-clean-plate.png"
OUTPUT = ROOT / "assets" / "crystal-ball" / "layers"

SPHERE_BOUNDS = (235, 719, 707, 1191)
SPHERE_INNER_BOUNDS = (260, 744, 682, 1166)
TABLE_SPLIT_Y = 1188


def rgba_layer(image: Image.Image, alpha: Image.Image) -> Image.Image:
    pixels = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    alpha_pixels = np.asarray(alpha, dtype=np.uint8)
    pixels[:, :, 3] = alpha_pixels
    pixels[alpha_pixels == 0, :3] = 0
    return Image.fromarray(pixels, mode="RGBA")


def antialiased_mask(size: tuple[int, int], draw_fn, scale: int = 4) -> Image.Image:
    width, height = size
    mask = Image.new("L", (width * scale, height * scale), 0)
    draw = ImageDraw.Draw(mask)

    def scaled_box(box):
        return tuple(round(value * scale) for value in box)

    draw_fn(draw, scaled_box, scale)
    return mask.resize(size, Image.Resampling.LANCZOS)


def make_room_and_table(clean: Image.Image) -> tuple[Image.Image, Image.Image]:
    width, height = clean.size
    room_alpha = Image.new("L", clean.size, 0)
    room_alpha.paste(255, (0, 0, width, TABLE_SPLIT_Y))
    table_alpha = ImageChops.invert(room_alpha)
    return rgba_layer(clean, room_alpha), rgba_layer(clean, table_alpha)


def make_pedestal_mask(size: tuple[int, int]) -> Image.Image:
    def draw_pedestal(draw: ImageDraw.ImageDraw, box, scale: int) -> None:
        draw.ellipse(box((333, 1138, 609, 1221)), fill=255)
        draw.rounded_rectangle(box((323, 1172, 620, 1284)), radius=44 * scale, fill=255)
        draw.polygon(
            [
                (326 * scale, 1202 * scale),
                (616 * scale, 1202 * scale),
                (637 * scale, 1292 * scale),
                (666 * scale, 1314 * scale),
                (658 * scale, 1360 * scale),
                (286 * scale, 1360 * scale),
                (277 * scale, 1314 * scale),
                (306 * scale, 1292 * scale),
            ],
            fill=255,
        )
        draw.ellipse(box((277, 1261, 667, 1367)), fill=255)
        draw.rounded_rectangle(box((303, 1324, 642, 1380)), radius=17 * scale, fill=255)
        draw.ellipse(box((292, 1340, 357, 1394)), fill=255)
        draw.ellipse(box((585, 1340, 650, 1394)), fill=255)

    mask = antialiased_mask(size, draw_pedestal)
    return mask.filter(ImageFilter.GaussianBlur(0.45))


def make_sphere_masks(source: Image.Image) -> tuple[Image.Image, Image.Image, Image.Image]:
    width, height = source.size
    outer = antialiased_mask(
        source.size,
        lambda draw, box, _scale: draw.ellipse(box(SPHERE_BOUNDS), fill=255),
    )

    inner_binary = Image.new("L", source.size, 0)
    ImageDraw.Draw(inner_binary).ellipse(SPHERE_INNER_BOUNDS, fill=255)

    luminance = np.asarray(source.convert("L"), dtype=np.uint8)
    y, x = np.ogrid[:height, :width]
    outer_array = np.asarray(outer, dtype=np.uint8) > 8
    highlight_zones = (
        ((y < 793) & (y > 715) & (x > 276) & (x < 666))
        | ((x < 361) & (x > 275) & (y > 805) & (y < 1084))
        | ((x > 617) & (x < 702) & (y > 805) & (y < 1122))
        | ((y > 1094) & (y < 1188) & (x > 300) & (x < 655))
    )
    reflection_array = outer_array & highlight_zones & (luminance > 83)
    reflection = Image.fromarray((reflection_array * 255).astype(np.uint8), mode="L")

    inner_array = np.asarray(inner_binary, dtype=np.uint8)
    outer_array_u8 = np.asarray(outer, dtype=np.uint8)
    reflection_u8 = np.asarray(reflection, dtype=np.uint8)

    inner_alpha = np.where(reflection_u8 > 0, 0, inner_array).astype(np.uint8)
    shell_alpha = np.where(
        (inner_array > 0) | (reflection_u8 > 0),
        0,
        outer_array_u8,
    ).astype(np.uint8)

    return (
        Image.fromarray(inner_alpha, mode="L"),
        Image.fromarray(shell_alpha, mode="L"),
        reflection,
    )


def white_alpha_layer(alpha: Image.Image) -> Image.Image:
    white = Image.new("RGBA", alpha.size, (255, 255, 255, 0))
    white.putalpha(alpha)
    return white


def make_smoke_masks(source: Image.Image, inner_mask: Image.Image) -> tuple[Image.Image, Image.Image]:
    rgb = np.asarray(source.convert("RGB"), dtype=np.float32)
    maximum = rgb.max(axis=2)
    minimum = rgb.min(axis=2)
    luminance = rgb.mean(axis=2)
    low_saturation = 1 - np.clip((maximum - minimum) / np.maximum(maximum, 1), 0, 1)

    inner = np.asarray(inner_mask, dtype=np.float32) / 255
    inner_smoke = np.clip((luminance - 35) / 95, 0, 1) * (0.46 + low_saturation * 0.54) * inner
    inner_smoke_alpha = Image.fromarray((inner_smoke * 210).astype(np.uint8), mode="L")
    inner_smoke_alpha = inner_smoke_alpha.filter(ImageFilter.GaussianBlur(2.4))

    height, width = luminance.shape
    y, x = np.ogrid[:height, :width]
    outer_zone = (
        ((x < 266) & (y > 690) & (y < 1210))
        | ((x > 682) & (x < 934) & (y > 710) & (y < 1175))
    )
    outer_smoke = np.clip((luminance - 18) / 78, 0, 1) * low_saturation * outer_zone
    outer_smoke_alpha = Image.fromarray((outer_smoke * 145).astype(np.uint8), mode="L")
    outer_smoke_alpha = outer_smoke_alpha.filter(ImageFilter.GaussianBlur(7.5))

    return white_alpha_layer(inner_smoke_alpha), white_alpha_layer(outer_smoke_alpha)


def make_candle_light_mask(size: tuple[int, int]) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((-125, 835, 285, 1335), fill=185)
    draw.ellipse((665, 790, 1045, 1290), fill=178)
    mask = mask.filter(ImageFilter.GaussianBlur(72))
    return white_alpha_layer(mask)


def save_layers() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGBA")
    clean = Image.open(CLEAN_PLATE).convert("RGBA").resize(source.size, Image.Resampling.LANCZOS)

    room, table = make_room_and_table(clean)
    pedestal_mask = make_pedestal_mask(source.size)
    inner_alpha, shell_alpha, reflection_alpha = make_sphere_masks(source)
    inner_smoke, outer_smoke = make_smoke_masks(source, white_alpha_layer(inner_alpha).getchannel("A"))

    layers = {
        "room-background.png": room,
        "table-foreground.png": table,
        "pedestal.png": rgba_layer(source, pedestal_mask),
        "sphere-inner.png": rgba_layer(source, inner_alpha),
        "sphere-shell.png": rgba_layer(source, shell_alpha),
        "sphere-reflections.png": rgba_layer(source, reflection_alpha),
        "sphere-inner-mask.png": white_alpha_layer(inner_alpha.filter(ImageFilter.GaussianBlur(1.2))),
        "smoke-mask-inner.png": inner_smoke,
        "smoke-mask-outer.png": outer_smoke,
        "candle-light-mask.png": make_candle_light_mask(source.size),
    }

    for name, image in layers.items():
        image.save(OUTPUT / name, optimize=True)

    preview = Image.new("RGBA", source.size, (6, 9, 13, 255))
    for name in (
        "room-background.png",
        "table-foreground.png",
        "pedestal.png",
        "sphere-inner.png",
        "sphere-shell.png",
        "sphere-reflections.png",
    ):
        preview.alpha_composite(layers[name])
    preview.convert("RGB").save(OUTPUT / "static-layered-preview.png", optimize=True)

    difference = ImageChops.difference(source.convert("RGB"), preview.convert("RGB"))
    mean_difference = sum(ImageStat.Stat(difference).mean) / 3
    print(f"Created {len(layers)} production layers at {source.size[0]}x{source.size[1]}")
    print(f"Static composite mean absolute RGB difference: {mean_difference:.2f}/255")


if __name__ == "__main__":
    save_layers()
