#!/usr/bin/env bash
# Makes the small demo clips used by the starter feed (assets/videos).
# They are abstract animations made by ffmpeg, so there are no copyright issues.
set -e
cd "$(dirname "$0")/../assets/videos"
S=540x960; D=6; R=24
enc() { ffmpeg -y -loglevel error -f lavfi -i "$1" -t $D -r $R -vf "$2,format=yuv420p" -c:v libx264 -profile:v main -preset slow -crf 30 -movflags +faststart -an "$3"; }
enc "gradients=s=$S:c0=0x1a0b3d:c1=0xff3d7f:c2=0x7c3aed:n=3:speed=0.02:type=radial" "noise=alls=8:allf=t" hero.mp4
enc "gradients=s=$S:c0=0x02040f:c1=0xb4472a:c2=0xf59e0b:n=3:speed=0.015:type=linear" "noise=alls=10:allf=t" mars.mp4
enc "gradients=s=$S:c0=0x08213f:c1=0xe11d48:c2=0xfef3c7:n=3:speed=0.025:type=circular" "noise=alls=6:allf=t" christmas.mp4
enc "mandelbrot=s=$S:rate=$R:end_scale=0.02" "hue=h=t*20" fantasy.mp4
enc "gradients=s=$S:c0=0x001219:c1=0x0a9396:c2=0x94d2bd:c3=0x005f73:n=4:speed=0.02:type=spiral" "noise=alls=6:allf=t" ocean.mp4
enc "life=s=270x480:mold=10:r=$R:ratio=0.1:death_color=#1e1b4b:life_color=#a78bfa:mold_color=#ff3d7f" "scale=$S:flags=neighbor" city.mp4
ls -la
