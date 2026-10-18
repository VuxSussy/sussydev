# Background music

`public/audio/ambient.mp3` is **"Slowburn – Relaxing LoFi Background Music Loopable"** by
[JoelFazhari](https://pixabay.com/users/joelfazhari/) on Pixabay (track 206624), used under the
[Pixabay Content License](https://pixabay.com/service/license-summary/). No attribution is required; it is credited anyway.

The original download (`joelfazhari-slowburn-relaxing-lofi-background-music-loopable-206624.mp3`) is not committed:
the license does not allow redistributing the track on its own. Drop it in this folder to rebuild.

The piece repeats every 8 bars at about 82.5 BPM (23.27 s). The loop keeps all four cycles (93.08 s) and folds the
fade-out tail back onto the start, so the `<audio loop>` restart is seamless:

```sh
L=93.08
ffmpeg -i joelfazhari-slowburn-relaxing-lofi-background-music-loopable-206624.mp3 \
  -filter_complex "[0]asplit[a][b];[a]atrim=0:$L,asetpts=N/SR/TB[h];[b]atrim=$L,asetpts=N/SR/TB[t];[h][t]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-23:TP=-3:LRA=11" \
  -ar 44100 -c:a libmp3lame -b:a 128k ../../public/audio/ambient.mp3
```
