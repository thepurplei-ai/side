#!/usr/bin/env bash
# Makes the demo clips (assets/videos) and their cover pictures (assets/posters).
# They are abstract animations made by ffmpeg, so there are no copyright issues.
# 720x1280, with a soft vignette and film grain so they look like cinema footage.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
V="$ROOT/assets/videos"; P="$ROOT/assets/posters"
mkdir -p "$V" "$P"
S=720x1280; D=6; R=30
LOOK="vignette=PI/4.5,noise=alls=5:allf=t,eq=saturation=1.15:contrast=1.05"
enc() {
  ffmpeg -y -loglevel error -f lavfi -i "$1" -t $D -r $R -vf "$2,$LOOK,format=yuv420p" \
    -c:v libx264 -profile:v high -preset slow -tune animation -crf 24 -maxrate 1600k -bufsize 3200k -movflags +faststart -an "$V/$3.mp4"
  ffmpeg -y -loglevel error -ss 2 -i "$V/$3.mp4" -frames:v 1 -vf scale=540:960 -q:v 3 "$P/$3.jpg"
}
enc "gradients=s=$S:c0=0x1a0b3d:c1=0xff3d7f:c2=0x7c3aed:c3=0x22d3ee:n=4:speed=0.012:type=radial" "zoompan=z='1.0+0.0008*on':d=1:s=$S:fps=$R" hero
enc "gradients=s=$S:c0=0x0b0614:c1=0xb4472a:c2=0xf59e0b:c3=0x5b1d0e:n=4:speed=0.01:type=linear" "zoompan=z='1.0+0.0008*on':d=1:s=$S:fps=$R" mars
enc "gradients=s=$S:c0=0x0b1a3a:c1=0xe11d48:c2=0xfef3c7:c3=0x14532d:n=4:speed=0.015:type=circular" "zoompan=z='1.0+0.0008*on':d=1:s=$S:fps=$R" christmas
enc "mandelbrot=s=$S:rate=$R:end_scale=0.02:inner=convergence" "hue=h=t*15:s=1.1" fantasy
enc "gradients=s=$S:c0=0x001219:c1=0x0a9396:c2=0x94d2bd:c3=0x005f73:n=4:speed=0.012:type=spiral" "zoompan=z='1.0+0.0008*on':d=1:s=$S:fps=$R" ocean
enc "life=s=360x640:mold=10:r=$R:ratio=0.1:death_color=#1a0f2e:life_color=#e6f46a:mold_color=#4b2f8a" "scale=$S:flags=bicubic,gblur=sigma=1.2" city
enc "gradients=s=$S:c0=0x02101a:c1=0x10b981:c2=0x7c3aed:c3=0x0ea5e9:n=4:speed=0.01:type=linear" "zoompan=z='1.0+0.0008*on':d=1:s=$S:fps=$R" aurora
enc "gradients=s=$S:c0=0x3b1d0a:c1=0xf97316:c2=0xfde68a:c3=0x7c2d12:n=4:speed=0.008:type=radial" "zoompan=z='1.0+0.0008*on':d=1:s=$S:fps=$R" desert
enc "cellauto=s=360x640:rule=110:r=$R:random_fill_ratio=0.5" "scale=$S:flags=neighbor,format=rgb24,lutrgb=r='val*0.55+20':g='val*0.35+10':b='val*0.95+30',gblur=sigma=0.8" neon
enc "gradients=s=$S:c0=0x052e16:c1=0x15803d:c2=0xa3e635:c3=0x14532d:n=4:speed=0.01:type=spiral" "zoompan=z='1.0+0.0008*on':d=1:s=$S:fps=$R" forest
ls -la "$V" "$P"
