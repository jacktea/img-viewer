#include <libraw/libraw.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

static char g_raw_err[256];

static void set_raw_err(const char *msg) {
  if (msg == nullptr) {
    g_raw_err[0] = '\0';
    return;
  }
  snprintf(g_raw_err, sizeof(g_raw_err), "%s", msg);
}

extern "C" const char *jt_raw_last_error(void) { return g_raw_err; }

extern "C" void jt_raw_free(void *ptr) { free(ptr); }

static uint8_t downsample16(uint16_t v) {
  return static_cast<uint8_t>((v + 128) / 257);
}

static uint16_t upsample8(uint8_t v) {
  return static_cast<uint16_t>(v) * 257u;
}

extern "C" int jt_raw_decode_rgba(const char *path, uint8_t **out_rgba, int *out_w,
                                  int *out_h) {
  if (!path || !out_rgba || !out_w || !out_h) {
    set_raw_err("invalid argument");
    return -1;
  }

  *out_rgba = nullptr;
  *out_w = 0;
  *out_h = 0;

  LibRaw raw;
  int ret = raw.open_file(path);
  if (ret != LIBRAW_SUCCESS) {
    set_raw_err(libraw_strerror(ret));
    return -2;
  }

  ret = raw.unpack();
  if (ret != LIBRAW_SUCCESS) {
    set_raw_err(libraw_strerror(ret));
    raw.recycle();
    return -3;
  }

  ret = raw.dcraw_process();
  if (ret != LIBRAW_SUCCESS) {
    set_raw_err(libraw_strerror(ret));
    raw.recycle();
    return -4;
  }

  libraw_processed_image_t *img = raw.dcraw_make_mem_image(&ret);
  if (!img || ret != LIBRAW_SUCCESS) {
    set_raw_err(libraw_strerror(ret));
    raw.recycle();
    return -5;
  }

  if (img->type != LIBRAW_IMAGE_BITMAP || img->width <= 0 || img->height <= 0) {
    LibRaw::dcraw_clear_mem(img);
    raw.recycle();
    set_raw_err("unsupported LibRaw output type");
    return -6;
  }

  const int width = img->width;
  const int height = img->height;
  const int colors = img->colors;
  const int bits = img->bits;
  const size_t pixel_count = static_cast<size_t>(width) * static_cast<size_t>(height);

  uint8_t *rgba = static_cast<uint8_t *>(malloc(pixel_count * 4));
  if (!rgba) {
    LibRaw::dcraw_clear_mem(img);
    raw.recycle();
    set_raw_err("alloc output failed");
    return -7;
  }

  if (bits == 8) {
    const uint8_t *src = reinterpret_cast<const uint8_t *>(img->data);
    for (size_t i = 0; i < pixel_count; i++) {
      const size_t s = i * static_cast<size_t>(colors);
      const size_t d = i * 4;
      const uint8_t r = src[s + 0];
      const uint8_t g = src[s + (colors > 1 ? 1 : 0)];
      const uint8_t b = src[s + (colors > 2 ? 2 : 0)];
      const uint8_t a = static_cast<uint8_t>(colors > 3 ? src[s + 3] : 255);
      rgba[d + 0] = r;
      rgba[d + 1] = g;
      rgba[d + 2] = b;
      rgba[d + 3] = a;
    }
  } else if (bits == 16) {
    const uint16_t *src = reinterpret_cast<const uint16_t *>(img->data);
    for (size_t i = 0; i < pixel_count; i++) {
      const size_t s = i * static_cast<size_t>(colors);
      const size_t d = i * 4;
      const uint8_t r = downsample16(src[s + 0]);
      const uint8_t g = downsample16(src[s + (colors > 1 ? 1 : 0)]);
      const uint8_t b = downsample16(src[s + (colors > 2 ? 2 : 0)]);
      const uint8_t a =
          static_cast<uint8_t>(colors > 3 ? downsample16(src[s + 3]) : 255);
      rgba[d + 0] = r;
      rgba[d + 1] = g;
      rgba[d + 2] = b;
      rgba[d + 3] = a;
    }
  } else {
    free(rgba);
    LibRaw::dcraw_clear_mem(img);
    raw.recycle();
    set_raw_err("unsupported bit depth");
    return -8;
  }

  LibRaw::dcraw_clear_mem(img);
  raw.recycle();

  *out_rgba = rgba;
  *out_w = width;
  *out_h = height;
  set_raw_err(nullptr);
  return 0;
}

