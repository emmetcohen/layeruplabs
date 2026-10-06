#!/usr/bin/env python3
"""Developer convenience — NOT needed to run or host the site.

Reads projects.json and (re)generates:
  * assets/placeholders/*.svg   blueprint "X" boxes labelled with the exact filename + pixel size
  * assets/resume.pdf           a one-page placeholder résumé (only if it doesn't exist yet)
  * assets/favicon.svg
  * ASSETS_NEEDED.md            every placeholder: path, purpose, size, page

Run it from anywhere:   python3 tools/make_placeholders.py
Re-run after adding a project to projects.json. Placeholder SVGs only matter
until you drop the real file (same name) into assets/images/ — the site then
prefers the real file automatically.
"""
import json, math, os, re
from collections import OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PH = os.path.join(ROOT, 'assets', 'placeholders')
os.makedirs(PH, exist_ok=True)

MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"
NAVY, NAVY2, CYAN, INK, ORANGE = "#FFF1E7", "#F6E3D3", "#326080", "#1B3347", "#805232"  # paper, deeper paper, blue, ink, brown

SIZES = {  # kind -> (w, h)
    'cover': (1600, 1000), 'wire': (1600, 1000), 'gallery': (1200, 900),
    'cat': (1600, 1000), 'portrait': (800, 1000), 'portrait-wire': (800, 1000),
    'about': (800, 1000), 'missing': (1200, 900),
}


def esc(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def frame(w, h, bg, fine_grid=False):
    out = [f'<rect width="{w}" height="{h}" fill="{bg}"/>',
           '<defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse">'
           f'<path d="M40 0H0V40" fill="none" stroke="{CYAN}" stroke-opacity=".16"/></pattern>'
           '<pattern id="m" width="16" height="16" patternUnits="userSpaceOnUse">'
           f'<path d="M16 0H0V16" fill="none" stroke="{CYAN}" stroke-opacity=".22"/></pattern></defs>',
           f'<rect width="{w}" height="{h}" fill="url(#{"m" if fine_grid else "g"})"/>',
           f'<rect x="12" y="12" width="{w-24}" height="{h-24}" fill="none" stroke="{CYAN}" stroke-width="2"/>',
           f'<rect x="30" y="30" width="{w-60}" height="{h-60}" fill="none" stroke="{INK}" stroke-opacity=".35"/>']
    for x, sx in ((12, 1), (w - 12, -1)):          # crop marks
        for y, sy in ((12, 1), (h - 12, -1)):
            out.append(f'<path d="M{x-sx*30} {y}H{x+sx*0}M{x} {y-sy*30}V{y}" stroke="{CYAN}" stroke-width="3" fill="none"/>')
    return out


def cross(w, h, dash=False):
    d = ' stroke-dasharray="14 10"' if dash else ''
    return [f'<path d="M30 30L{w-30} {h-30}M{w-30} 30L30 {h-30}" stroke="{CYAN}" stroke-opacity=".55" stroke-width="2" fill="none"{d}/>']


def label(w, h, name, tag, tag_color=ORANGE, cy=None, note=None):
    fs = max(22, round(w * 0.030))
    cy = h / 2 if cy is None else cy
    bw = min(w - 120, max(len(name), len(tag) + 4, 22) * fs * 0.62 + 60)
    bh = fs * (4.4 if note else 3.6)
    top = cy - bh / 2
    out = [f'<rect x="{w/2-bw/2:.0f}" y="{top:.0f}" width="{bw:.0f}" height="{bh:.0f}" fill="{NAVY}" stroke="{CYAN}" stroke-width="2"/>',
           f'<text x="{w/2:.0f}" y="{top+fs*1.35:.0f}" text-anchor="middle" font-family="{MONO}" font-size="{fs}" font-weight="700" fill="{INK}">{esc(name)}</text>',
           f'<text x="{w/2:.0f}" y="{top+fs*2.4:.0f}" text-anchor="middle" font-family="{MONO}" font-size="{fs*0.8:.0f}" fill="{CYAN}">{w}x{h} px</text>',
           f'<text x="{w/2:.0f}" y="{top+fs*3.3:.0f}" text-anchor="middle" font-family="{MONO}" font-size="{fs*0.62:.0f}" letter-spacing="2" fill="{tag_color}">{esc(tag)}</text>']
    if note:
        out.append(f'<text x="{w/2:.0f}" y="{top+fs*4.0:.0f}" text-anchor="middle" font-family="{MONO}" font-size="{fs*0.55:.0f}" fill="{INK}" fill-opacity=".7">{esc(note)}</text>')
    return out


def corner_tags(w, h, left, right):
    fs = max(16, round(w * 0.018))
    return [f'<text x="52" y="{h-46}" font-family="{MONO}" font-size="{fs}" fill="{CYAN}" letter-spacing="2">{esc(left)}</text>',
            f'<text x="{w-52}" y="{h-46}" text-anchor="end" font-family="{MONO}" font-size="{fs}" fill="{CYAN}" letter-spacing="2">{esc(right)}</text>']


def write_svg(fname, w, h, parts):
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" '
           f'aria-label="Placeholder image {esc(fname)}, {w} by {h} pixels">' + ''.join(parts) + '</svg>\n')
    with open(os.path.join(PH, os.path.splitext(fname)[0] + '.svg'), 'w') as f:
        f.write(svg)


