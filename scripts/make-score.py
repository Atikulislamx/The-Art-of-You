"""Compose the original keepsake score. Needs numpy and ffmpeg on PATH (or FFMPEG)."""
from pathlib import Path
import os
import subprocess
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
RATE = 44_100
BEAT = 60 / 70
SAMPLES = round(RATE * BEAT * 4 * 16)
MASTER = np.zeros((SAMPLES, 2), dtype='float64')
VOICE = np.random.default_rng(237)
TAU = 2 * np.pi


def frequency(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def mix(wave, at, amplitude, pan):
    p = np.pi * (pan + 1) / 4
    start = round(at * BEAT * RATE) % SAMPLES
    clipped = min(len(wave), SAMPLES - start)
    tone = (wave * amplitude)[:, None] * np.array([[np.cos(p), np.sin(p)]])
    MASTER[start:start + clipped, :] += tone[:clipped, :]
    if clipped < len(wave):
        MASTER[:len(wave) - clipped, :] += tone[clipped:, :]


def piano(note, at, volume, length=2.6, pan=0):
    t = np.arange(int(RATE * length)) / RATE
    f = frequency(note)
    natural = min(1.35, max(.62, 2 ** ((62 - note) / 38)))
    env = (1 - np.exp(-143 * t)) * np.minimum(1, np.maximum(0, (length - t) / .34)) ** 2
    partials = [(1, 1, .88), (2.001, .29, 1.36), (3.006, .13, 2.6), (4.015, .068, 3.8), (5.03, .045, 5.1), (7.06, .012, 7.0)]
    waves = np.zeros(t.shape)
    for harmonic, strength, decay in partials:
        phase = VOICE.uniform(0, TAU)
        waves += strength * np.exp(-t * decay / natural) * (
            .68 * np.sin(TAU * f * harmonic * t + phase)
            + .32 * np.sin(TAU * f * harmonic * 1.0019 * t + phase * .95)
        )
    hammer = np.sin(TAU * f * 8.042 * t) * np.exp(-t * 51) * .022
    mix((waves + hammer) * env, at, volume, pan)


def strings(note, at, volume, length=4.65, pan=0):
    t = np.arange(int(RATE * length * BEAT)) / RATE
    f = frequency(note)
    angle = TAU * f * t + VOICE.uniform(0, TAU)
    wobble = .53 * np.sin(TAU * (4.38 + VOICE.uniform(-.35, .35)) * t)
    env = np.minimum(1, t / 1.06) ** 1.6 * np.minimum(1, (length * BEAT - t) / 1.5) ** 1.7
    color = .76 * np.sin(angle + wobble) + .27 * np.sin(angle * 2 + wobble * 1.3) + .11 * np.sin(angle * 3.002 - wobble)
    color += .37 * np.sin(angle * 1.0028 + .36 * np.sin(TAU * 3.8 * t))
    mix(color * env, at, volume, pan)


# D major, with descending bass, passing minor colors and a sustained return to D.
chords = [
    (50, 57, 61, 64, 66), (49, 57, 59, 64, 69), (47, 54, 57, 61, 66), (43, 55, 57, 62, 66),
    (42, 54, 57, 62, 64), (40, 55, 59, 62, 66), (43, 55, 57, 62, 71), (45, 55, 59, 64, 69),
    (50, 57, 61, 64, 69), (49, 57, 59, 64, 66), (47, 54, 57, 61, 69), (43, 55, 57, 62, 66),
    (42, 54, 57, 62, 66), (40, 55, 59, 62, 64), (43, 55, 59, 62, 67), (45, 55, 61, 64, 69),
]
melody = [
    [(1.12, 74), (2.8, 73)], [(1.45, 69)], [(1.08, 66), (2.92, 69)], [(1.48, 74), (3.23, 71)],
    [(1.29, 69), (3.06, 66)], [(1.67, 67)], [(1.17, 74), (3.05, 76)], [(1.51, 73)],
    [(1.13, 78), (3.02, 76)], [(1.48, 73), (3.01, 69)], [(1.10, 74), (3.19, 78)], [(1.55, 71)],
    [(1.15, 69), (2.85, 74)], [(1.48, 71), (3.1, 67)], [(1.28, 66), (3.05, 62)], [(1.6, 64), (3.06, 69)],
]
for bar, chord in enumerate(chords):
    at = bar * 4
    piano(chord[0], at + .07, .088 if bar % 4 == 0 else .074, 3.72, -.19)
    piano(chord[1], at + .58 + VOICE.uniform(-.04, .05), .062, 3.15, -.33)
    piano(chord[2], at + 1.92 + VOICE.uniform(-.035, .045), .056, 2.88, .26)
    piano(chord[3 if bar % 4 != 1 else 4], at + 2.52, .043, 2.4, .16)
    if bar % 2 == 0:
        piano(chord[4], at + 3.49, .029, 1.9, .32)
    for n, (pulse, pitch) in enumerate(melody[bar]):
        piano(pitch, at + pulse, (.083 if n == 0 else .065) * VOICE.uniform(.91, 1.1), 3.05, .10 + VOICE.uniform(-.13, .12))
    strings(chord[1] - 12, at + .31, .018, 4.96, -.45)
    strings(chord[3], at + .55, .012 if bar < 7 else .017, 4.65, .48)
    if bar in (3, 7, 8, 11, 14, 15):
        strings(chord[4], at + 1.10, .0085, 3.58, -.27)

# Short decorrelated room reflections, wrapped to make the loop continuous.
dry = MASTER.copy()
for i, delay in enumerate([.071, .117, .173, .233, .319, .438, .572, .735, .91, 1.23, 1.56]):
    reflected = np.roll(dry[:, ::-1] if i % 2 else dry, round(RATE * delay), axis=0)
    MASTER += reflected * (.102 * np.exp(-i * .249))
MASTER *= .64 / np.max(np.abs(MASTER))
MASTER = np.tanh(MASTER * 1.1) * .83
out = ROOT / 'assets/audio/background.mp3'
out.parent.mkdir(parents=True, exist_ok=True)
subprocess.run([
    os.environ.get('FFMPEG', 'ffmpeg'), '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'f32le', '-ar', str(RATE), '-ac', '2', '-i', 'pipe:0', '-codec:a', 'libmp3lame', '-b:a', '96k',
    '-metadata', 'title=A Year That Blooms', '-metadata', 'artist=The Art of You', str(out),
], input=MASTER.astype('<f4').tobytes(), check=True)
print(f'Wrote {out.relative_to(ROOT)} ({SAMPLES / RATE:.1f}s)')