extern "C" int jt_raw_decode_rgba16(const char *path, uint16_t **out_rgba,
                                    int *out_w, int *out_h,
                                    int *out_bit_depth) {
  if (!path || !out_rgba || !out_w || !out_h || !out_bit_depth) {
    set_raw_err("invalid argument");
    return -1;
  }

  *out_rgba = nullptr;
  *out_w = 0;
  *out_h = 0;
  *out_bit_depth = 0;

  LibRaw raw;
  int ret = raw.open_file(path);
  if (ret != LIBRAW_SUCCESS) {
    set_raw_err(libraw_strerror(ret));
    return -2;
  }

  ret = raw.unpack();
  if (ret != LIBRAW_SUCCESS) {
    set_raw_err(libraw_strerror(ret));
    raw.recycle();
    return -3;
  }

  ret = raw.dcraw_process();
  if (ret != LIBRAW_SUCCESS) {
    set_raw_err(libraw_strerror(ret));
    raw.recycle();
    return -4;
  }

  libraw_processed_image_t *img = raw.dcraw_make_mem_image(&ret);
  if (!img || ret != LIBRAW_SUCCESS) {
    set_raw_err(libraw_strerror(ret));
    raw.recycle();
    return -5;
  }

  if (img->type != LIBRAW_IMAGE_BITMAP || img->width <= 0 || img->height <= 0) {
    LibRaw::dcraw_clear_mem(img);
    raw.recycle();
    set_raw_err("unsupported LibRaw output type");
    return -6;
  }

  const int width = img->width;
  const int height = img->height;
  const int colors = img->colors;
  const int bits = img->bits;
  const size_t pixel_count = static_cast<size_t>(width) * static_cast<size_t>(height);

  uint16_t *rgba =
      static_cast<uint16_t *>(malloc(pixel_count * 4 * sizeof(uint16_t)));
  if (!rgba) {
    LibRaw::dcraw_clear_mem(img);
    raw.recycle();
    set_raw_err("alloc output failed");
    return -7;
  }

  if (bits == 8) {
    const uint8_t *src = reinterpret_cast<const uint8_t *>(img->data);
    for (size_t i = 0; i < pixel_count; i++) {
      const size_t s = i * static_cast<size_t>(colors);
      const size_t d = i * 4;
      const uint8_t r = src[s + 0];
      const uint8_t g = src[s + (colors > 1 ? 1 : 0)];
      const uint8_t b = src[s + (colors > 2 ? 2 : 0)];
      const uint8_t a = static_cast<uint8_t>(colors > 3 ? src[s + 3] : 255);
      rgba[d + 0] = upsample8(r);
      rgba[d + 1] = upsample8(g);
      rgba[d + 2] = upsample8(b);
      rgba[d + 3] = upsample8(a);
    }
  } else if (bits == 16) {
    const uint16_t *src = reinterpret_cast<const uint16_t *>(img->data);
    for (size_t i = 0; i < pixel_count; i++) {
      const size_t s = i * static_cast<size_t>(colors);
      const size_t d = i * 4;
      const uint16_t r = src[s + 0];
      const uint16_t g = src[s + (colors > 1 ? 1 : 0)];
      const uint16_t b = src[s + (colors > 2 ? 2 : 0)];
      const uint16_t a = static_cast<uint16_t>(colors > 3 ? src[s + 3] : 65535);
      rgba[d + 0] = r;
      rgba[d + 1] = g;
      rgba[d + 2] = b;
      rgba[d + 3] = a;
    }
  } else {
    free(rgba);
    LibRaw::dcraw_clear_mem(img);
    raw.recycle();
    set_raw_err("unsupported bit depth");
    return -8;
  }

  LibRaw::dcraw_clear_mem(img);
  raw.recycle();

  *out_rgba = rgba;
  *out_w = width;
  *out_h = height;
  *out_bit_depth = bits;
  set_raw_err(nullptr);
  return 0;
}