def make_plain(fname, kind):
    w, h = SIZES[kind]
    if kind == 'wire':
        parts = frame(w, h, NAVY, fine_grid=True) + cross(w, h, dash=True) + \
            label(w, h, fname, 'WIREFRAME STATE (shown until hover)', CYAN) + corner_tags(w, h, 'REV A', 'PLACEHOLDER')
    elif kind == 'cover':
        parts = frame(w, h, '#B5D2E6') + cross(w, h) + \
            label(w, h, fname, 'FINISHED RENDER / PHOTO (shown on hover)') + corner_tags(w, h, 'REV A', 'PLACEHOLDER')
    elif kind == 'missing':
        parts = frame(w, h, NAVY2) + cross(w, h) + label(w, h, 'image not found', 'CHECK THE PATH IN projects.json') + corner_tags(w, h, 'REV A', 'MISSING')
    else:
        parts = frame(w, h, NAVY2) + cross(w, h) + label(w, h, fname, 'PLACEHOLDER — DROP IN REAL FILE') + corner_tags(w, h, 'REV A', 'PLACEHOLDER')
    write_svg(fname, w, h, parts)


def head_pts(cx, cy, rx, ry):
    return cx, cy, rx, ry


def make_portrait(fname, wire):
    w, h = SIZES['portrait']
    cx, cy, rx, ry = 400, 400, 150, 190
    shoulders = "M110 1000C110 770 260 700 400 700C540 700 690 770 690 1000Z"
    neck = "M340 560V700H460V560"
    if wire:
        parts = frame(w, h, NAVY, fine_grid=True)
        g = [f'<g fill="none" stroke="{CYAN}" stroke-width="2">',
             f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"/>',
             f'<path d="{shoulders}"/><path d="{neck}"/>']
        for k in (.35, .7):
            g.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx*k:.0f}" ry="{ry}" stroke-opacity=".6"/>')
        for t in (-.75, -.5, -.25, 0, .25, .5, .75):
            y = cy + ry * t; hw = rx * math.sqrt(1 - t * t)
            g.append(f'<path d="M{cx-hw:.0f} {y:.0f}Q{cx} {y+18:.0f} {cx+hw:.0f} {y:.0f}" stroke-opacity=".6"/>')
        for x in range(150, 700, 60):
            g.append(f'<path d="M{x} 1000L{cx+(x-cx)*.5:.0f} 735" stroke-opacity=".35"/>')
        g.append('</g>')
        parts += g + cross(w, h, dash=True) + \
            label(w, h, fname, 'WIREFRAME STATE (default)', CYAN, cy=880, note='hover the portrait to see portrait.jpg') + \
            corner_tags(w, h, 'REV A', 'PLACEHOLDER')
    else:
        parts = frame(w, h, '#5d6b7f')
        parts += ['<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9bfa8"/><stop offset="1" stop-color="#b79478"/></linearGradient>'
                  '<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8896ab"/><stop offset="1" stop-color="#46526a"/></linearGradient></defs>',
                  f'<rect x="12" y="12" width="{w-24}" height="{h-24}" fill="url(#b)"/>',
                  f'<path d="{shoulders}" fill="#2b3d5c"/><path d="{neck}" fill="#c9a98f"/>',
                  f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="url(#s)"/>',
                  f'<path d="M250 340C250 220 330 190 400 190C470 190 550 220 550 340C520 280 470 260 400 260C330 260 280 280 250 340Z" fill="#3a2a22"/>']
        parts += frame(w, h, 'none')[3:]  # borders + crop marks only
        parts += cross(w, h) + label(w, h, fname, 'REAL PHOTO STATE (shown on hover)', ORANGE, cy=880, note='replace with your photo, 800x1000') + \
            corner_tags(w, h, 'REV A', 'PLACEHOLDER')
    write_svg(fname, w, h, parts)


