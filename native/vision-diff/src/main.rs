use image::GrayImage;
use serde::Serialize;
use std::env;
use std::error::Error;

#[derive(Serialize)]
struct ChangedRegion {
    x: u32,
    y: u32,
    width: u32,
    height: u32,
    changedPixels: u32,
    normalizedChange: f64,
}

#[derive(Serialize)]
struct DiffOutput {
    diffScore: f64,
    changedRegions: Vec<ChangedRegion>,
    comparedFrames: [String; 2],
}

fn load_grayscale(path: &str) -> Result<GrayImage, Box<dyn Error>> {
    let img = image::open(path)?.to_luma8();
    Ok(img)
}

fn main() -> Result<(), Box<dyn Error>> {
    let args: Vec<String> = env::args().collect();
    if args.len() < 3 {
        eprintln!("Usage: vision-diff <previous_image> <current_image>");
        std::process::exit(2);
    }

    let previous_path = &args[1];
    let current_path = &args[2];

    let previous = load_grayscale(previous_path)?;
    let current = load_grayscale(current_path)?;

    let width = previous.width().min(current.width());
    let height = previous.height().min(current.height());
    let block: u32 = 8;
    let mut changed_regions = Vec::new();
    let mut changed_pixels_total: u64 = 0;

    for by in (0..height).step_by(block as usize) {
        for bx in (0..width).step_by(block as usize) {
            let mut block_changed: u32 = 0;
            let y_end = (by + block).min(height);
            let x_end = (bx + block).min(width);

            for y in by..y_end {
                for x in bx..x_end {
                    let p = previous.get_pixel(x, y)[0] as i16;
                    let c = current.get_pixel(x, y)[0] as i16;
                    if (p - c).abs() > 12 {
                        block_changed += 1;
                    }
                }
            }

            let block_pixels = (x_end - bx) * (y_end - by);
            if block_changed > 0 {
                changed_pixels_total += block_changed as u64;
                changed_regions.push(ChangedRegion {
                    x: bx,
                    y: by,
                    width: x_end - bx,
                    height: y_end - by,
                    changedPixels: block_changed,
                    normalizedChange: block_changed as f64 / block_pixels as f64,
                });
            }
        }
    }

    let total_pixels = (width as u64) * (height as u64);
    let diff_score = if total_pixels == 0 {
        0.0
    } else {
        changed_pixels_total as f64 / total_pixels as f64
    };

    let output = DiffOutput {
        diffScore: diff_score,
        changedRegions: changed_regions,
        comparedFrames: [previous_path.to_string(), current_path.to_string()],
    };

    println!("{}", serde_json::to_string(&output)?);
    Ok(())
}
