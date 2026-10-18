# Ambient music

The two loops in `public/audio/` are chill lofi with a countryside lean, composed in **FL Studio 2025** through the
FL Studio MCP server (notes written to the piano roll, the FLEX synth shaped through plugin parameters, 808 drums on
the step sequencer) and rendered with *File → Export → Wave file* (pattern mode, **Wrap remainder**).

Reference listening for the direction (ideas only, nothing sampled or copied): the official *Claude FM — music for
thinking and building* stream (soft, minimal lofi for focus) and YouTube "country lofi" mixes (acoustic-guitar
strums, slow hip-hop beat, golden-hour porch mood, warm vinyl texture).

| File | Length | What it is |
| --- | --- | --- |
| `tech.mp3` | 8 bars at 130 BPM, half-time (14.77 s) | Fmaj7–Em7–Dm7–Cmaj7 slow broken chords on soft FLEX keys, a quiet lofi beat and vinyl crackle. Plays in the studio. |
| `countryside.mp3` | 8 bars at 130 BPM, half-time (14.77 s) | G–Em–C–D strummed open-guitar voicings on a FLEX pluck, the same quiet beat, vinyl crackle and a light breeze. Plays on the road and at the sunset. |

Sources in this folder: `tech-raw.flac`, `countryside-raw.flac` (instrument renders), `drums-raw.flac` (the drum
stem, rendered alone so its level could be set in the mix) and the note data in `*.notes.json` (quarter notes).

The vinyl crackle and the breeze are not from FL Studio: they are generated with ffmpeg (random clicks plus
filtered hiss; low-passed pink and brown noise with tremolo at whole cycles per loop), so every layer loops cleanly.

Rebuild (decode the FLACs to WAV first, `L=14.769229`):

```sh
ffmpeg -f lavfi -i "aevalsrc='if(lt(random(0),0.00035),(random(1)*2-1)*0.6,0)|if(lt(random(2),0.00035),(random(3)*2-1)*0.6,0)':s=44100:d=$L" \
  -f lavfi -i "anoisesrc=color=pink:amplitude=0.02:duration=$L:sample_rate=44100:seed=3" \
  -filter_complex "[0]highpass=f=900,lowpass=f=6000[c];[1]highpass=f=1500,lowpass=f=5000,aformat=channel_layouts=stereo[h];[c][h]amix=inputs=2:normalize=0" crackle.wav
ffmpeg -f lavfi -i "anoisesrc=color=pink:amplitude=0.6:duration=$L:sample_rate=44100" \
  -f lavfi -i "anoisesrc=color=brown:amplitude=0.8:duration=$L:sample_rate=44100:seed=7" \
  -filter_complex "[0]highpass=f=200,lowpass=f=900,tremolo=f=0.13542:d=0.6,volume=0.07,aformat=channel_layouts=stereo[w1];[1]lowpass=f=400,tremolo=f=0.20313:d=0.5,volume=0.12,aformat=channel_layouts=stereo[w2];[w1][w2]amix=inputs=2:normalize=0" breeze.wav
MIX="lowpass=f=5500,alimiter=limit=0.89,loudnorm=I=-23:TP=-3:LRA=11"
ffmpeg -i tech-raw.wav -i drums-raw.wav -i crackle.wav \
  -filter_complex "[1]volume=0.4[d];[2]volume=0.3[c];[0][d][c]amix=inputs=3:normalize=0:duration=first,$MIX" -b:a 112k tech.mp3
ffmpeg -i countryside-raw.wav -i drums-raw.wav -i crackle.wav -i breeze.wav \
  -filter_complex "[1]volume=0.4[d];[2]volume=0.3[c];[0][d][c][3]amix=inputs=4:normalize=0:duration=first,$MIX" -b:a 112k countryside.mp3
```
