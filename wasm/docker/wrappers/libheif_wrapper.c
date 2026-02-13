#include <libheif/heif.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef __cplusplus
extern "C" {
#endif

static char g_heif_err[256];

static void set_heif_err(const char *msg) {
  if (msg == NULL) {
    g_heif_err[0] = '\0';
    return;
  }
  snprintf(g_heif_err, sizeof(g_heif_err), "%s", msg);
}

const char *jt_heif_last_error(void) { return g_heif_err; }

void jt_heif_free(void *ptr) { free(ptr); }

static int decode_from_ctx_rgba8(struct heif_context *ctx, uint8_t **out_rgba,
                                 int *out_w, int *out_h) {
  if (!ctx || !out_rgba || !out_w || !out_h) {
    set_heif_err("invalid argument");
    return -1;
  }

  *out_rgba = NULL;
  *out_w = 0;
  *out_h = 0;

  struct heif_image_handle *handle = NULL;
  struct heif_error err = heif_context_get_primary_image_handle(ctx, &handle);
  if (err.code != heif_error_Ok || !handle) {
    set_heif_err(err.message ? err.message : "heif_context_get_primary_image_handle failed");
    return -2;
  }

  int width = heif_image_handle_get_width(handle);
  int height = heif_image_handle_get_height(handle);
  if (width <= 0 || height <= 0) {
    heif_image_handle_release(handle);
    set_heif_err("invalid image dimensions");
    return -3;
  }

  struct heif_image *img = NULL;
  err = heif_decode_image(handle, &img, heif_colorspace_RGB,
                          heif_chroma_interleaved_RGBA, NULL);
  if (err.code != heif_error_Ok || !img) {
    set_heif_err(err.message ? err.message : "heif_decode_image failed");
    heif_image_handle_release(handle);
    return -4;
  }

  int stride = 0;
  const uint8_t *plane =
      heif_image_get_plane_readonly(img, heif_channel_interleaved, &stride);
  if (!plane || stride <= 0) {
    set_heif_err("heif_image_get_plane_readonly failed");
    heif_image_release(img);
    heif_image_handle_release(handle);
    return -5;
  }

  size_t out_size = (size_t)width * (size_t)height * 4;
  uint8_t *rgba = (uint8_t *)malloc(out_size);
  if (!rgba) {
    set_heif_err("alloc output failed");
    heif_image_release(img);
    heif_image_handle_release(handle);
    return -6;
  }

  for (int y = 0; y < height; y++) {
    memcpy(rgba + (size_t)y * (size_t)width * 4,
           plane + (size_t)y * (size_t)stride, (size_t)width * 4);
  }

  heif_image_release(img);
  heif_image_handle_release(handle);

  *out_rgba = rgba;
  *out_w = width;
  *out_h = height;
  set_heif_err(NULL);
  return 0;
}

static int decode_from_ctx_rgba16(struct heif_context *ctx, uint16_t **out_rgba,
                                  int *out_w, int *out_h,
                                  int *out_bit_depth) {
  if (!ctx || !out_rgba || !out_w || !out_h || !out_bit_depth) {
    set_heif_err("invalid argument");
    return -1;
  }

  *out_rgba = NULL;
  *out_w = 0;
  *out_h = 0;
  *out_bit_depth = 0;

  struct heif_image_handle *handle = NULL;
  struct heif_error err = heif_context_get_primary_image_handle(ctx, &handle);
  if (err.code != heif_error_Ok || !handle) {
    set_heif_err(err.message ? err.message : "heif_context_get_primary_image_handle failed");
    return -2;
  }

  int width = heif_image_handle_get_width(handle);
  int height = heif_image_handle_get_height(handle);
  if (width <= 0 || height <= 0) {
    heif_image_handle_release(handle);
    set_heif_err("invalid image dimensions");
    return -3;
  }

  struct heif_image *img = NULL;
  err = heif_decode_image(handle, &img, heif_colorspace_RGB,
                          heif_chroma_interleaved_RRGGBBAA_LE, NULL);
  if (err.code != heif_error_Ok || !img) {
    set_heif_err(err.message ? err.message : "heif_decode_image(16bit) failed");
    heif_image_handle_release(handle);
    return -4;
  }

  int stride = 0;
  const uint8_t *plane =
      heif_image_get_plane_readonly(img, heif_channel_interleaved, &stride);
  if (!plane || stride <= 0) {
    set_heif_err("heif_image_get_plane_readonly failed");
    heif_image_release(img);
    heif_image_handle_release(handle);
    return -5;
  }

  size_t out_size = (size_t)width * (size_t)height * 4 * sizeof(uint16_t);
  uint16_t *rgba = (uint16_t *)malloc(out_size);
  if (!rgba) {
    set_heif_err("alloc output failed");
    heif_image_release(img);
    heif_image_handle_release(handle);
    return -6;
  }

  for (int y = 0; y < height; y++) {
    memcpy((uint8_t *)rgba + (size_t)y * (size_t)width * 4 * sizeof(uint16_t),
           plane + (size_t)y * (size_t)stride,
           (size_t)width * 4 * sizeof(uint16_t));
  }

  int decoded_bit_depth =
      heif_image_get_bits_per_pixel_range(img, heif_channel_interleaved);
  heif_image_release(img);
  heif_image_handle_release(handle);

  *out_rgba = rgba;
  *out_w = width;
  *out_h = height;
  *out_bit_depth = decoded_bit_depth;
  if (*out_bit_depth <= 0) {
    *out_bit_depth = 16;
  }
  set_heif_err(NULL);
  return 0;
}

int jt_heif_decode_rgba(const char *path, uint8_t **out_rgba, int *out_w,
                        int *out_h) {
  if (!path) {
    set_heif_err("invalid path");
    return -10;
  }

  struct heif_context *ctx = heif_context_alloc();
  if (!ctx) {
    set_heif_err("heif_context_alloc failed");
    return -11;
  }

  struct heif_error err = heif_context_read_from_file(ctx, path, NULL);
  if (err.code != heif_error_Ok) {
    set_heif_err(err.message ? err.message : "heif_context_read_from_file failed");
    heif_context_free(ctx);
    return -12;
  }

  int rc = decode_from_ctx_rgba8(ctx, out_rgba, out_w, out_h);
  heif_context_free(ctx);
  return rc;
}

int jt_heif_decode_rgba_mem(const uint8_t *data, int size, uint8_t **out_rgba,
                            int *out_w, int *out_h) {
  if (!data || size <= 0) {
    set_heif_err("invalid input buffer");
    return -20;
  }

  struct heif_context *ctx = heif_context_alloc();
  if (!ctx) {
    set_heif_err("heif_context_alloc failed");
    return -21;
  }

  struct heif_error err = heif_context_read_from_memory_without_copy(
      ctx, data, (size_t)size, NULL);
  if (err.code != heif_error_Ok) {
    set_heif_err(err.message ? err.message : "heif_context_read_from_memory_without_copy failed");
    heif_context_free(ctx);
    return -22;
  }

  int rc = decode_from_ctx_rgba8(ctx, out_rgba, out_w, out_h);
  heif_context_free(ctx);
  return rc;
}

int jt_heif_decode_rgba16(const char *path, uint16_t **out_rgba, int *out_w,
                          int *out_h, int *out_bit_depth) {
  if (!path) {
    set_heif_err("invalid path");
    return -30;
  }

  struct heif_context *ctx = heif_context_alloc();
  if (!ctx) {
    set_heif_err("heif_context_alloc failed");
    return -31;
  }

  struct heif_error err = heif_context_read_from_file(ctx, path, NULL);
  if (err.code != heif_error_Ok) {
    set_heif_err(err.message ? err.message : "heif_context_read_from_file failed");
    heif_context_free(ctx);
    return -32;
  }

  int rc = decode_from_ctx_rgba16(ctx, out_rgba, out_w, out_h, out_bit_depth);
  heif_context_free(ctx);
  return rc;
}

int jt_heif_decode_rgba16_mem(const uint8_t *data, int size,
                              uint16_t **out_rgba, int *out_w, int *out_h,
                              int *out_bit_depth) {
  if (!data || size <= 0) {
    set_heif_err("invalid input buffer");
    return -40;
  }

  struct heif_context *ctx = heif_context_alloc();
  if (!ctx) {
    set_heif_err("heif_context_alloc failed");
    return -41;
  }

  struct heif_error err = heif_context_read_from_memory_without_copy(
      ctx, data, (size_t)size, NULL);
  if (err.code != heif_error_Ok) {
    set_heif_err(err.message ? err.message : "heif_context_read_from_memory_without_copy failed");
    heif_context_free(ctx);
    return -42;
  }

  int rc = decode_from_ctx_rgba16(ctx, out_rgba, out_w, out_h, out_bit_depth);
  heif_context_free(ctx);
  return rc;
}

#ifdef __cplusplus
}
#endif
