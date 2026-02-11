use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use image::{GenericImageView, ImageFormat};
use serde::Serialize;
use std::fs;
use std::io::Cursor;
use std::path::Path;

/// 原生浏览器支持的图片扩展名
const NATIVE_EXTENSIONS: &[&str] = &[
    "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "avif",
];

/// 所有支持的图片扩展名
const ALL_IMAGE_EXTENSIONS: &[&str] = &[
    "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "avif", "tiff", "tif", "heic",
    "heif", "psd", "raw", "cr2", "nef",
];

#[derive(Serialize, Clone)]
pub struct ImageFileInfo {
    pub path: String,
    pub name: String,
    pub size: u64,
}

#[derive(Serialize, Clone)]
pub struct ImageData {
    pub base64: String,
    pub mime_type: String,
    pub name: String,
    pub size: u64,
    pub converted: bool,
    pub original_format: Option<String>,
}

pub struct ImageCache {
    pub thumbnails: std::sync::Mutex<std::collections::HashMap<String, String>>,
    pub converted: std::sync::Mutex<std::collections::HashMap<String, ImageData>>,
}

/// 扫描目录下所有图片文件
#[tauri::command]
pub fn list_directory_images(file_path: String) -> Result<Vec<ImageFileInfo>, String> {
    let path = Path::new(&file_path);
    let dir = if path.is_file() {
        path.parent().ok_or("无法获取父目录")?.to_path_buf()
    } else if path.is_dir() {
        path.to_path_buf()
    } else {
        return Err(format!("路径不存在: {}", file_path));
    };

    let mut images: Vec<ImageFileInfo> = Vec::new();

    let entries = fs::read_dir(&dir).map_err(|e| format!("读取目录失败: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
        let entry_path = entry.path();

        if !entry_path.is_file() {
            continue;
        }

        if let Some(ext) = entry_path.extension().and_then(|e| e.to_str()) {
            let ext_lower = ext.to_lowercase();
            if ALL_IMAGE_EXTENSIONS.contains(&ext_lower.as_str()) {
                let metadata = entry
                    .metadata()
                    .map_err(|e| format!("读取元数据失败: {}", e))?;
                images.push(ImageFileInfo {
                    path: entry_path.to_string_lossy().to_string(),
                    name: entry_path
                        .file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string(),
                    size: metadata.len(),
                });
            }
        }
    }

    // 按文件名排序
    images.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Ok(images)
}

/// 读取图片文件，非原生格式自动转换为 PNG
#[tauri::command]
pub fn read_image_file(
    file_path: String,
    state: tauri::State<'_, ImageCache>,
) -> Result<ImageData, String> {
    // 1. 检查缓存
    {
        let cache = state.converted.lock().map_err(|_| "Lock poison error")?;
        if let Some(data) = cache.get(&file_path) {
            return Ok(data.clone());
        }
    }

    let path = Path::new(&file_path);

    if !path.exists() {
        return Err(format!("文件不存在: {}", file_path));
    }

    let name = path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    // 保存原始格式名称（大写）
    let original_fmt = if ext.is_empty() {
        None
    } else {
        Some(ext.to_uppercase())
    };

    let raw_data = fs::read(path).map_err(|e| format!("读取文件失败: {}", e))?;
    let file_size = raw_data.len() as u64;

    // 判断是否为原生支持格式
    let is_native = NATIVE_EXTENSIONS.contains(&ext.as_str());

    let result = if is_native {
        let mime = match ext.as_str() {
            "jpg" | "jpeg" => "image/jpeg",
            "png" => "image/png",
            "gif" => "image/gif",
            "webp" => "image/webp",
            "svg" => "image/svg+xml",
            "bmp" => "image/bmp",
            "ico" => "image/x-icon",
            "avif" => "image/avif",
            _ => "application/octet-stream",
        };

        let b64 = BASE64.encode(&raw_data);
        Ok(ImageData {
            base64: format!("data:{};base64,{}", mime, b64),
            mime_type: mime.to_string(),
            name,
            size: file_size,
            converted: false,
            original_format: original_fmt,
        })
    } else {
        // 非原生格式，转换为 PNG
        let img = if ext == "psd" {
            // 使用 psd crate 处理 PSD
            let psd =
                psd::Psd::from_bytes(&raw_data).map_err(|e| format!("解析 PSD 失败: {}", e))?;
            let rgba = psd.rgba();
            image::RgbaImage::from_raw(psd.width(), psd.height(), rgba)
                .ok_or("无法构建 PSD 图像数据")?
                .into()
        } else {
            // 其他格式尝试用 image crate
            image::load_from_memory(&raw_data)
                .map_err(|e| format!("解析图片失败 ({}): {}", ext, e))?
        };

        let mut png_buf = Cursor::new(Vec::new());
        img.write_to(&mut png_buf, ImageFormat::Png)
            .map_err(|e| format!("转换为 PNG 失败: {}", e))?;

        let png_data = png_buf.into_inner();
        let b64 = BASE64.encode(&png_data);

        Ok(ImageData {
            base64: format!("data:image/png;base64,{}", b64),
            mime_type: "image/png".to_string(),
            name,
            size: file_size,
            converted: true,
            original_format: original_fmt,
        })
    };

    // 2. 存入缓存 (仅当转换过或需要缓存时)
    if let Ok(ref data) = result {
        if data.converted {
            let mut cache = state.converted.lock().map_err(|_| "Lock poison error")?;
            cache.insert(file_path, data.clone());
        }
    }

    result
}

/// 读取图片缩略图 (最大边长 200px)
/// 读取图片缩略图 (最大边长 200px)
#[tauri::command]
pub fn read_image_thumbnail(
    file_path: String,
    state: tauri::State<'_, ImageCache>,
) -> Result<String, String> {
    // 1. Check cache
    {
        let cache = state.thumbnails.lock().map_err(|_| "Lock poison error")?;
        if let Some(b64) = cache.get(&file_path) {
            return Ok(b64.clone());
        }
    }

    let path = Path::new(&file_path);
    if !path.exists() {
        return Err(format!("文件不存在: {}", file_path));
    }

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let raw_data = fs::read(path).map_err(|e| format!("读取文件失败: {}", e))?;

    // 加载图片
    let img = if ext == "psd" {
        let psd = psd::Psd::from_bytes(&raw_data).map_err(|e| format!("{}", e))?;
        let rgba = psd.rgba();
        image::RgbaImage::from_raw(psd.width(), psd.height(), rgba)
            .ok_or("Invalid PSD data")?
            .into()
    } else if ext == "svg" {
        // SVG 无法直接 resize，直接返回原图（通常 SVG 不大）
        // 或者需要专用 SVG 渲染库。这里简单处理：直接返回原图 base64
        let b64 = BASE64.encode(&raw_data);
        let res = format!("data:image/svg+xml;base64,{}", b64);
        // Cache SVG too
        {
            let mut cache = state.thumbnails.lock().map_err(|_| "Lock poison error")?;
            cache.insert(file_path, res.clone());
        }
        return Ok(res);
    } else {
        image::load_from_memory(&raw_data).map_err(|e| format!("解析图片失败: {}", e))?
    };

    // 缩放
    let (w, h) = img.dimensions();
    let thumb = if w > 200 || h > 200 {
        img.resize(200, 200, image::imageops::FilterType::Nearest)
    } else {
        img
    };

    // 转换为 PNG
    let mut png_buf = Cursor::new(Vec::new());
    thumb
        .write_to(&mut png_buf, ImageFormat::Png)
        .map_err(|e| format!("Thumbnail encode failed: {}", e))?;

    let b64 = BASE64.encode(png_buf.into_inner());
    let res = format!("data:image/png;base64,{}", b64);

    // 3. Cache
    {
        let mut cache = state.thumbnails.lock().map_err(|_| "Lock poison error")?;
        cache.insert(file_path, res.clone());
    }

    Ok(res)
}

/// 保存截图
#[tauri::command]
pub fn save_screenshot(
    base64_data: String,
    save_path: String,
    format: String,
) -> Result<(), String> {
    println!("save_screenshot called: path={}, fmt={}", save_path, format);

    let data_str = if let Some(pos) = base64_data.find(',') {
        &base64_data[pos + 1..]
    } else {
        &base64_data
    };

    let raw = BASE64
        .decode(data_str)
        .map_err(|e| format!("解析 base64 失败: {}", e))?;

    let img = image::load_from_memory(&raw).map_err(|e| format!("解析图片数据失败: {}", e))?;

    let out_format = match format.to_lowercase().as_str() {
        "jpg" | "jpeg" => ImageFormat::Jpeg,
        "webp" => ImageFormat::WebP,
        "png" => ImageFormat::Png,
        _ => return Err(format!("不支持的格式: {}", format)),
    };

    let save = std::path::PathBuf::from(&save_path);
    if let Some(parent) = save.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
    }

    img.save_with_format(&save, out_format)
        .map_err(|e| format!("保存文件失败: {}", e))?;

    println!("Screenshot saved successfully");
    Ok(())
}
