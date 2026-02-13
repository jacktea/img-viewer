FROM emscripten/emsdk:3.1.58

RUN apt-get update && apt-get install -y --no-install-recommends \
  autoconf \
  automake \
  bzip2 \
  ca-certificates \
  cmake \
  curl \
  git \
  libtool \
  make \
  ninja-build \
  pkg-config \
  xz-utils \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /work

# Install prefix for static libs built with emscripten.
ENV WASM_PREFIX=/opt/wasm
ENV PKG_CONFIG_PATH=/opt/wasm/lib/pkgconfig
ENV CPPFLAGS=-I/opt/wasm/include
ENV LDFLAGS=-L/opt/wasm/lib
