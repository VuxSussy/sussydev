# Ambient music

The two loops in `public/audio/` were composed in **FL Studio 2025** through the FL Studio MCP server
(notes written to the piano roll, FLEX synth shaped through plugin parameters) and rendered with
*File → Export → Wave file* (pattern mode, **Wrap remainder** so each loop is seamless).

Both loops are meant to relax: slow, half-time feel, soft attack, low filter resonance, no drums.

| File | Length | What it is |
| --- | --- | --- |
| `tech.mp3` | 8 bars at 130 BPM, half-time (14.77 s) | Fmaj7–Em7–Dm7–Cmaj7 slow broken chords on soft FLEX keys over a low root, with a ping-pong delay shimmer. Plays in the studio. |
| `countryside.mp3` | 8 bars at 130 BPM, half-time (14.77 s) | G–Em–C–D folk progression on a warm FLEX pad with a sparse G-pentatonic top line, plus a light breeze. Plays on the road and at the sunset. |

The breeze is not from FL Studio: it is quiet, low-passed pink and brown noise with slow tremolo, layered over the
FL render with ffmpeg (tremolo rates are whole cycles per loop, so it loops seamlessly too).
The note data is in `tech.notes.json` and `countryside.notes.json` (times and durations in quarter notes).

Rebuild the MP3s from the FL renders (`tech-raw.flac`, `countryside-raw.flac`; decode them to WAV first):

```sh
D=14.769229
ffmpeg -i countryside-raw.wav \
  -f lavfi -i "anoisesrc=color=pink:amplitude=0.6:duration=$D:sample_rate=44100" \
  -f lavfi -i "anoisesrc=color=brown:amplitude=0.8:duration=$D:sample_rate=44100:seed=7" \
  -filter_complex "[1]highpass=f=200,lowpass=f=900,tremolo=f=0.13542:d=0.6,volume=0.07,aformat=channel_layouts=stereo[w1];[2]lowpass=f=400,tremolo=f=0.20313:d=0.5,volume=0.12,aformat=channel_layouts=stereo[w2];[0][w1][w2]amix=inputs=3:normalize=0,alimiter=limit=0.89" \
  countryside-mix.wav
for n in tech countryside-mix; do
  ffmpeg -i $n.wav -af "lowpass=f=7000,loudnorm=I=-23:TP=-3:LRA=11" -ar 44100 -c:a libmp3lame -b:a 112k ${n%-mix}.mp3
done
```