def make_pdf(path):
    if os.path.exists(path):
        return
    lines = ["EMMET - RESUME (PLACEHOLDER)", "", "Replace this file with your real resume.",
             "Keep the same name: assets/resume.pdf", "", "Lutz, Florida - hello@layeruplabs.com"]
    stream = "BT /F1 18 Tf 72 720 Td 24 TL " + " ".join(f"({l.replace('(', '[').replace(')', ']')}) Tj T*" for l in lines) + " ET"
    objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
            f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream", "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>"]
    out, offs = "%PDF-1.4\n", []
    for i, o in enumerate(objs, 1):
        offs.append(len(out)); out += f"{i} 0 obj\n{o}\nendobj\n"
    x = len(out)
    out += f"xref\n0 {len(objs)+1}\n0000000000 65535 f \n" + "".join(f"{o:010d} 00000 n \n" for o in offs)
    out += f"trailer\n<< /Size {len(objs)+1} /Root 1 0 R >>\nstartxref\n{x}\n%%EOF\n"
    with open(path, 'w') as f:
        f.write(out)


def make_favicon():
    with open(os.path.join(ROOT, 'assets', 'favicon.svg'), 'w') as f:
        f.write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="#FFF1E7"/>'
                '<g fill="none" stroke="#326080" stroke-width="1.8"><rect x="6" y="6" width="20" height="20" rx="1.5"/></g>'
                '<path d="M6 13h20M13 6v20" stroke="#1B3347" stroke-width="1.6"/><circle cx="20" cy="20" r="3" fill="#805232"/></svg>\n')


