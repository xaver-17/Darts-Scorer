"""Erzeugt den Dartscheiben-Hintergrund (SVG als data-URI) nach src/boardbg.txt."""
import math, urllib.parse, os
here = os.path.dirname(os.path.abspath(__file__))
o = []
for i in range(20):
    a = math.radians(i * 18 - 9)
    o.append(f'<line x1="{16*math.sin(a):.1f}" y1="{-16*math.cos(a):.1f}" x2="{170*math.sin(a):.1f}" y2="{-170*math.cos(a):.1f}"/>')
for r in [6.35, 16, 99, 107, 162, 170]:
    o.append(f'<circle r="{r}"/>')
def seg(i):
    a1, a2 = math.radians(i * 18 - 9), math.radians(i * 18 + 9)
    return (f'<path d="M{170*math.sin(a1):.1f} {-170*math.cos(a1):.1f}A170 170 0 0 1 {170*math.sin(a2):.1f} {-170*math.cos(a2):.1f}'
            f'L{162*math.sin(a2):.1f} {-162*math.cos(a2):.1f}A162 162 0 0 0 {162*math.sin(a1):.1f} {-162*math.cos(a1):.1f}Z"/>')
rings = ''.join(seg(i) for i in range(0, 20, 2))
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-180 -180 360 360"><g fill="#ec4899" fill-opacity=".10">{rings}</g>'
       f'<g fill="none" stroke="#fff" stroke-opacity=".07" stroke-width=".8">{"".join(o)}</g></svg>')
open(os.path.join(here, '..', 'src', 'boardbg.txt'), 'w').write('data:image/svg+xml,' + urllib.parse.quote(svg))
print('src/boardbg.txt geschrieben')
