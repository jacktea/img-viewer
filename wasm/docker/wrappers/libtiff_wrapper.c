#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <tiffio.h>

static char g_tiff_err[256];

static void set_tiff_err(const char *msg) {
  if (msg == NULL) {
    g_tiff_err[0] = '\0';
    return;
  }
  snprintf(g_tiff_err, sizeof(g_tiff_err), "%s", msg);
}

const char *jt_tiff_last_error(void) { return g_tiff_err; }

void jt_tiff_free(void *ptr) { free(ptr); }

int jt_tiff_decode_rgba(const char *path, uint8_t **out_rgba, int *out_w,
                        int *out_h) {
  if (!path || !out_rgba || !out_w || !out_h) {
    set_tiff_err("invalid argument");
    return -1;
  }

  *out_rgba = NULL;
  *out_w = 0;
  *out_h = 0;

  TIFF *tif = TIFFOpen(path, "r");
  if (!tif) {
    set_tiff_err("TIFFOpen failed");
    return -2;
  }

  uint32_t width = 0;
  uint32_t height = 0;
  if (!TIFFGetField(tif, TIFFTAG_IMAGEWIDTH, &width) ||
      !TIFFGetField(tif, TIFFTAG_IMAGELENGTH, &height) || width == 0 ||
      height == 0) {
    TIFFClose(tif);
    set_tiff_err("failed to get width/height");
    return -3;
  }

  size_t npixels = (size_t)width * (size_t)height;
  uint32_t *raster = (uint32_t *)_TIFFmalloc(npixels * sizeof(uint32_t));
  if (!raster) {
    TIFFClose(tif);
    set_tiff_err("alloc raster failed");
    return -4;
  }

  if (!TIFFReadRGBAImageOriented(tif, width, height, raster, ORIENTATION_TOPLEFT,
                                 0)) {
    _TIFFfree(raster);
    TIFFClose(tif);
    set_tiff_err("TIFFReadRGBAImageOriented failed");
    return -5;
  }

  uint8_t *rgba = (uint8_t *)malloc(npixels * 4);
  if (!rgba) {
    _TIFFfree(raster);
    TIFFClose(tif);
    set_tiff_err("alloc output failed");
    return -6;
  }

  for (size_t i = 0; i < npixels; i++) {
    uint32_t p = raster[i];
    rgba[i * 4 + 0] = TIFFGetR(p);
    rgba[i * 4 + 1] = TIFFGetG(p);
    rgba[i * 4 + 2] = TIFFGetB(p);
    rgba[i * 4 + 3] = TIFFGetA(p);
  }

  _TIFFfree(raster);
  TIFFClose(tif);

  *out_rgba = rgba;
  *out_w = (int)width;
  *out_h = (int)height;
  set_tiff_err(NULL);
  return 0;
}

static uint16_t upsample8(uint8_t v) { return (uint16_t)v * 257u; }

