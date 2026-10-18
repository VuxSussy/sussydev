# Ambient music

The two loops in `public/audio/` were composed in **FL Studio 2025** through the FL Studio MCP server
(notes written to the piano roll, FLEX synth shaped through plugin parameters) and rendered with
*File → Export → Wave file* (pattern mode, **Wrap remainder** so each loop is seamless).

| File | Length | What it is |
| --- | --- | --- |
| `tech.mp3` | 4 bars at 130 BPM (7.38 s) | A–F–C–G 16th-note arpeggio on a bright FLEX pluck (ping-pong delay, short reverb), a bass root per bar, soft off-beat 808 hi-hats. Plays in the studio. |
| `countryside.mp3` | 8 bars at 130 BPM (14.77 s) | D–G/D–Bm7–Asus slow pad on FLEX (long attack, vibrato, big reverb) with a sparse D-pentatonic top line, plus a wind bed. Plays on the road and at the sunset. |

The wind bed is not from FL Studio: it is filtered pink and brown noise with slow tremolo, layered over the
FL render with ffmpeg (tremolo rates are whole cycles per loop, so the wind loops seamlessly too).
The note data is in `tech.notes.json` and `countryside.notes.json` (times and durations in quarter notes).

Rebuild the MP3s from the FL renders (`tech-raw.flac`, `countryside-raw.flac`; decode them to WAV first):

```sh
D=14.769229
ffmpeg -i countryside-raw.wav \
  -f lavfi -i "anoisesrc=color=pink:amplitude=0.6:duration=$D:sample_rate=44100" \
  -f lavfi -i "anoisesrc=color=brown:amplitude=0.8:duration=$D:sample_rate=44100:seed=7" \
  -filter_complex "[1]highpass=f=250,lowpass=f=1400,tremolo=f=0.13542:d=0.7,volume=0.22,aformat=channel_layouts=stereo[w1];[2]lowpass=f=500,tremolo=f=0.20313:d=0.5,volume=0.35,aformat=channel_layouts=stereo[w2];[0][w1][w2]amix=inputs=3:normalize=0,alimiter=limit=0.89" \
  countryside-mix.wav
for n in tech countryside-mix; do
  ffmpeg -i $n.wav -af "loudnorm=I=-20:TP=-2:LRA=11" -ar 44100 -c:a libmp3lame -b:a 112k ${n%-mix}.mp3
done
```