def main():
    data = json.load(open(os.path.join(ROOT, 'projects.json')))
    cats = {c['id']: c for c in data['categories']}
    rows = []  # (path, what, size, pages)

    def add(path, what, size, pages):
        rows.append((path, what, size, pages))

    # --- site-level images
    make_portrait('portrait.jpg', wire=False); make_portrait('portrait-wire.jpg', wire=True)
    add('assets/images/portrait.jpg', 'Your real photo (revealed on hover over the hero portrait).', '800x1000 (4:5)', 'index.html')
    add('assets/images/portrait-wire.jpg', 'OPTIONAL wireframe/line-art version of the portrait (the default state). If you skip it, the site auto-generates a cyan edge-detect "wireframe" from portrait.jpg.', '800x1000 (4:5)', 'index.html')
    make_plain('about.jpg', 'about')
    add('assets/images/about.jpg', 'Photo for the drawing title block on the About page.', '800x1000 (4:5)', 'about.html')
    make_plain('missing.jpg', 'missing')

    # --- category covers
    for c in data['categories']:
        fn = os.path.basename(c['cover'])
        make_plain(fn, 'cat')
        add(c['cover'], f"Cover for the {c['name']} department tile.", '1600x1000 (16:10)', 'work.html')

    # --- projects
    for p in data['projects']:
        feat = ', index.html (Featured work)' if p.get('featured') else ''
        tiles = f"work.html, category.html?c={p['category']}{feat}"
        fn = os.path.basename(p['cover']); make_plain(fn, 'cover')
        add(p['cover'], f"Cover / finished render — {p['title']}.", '1600x1000 (16:10)', f"project.html?p={p['id']} (hero), {tiles}")
        if p.get('wire'):
            fn = os.path.basename(p['wire']); make_plain(fn, 'wire')
            add(p['wire'], f"Wireframe / clay render — {p['title']} (shown until hover; delete the \"wire\" line in projects.json to skip).", '1600x1000 (16:10)', tiles)
        for i, g in enumerate(p.get('gallery', []), 1):
            fn = os.path.basename(g['src']); make_plain(fn, 'gallery')
            add(g['src'], f"Gallery image {i} — {p['title']}.", '1200x900 (4:3)', f"project.html?p={p['id']}")
        if p.get('model'):
            add(p['model'], f"3D model (GLB) for the orbit viewer — {p['title']}. Until it exists the page shows a \"Model coming soon\" box.", 'binary .glb, keep under ~10 MB', f"project.html?p={p['id']}")

    # --- non-image files
    add('assets/resume.pdf', 'Your real résumé (PDF). A placeholder PDF is included.', 'PDF', 'about.html, footer on every page')
    make_pdf(os.path.join(ROOT, 'assets', 'resume.pdf'))
    make_favicon()

    # --- text placeholders
    pat = re.compile(r'\[[A-Z0-9][^\]\n]*?\]')
    found = OrderedDict()
    files = sorted(f for f in os.listdir(ROOT) if f.endswith(('.html', '.json')))
    for f in files:
        txt = open(os.path.join(ROOT, f)).read()
        for m in pat.finditer(txt):
            tok = m.group(0)
            if len(tok) > 40:  # skip long prose that merely starts with a bracket
                continue
            found.setdefault(tok, OrderedDict()).setdefault(f, 0)
            found[tok][f] += 1

    # --- ASSETS_NEEDED.md
    md = ['# Assets needed', '',
          'Everything on this page is currently a **placeholder**. To replace one, drop a file with the **same name** into the same folder',
          '(or edit `projects.json` / the HTML for text). No code changes needed.', '',
          '> This file is generated by `python3 tools/make_placeholders.py` from `projects.json`. Re-run it after adding projects.', '',
          '## Files', '', '| File path | What it should be | Recommended size | Appears on |', '|---|---|---|---|']
    for path, what, size, pages in rows:
        md.append(f'| `{path}` | {what} | {size} | {pages} |')
    md += ['', '## Text placeholders', '',
           'Search the repo for `[` to find them all (they are highlighted in brown on the live site).', '',
           '| Placeholder | Files (count) |', '|---|---|']
    for tok, where in found.items():
        md.append('| `' + tok + '` | ' + ', '.join(f'`{k}` ({v})' for k, v in where.items()) + ' |')
    md += ['', '## Also still to set', '',
           '- `site.json` → `links.instagram`, `links.linkedin` (replace the `[BRACKETED]` values with real URLs).',
           '- Project dates (`"date": "[YYYY-MM]"` → e.g. `"2025-03"`).',
           '- Alt text: every `"alt": "[ALT TEXT] ..."` in `projects.json` should describe the real photo.', '']
    open(os.path.join(ROOT, 'ASSETS_NEEDED.md'), 'w').write('\n'.join(md))
    print(f'{len(rows)} asset rows, {len(os.listdir(PH))} placeholder SVGs, {len(found)} text placeholder kinds')


if __name__ == '__main__':
    main()