int jt_tiff_decode_rgba16(const char *path, uint16_t **out_rgba, int *out_w,
                          int *out_h, int *out_bit_depth) {
  if (!path || !out_rgba || !out_w || !out_h || !out_bit_depth) {
    set_tiff_err("invalid argument");
    return -1;
  }

  *out_rgba = NULL;
  *out_w = 0;
  *out_h = 0;
  *out_bit_depth = 0;

  TIFF *tif = TIFFOpen(path, "r");
  if (!tif) {
    set_tiff_err("TIFFOpen failed");
    return -2;
  }

  uint32_t width = 0;
  uint32_t height = 0;
  uint16_t bits_per_sample = 1;
  uint16_t samples_per_pixel = 1;
  uint16_t photometric = PHOTOMETRIC_MINISBLACK;
  uint16_t planar_config = PLANARCONFIG_CONTIG;
  uint16_t orientation = ORIENTATION_TOPLEFT;

  if (!TIFFGetField(tif, TIFFTAG_IMAGEWIDTH, &width) ||
      !TIFFGetField(tif, TIFFTAG_IMAGELENGTH, &height) || width == 0 ||
      height == 0) {
    TIFFClose(tif);
    set_tiff_err("failed to get width/height");
    return -3;
  }

  TIFFGetFieldDefaulted(tif, TIFFTAG_BITSPERSAMPLE, &bits_per_sample);
  TIFFGetFieldDefaulted(tif, TIFFTAG_SAMPLESPERPIXEL, &samples_per_pixel);
  TIFFGetFieldDefaulted(tif, TIFFTAG_PHOTOMETRIC, &photometric);
  TIFFGetFieldDefaulted(tif, TIFFTAG_PLANARCONFIG, &planar_config);
  TIFFGetFieldDefaulted(tif, TIFFTAG_ORIENTATION, &orientation);

  size_t pixel_count = (size_t)width * (size_t)height;
  uint16_t *rgba =
      (uint16_t *)malloc(pixel_count * 4 * sizeof(uint16_t));
  if (!rgba) {
    TIFFClose(tif);
    set_tiff_err("alloc output failed");
    return -4;
  }

  if (bits_per_sample <= 8) {
    uint32_t *raster = (uint32_t *)_TIFFmalloc(pixel_count * sizeof(uint32_t));
    if (!raster) {
      free(rgba);
      TIFFClose(tif);
      set_tiff_err("alloc raster failed");
      return -5;
    }
    if (!TIFFReadRGBAImageOriented(tif, width, height, raster, ORIENTATION_TOPLEFT,
                                   0)) {
      _TIFFfree(raster);
      free(rgba);
      TIFFClose(tif);
      set_tiff_err("TIFFReadRGBAImageOriented failed");
      return -6;
    }
    for (size_t i = 0; i < pixel_count; i++) {
      uint32_t p = raster[i];
      rgba[i * 4 + 0] = upsample8(TIFFGetR(p));
      rgba[i * 4 + 1] = upsample8(TIFFGetG(p));
      rgba[i * 4 + 2] = upsample8(TIFFGetB(p));
      rgba[i * 4 + 3] = upsample8(TIFFGetA(p));
    }
    _TIFFfree(raster);
    *out_bit_depth = 8;
  } else if (bits_per_sample == 16 &&
             planar_config == PLANARCONFIG_CONTIG &&
             (samples_per_pixel == 1 || samples_per_pixel == 2 ||
              samples_per_pixel == 3 || samples_per_pixel == 4)) {
    tmsize_t scanline_size = TIFFScanlineSize(tif);
    if (scanline_size <= 0) {
      free(rgba);
      TIFFClose(tif);
      set_tiff_err("invalid TIFFScanlineSize");
      return -7;
    }

    uint8_t *scanline = (uint8_t *)_TIFFmalloc(scanline_size);
    if (!scanline) {
      free(rgba);
      TIFFClose(tif);
      set_tiff_err("alloc scanline failed");
      return -8;
    }

    for (uint32_t row = 0; row < height; row++) {
      if (TIFFReadScanline(tif, scanline, row, 0) != 1) {
        _TIFFfree(scanline);
        free(rgba);
        TIFFClose(tif);
        set_tiff_err("TIFFReadScanline failed");
        return -9;
      }

      uint32_t dst_row = row;
      if (orientation == ORIENTATION_BOTLEFT ||
          orientation == ORIENTATION_BOTRIGHT) {
        dst_row = height - 1 - row;
      }
      uint16_t *src = (uint16_t *)scanline;
      for (uint32_t col = 0; col < width; col++) {
        size_t s = (size_t)col * samples_per_pixel;
        size_t d = ((size_t)dst_row * (size_t)width + (size_t)col) * 4;
        if (samples_per_pixel == 1 || samples_per_pixel == 2) {
          uint16_t v = src[s + 0];
          if (photometric == PHOTOMETRIC_MINISWHITE) {
            v = (uint16_t)(65535u - v);
          }
          rgba[d + 0] = v;
          rgba[d + 1] = v;
          rgba[d + 2] = v;
          rgba[d + 3] = (samples_per_pixel == 2) ? src[s + 1] : 65535u;
        } else {
          rgba[d + 0] = src[s + 0];
          rgba[d + 1] = src[s + 1];
          rgba[d + 2] = src[s + 2];
          rgba[d + 3] = (samples_per_pixel == 4) ? src[s + 3] : 65535u;
        }
      }
    }

    _TIFFfree(scanline);
    *out_bit_depth = 16;
  } else {
    free(rgba);
    TIFFClose(tif);
    set_tiff_err("unsupported TIFF layout for 16-bit decode");
    return -10;
  }

  TIFFClose(tif);
  *out_rgba = rgba;
  *out_w = (int)width;
  *out_h = (int)height;
  set_tiff_err(NULL);
  return 0;
}
