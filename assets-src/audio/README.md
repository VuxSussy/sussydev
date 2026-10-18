# Site audio

Sound is on by default and starts at the visitor's first click, tap or key press (browsers block audio before a
gesture); turning it off is remembered. See `components/story/scene/ambience.ts`.

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

## Countryside breeze: `public/audio/countryside-wind.mp3`

A soft breeze that fades in with the studio → sunset mix: low-passed pink and brown noise with slow tremolo (whole
cycles per loop, so it loops cleanly), generated with ffmpeg. Earlier versions layered FL Studio wind chimes on top;
they were removed because they sounded like pops at the tree.

```sh
L=14.769229
ffmpeg -f lavfi -i "anoisesrc=color=pink:amplitude=0.6:duration=$L:sample_rate=44100" \
  -f lavfi -i "anoisesrc=color=brown:amplitude=0.8:duration=$L:sample_rate=44100:seed=7" \
  -filter_complex "[0]highpass=f=200,lowpass=f=1100,tremolo=f=0.13542:d=0.7,volume=0.2,aformat=channel_layouts=stereo[w1];[1]lowpass=f=450,tremolo=f=0.20313:d=0.6,volume=0.35,aformat=channel_layouts=stereo[w2];[w1][w2]amix=inputs=2:normalize=0,alimiter=limit=0.89,loudnorm=I=-28:TP=-6:LRA=11" \
  -b:a 96k ../../public/audio/countryside-wind.mp3
```
