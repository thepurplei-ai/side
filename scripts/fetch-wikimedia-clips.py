# Downloads free-licensed clips from Wikimedia Commons and converts them to 720x1280 phone clips.
# Usage: python3 scripts/fetch-wikimedia-clips.py <work-folder-with-wm/candidates.json> assets/real assets/real-posters
# Note: Wikimedia asks automated tools to send a User-Agent with contact details, or it blocks them.
import json, sys, urllib.request, urllib.parse, time, subprocess, os, re
S = sys.argv[1]; OUTV = sys.argv[2]; OUTP = sys.argv[3]
cand = json.load(open(f"{S}/wm/candidates.json"))
PICKS = [  # key, topic, title contains
  ("waterfall","waterfall","Cascade de Syratu"),
  ("fireworks","fireworks","Naperville"),
  ("mountains","snow mountains","Rocky Mountains"),
  ("cat","cat playing","Cat Play 03"),
  ("northern","aurora borealis","Iceland"),
  ("dunes","desert dunes","Dune du Pilat"),
  ("jellyfish","jellyfish","Monterey Bay Aquarium 11"),
  ("horses","horses running","Horses running"),
  ("clouds","clouds timelapse","seloncourt"),
  ("train","train","Aerial drone chase"),
  ("campfire","campfire","Fire"),
]
UA = {"User-Agent": "side-app-demo/1.0 (demo content)"}
def api(params):
    q = urllib.parse.urlencode({"format":"json", **params})
    for a in range(4):
        try: return json.load(urllib.request.urlopen(urllib.request.Request("https://commons.wikimedia.org/w/api.php?"+q, headers=UA), timeout=40))
        except Exception as e: print("wait", e); time.sleep(20*(a+1))
items = []
for key, topic, needle in PICKS:
    c = next((x for x in cand.get(topic, []) if needle in x["title"]), None)
    if c: items.append((key, c))
    else: print("missing", key)
# ocean waves 06 (CC0) found in the first search
d = api({"action":"query","titles":"File:Ocean surface waves 06.ogv","prop":"imageinfo|videoinfo","iiprop":"url|size|extmetadata","viprop":"derivatives"})
p = list(d["query"]["pages"].values())[0]; ii = p["imageinfo"][0]
src = next((dv["src"] for dv in (p.get("videoinfo") or [{}])[0].get("derivatives", []) if dv.get("src","").endswith(".webm") and ("720p" in dv["src"] or "1080p" in dv["src"])), None) or ii.get("url")
if src: items.append(("waves", {"title":p["title"],"license":"CC0","artist":re.sub(r"<[^>]+>","",ii["extmetadata"].get("Artist",{}).get("value","Unknown")).strip()[:60],"duration":float(ii.get("duration") or 6.4),"w":ii["width"],"h":ii["height"],"src":src,"page":ii["descriptionurl"]}))
credits = {}
os.makedirs(f"{S}/wm/raw", exist_ok=True)
for key, c in items:
    raw = f"{S}/wm/raw/{key}.webm"
    if os.path.exists(f"{OUTV}/{key}.mp4"):
        print("have", key); credits[key] = {"title": c["title"].replace("File:",""), "author": c["artist"] or "Unknown", "license": c["license"], "source": c["page"]}; continue
    if os.path.exists(raw) and subprocess.run(["ffprobe","-v","error",raw]).returncode != 0:
        os.remove(raw)
    if not os.path.exists(raw):
        for a in range(4):
            try:
                data = urllib.request.urlopen(urllib.request.Request(c["src"], headers=UA), timeout=120).read()
                open(raw, "wb").write(data)
                break
            except Exception as e:
                print("retry", key, e); time.sleep(60*(a+1))
        time.sleep(60)
    if not os.path.exists(raw):
        print("skip", key); continue
    dur = c["duration"]; start = max(0, min(dur/2 - 4, dur - 8.5))
    w, h = c["w"], c["h"]
    vf = "crop='if(gt(iw/ih,9/16),ih*9/16,iw)':'if(gt(iw/ih,9/16),ih,iw*16/9)',scale=720:1280:flags=lanczos,eq=saturation=1.05,format=yuv420p"
    r = subprocess.run(["ffmpeg","-y","-loglevel","error","-ss",str(start),"-i",raw,"-t","8","-vf",vf,"-r","30","-c:v","libx264","-profile:v","high","-preset","slow","-crf","25","-maxrate","1600k","-bufsize","3200k","-movflags","+faststart","-an",f"{OUTV}/{key}.mp4"])
    if r.returncode != 0:
        print("skip (bad file)", key); continue
    subprocess.run(["ffmpeg","-y","-loglevel","error","-ss","2","-i",f"{OUTV}/{key}.mp4","-frames:v","1","-vf","scale=540:960","-q:v","3",f"{OUTP}/{key}.jpg"], check=True)
    credits[key] = {"title": c["title"].replace("File:",""), "author": c["artist"] or "Unknown", "license": c["license"], "source": c["page"]}
    print("ok", key, c["license"], c["artist"][:30])
json.dump(credits, open(f"{OUTV}/credits.json","w"), indent=1, ensure_ascii=False)
