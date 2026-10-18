# Site audio

All of it is off until the visitor turns sound on (see `components/story/scene/ambience.ts`).

## Music: `public/audio/ambient.mp3`

**"Slowburn – Relaxing LoFi Background Music Loopable"** by [JoelFazhari](https://pixabay.com/users/joelfazhari/)
on Pixabay (track 206624), used under the [Pixabay Content License](https://pixabay.com/service/license-summary/).
No attribution is required; it is credited anyway.

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

Once Sussy is through the studio door the music eases down to 60% (`OUTSIDE_MUSIC` in `ambience.ts`).

## Countryside wind: `public/audio/countryside-wind.mp3`

Made in **FL Studio 2025** through the FL Studio MCP server: 8 bars at 130 BPM of sparse E-minor-pentatonic wind
chimes on the FLEX synth shaped into a soft bell-like pluck (no sustain, 50% reverb, 30% ping-pong delay), rendered
with *File → Export → Wave file* and *Wrap remainder* so it loops. The render is kept here as `wind-chimes-raw.flac`.
It fades in with the studio → sunset mix.

The breeze under the wind chimes is generated with ffmpeg (low-passed pink and brown noise, tremolo at whole cycles
per loop so it loops cleanly):

```sh
L=14.769229
ffmpeg -i wind-chimes-raw.wav \
  -f lavfi -i "anoisesrc=color=pink:amplitude=0.6:duration=$L:sample_rate=44100" \
  -f lavfi -i "anoisesrc=color=brown:amplitude=0.8:duration=$L:sample_rate=44100:seed=7" \
  -filter_complex "[1]highpass=f=200,lowpass=f=1100,tremolo=f=0.13542:d=0.7,volume=0.2,aformat=channel_layouts=stereo[w1];[2]lowpass=f=450,tremolo=f=0.20313:d=0.6,volume=0.35,aformat=channel_layouts=stereo[w2];[0]volume=0.8[c];[c][w1][w2]amix=inputs=3:normalize=0,alimiter=limit=0.89,loudnorm=I=-24:TP=-3:LRA=11" \
  -b:a 96k ../../public/audio/countryside-wind.mp3
```
