# -*- coding: utf-8 -*-
"""hwpx 양식(첨부1/첨부2)의 표 구조·색·선 두께를 그대로 재현하는 문서 틀.

원본 hwpx에서 읽어낸 사양:
  머리말 표  3칸(15.1% / 1.9% / 82.9%) - 테두리 #3E57A5 0.4mm, 배경 #DEEAFF
  본문 표    2칸(29.1% / 70.9%)
    팀명/구성원 라벨  배경 #D9D9D9, 검정 0.15mm
    ( * 필수항목)     좌우 테두리 없음, 위아래만
    항목 제목 행      배경 #E5E5E5, 검정 0.12mm
    항목 내용 행      흰 배경, 검정 0.12mm
표 전체 너비 44790 HWPUNIT = 158mm -> A4(210mm)에서 좌우 여백 26mm.
"""
import io
import os
import re
import sys

CSS = """
@page { size: A4; margin: 20mm 26mm; }
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: "Malgun Gothic", "\353\247\221\354\235\200 \352\263\240\353\224\225", sans-serif;
  font-size: 10pt;
  line-height: 1.6;
  color: #000;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ---- 머리말 표 ---- */
table.head { width: 100%; border-collapse: collapse; margin: 0 0 6mm; }
table.head td { padding: 1.8mm 2mm; vertical-align: middle; }
td.h-tag {
  border: 0.4mm solid #3E57A5; background: #DEEAFF;
  text-align: center; font-weight: 700; font-size: 11pt;
}
td.h-gap { border-left: 0.4mm solid #3E57A5; border-right: 0.4mm solid #3E57A5; }
td.h-title {
  border: 0.4mm solid #3E57A5; background: #DEEAFF;
  text-align: center; font-weight: 800; font-size: 14pt; letter-spacing: -.02em;
}

/* ---- 본문 표 ---- */
table.form { width: 100%; border-collapse: collapse; }
table.form > tbody > tr { page-break-inside: auto; }
td.lbl {
  border: 0.15mm solid #000; background: #D9D9D9;
  text-align: center; font-weight: 700; padding: 2mm;
}
td.val { border: 0.15mm solid #000; padding: 2mm 3mm; }
td.req {
  border: none; border-top: 0.15mm solid #000; border-bottom: 0.12mm solid #000;
  text-align: right; padding: 1.5mm 1mm; font-size: 9.5pt;
}
td.sec {
  border: 0.12mm solid #000; background: #E5E5E5;
  font-weight: 700; font-size: 11pt; padding: 2mm 3mm;
}
td.cell { border: 0.12mm solid #000; padding: 3mm 3.5mm 3.5mm; }

/* ---- 내용 칸 안의 본문 ---- */
td.cell > :first-child { margin-top: 0; }
td.cell > :last-child { margin-bottom: 0; }
td.cell h3 {
  font-size: 10.5pt; font-weight: 700; margin: 5mm 0 1.8mm;
  padding-left: 2mm; border-left: 1.2mm solid #3E57A5;
  page-break-after: avoid;
}
td.cell h4 {
  font-size: 10pt; font-weight: 700; margin: 4mm 0 1.5mm;
  page-break-after: avoid;
}
td.cell p { margin: 0 0 2.2mm; }
td.cell ul, td.cell ol { margin: 0 0 2.8mm; padding-left: 6mm; }
td.cell ul.sub, td.cell ol.sub { margin: 1mm 0 2.8mm 4mm; }
td.cell li { margin-bottom: 1mm; }
td.cell hr { display: none; }
td.cell blockquote {
  margin: 0 0 3mm; padding: 2mm 3mm;
  background: #F4F4F4; border-left: 1mm solid #808080;
  font-size: 9.5pt;
}
td.cell pre {
  font-family: Consolas, monospace; font-size: 9pt; line-height: 1.45;
  background: #F4F4F4; border: 0.12mm solid #B0B0B0;
  padding: 2.5mm 3mm; margin: 0 0 3mm;
  white-space: pre-wrap; page-break-inside: avoid;
}
td.cell code {
  font-family: Consolas, monospace; font-size: 9pt;
  background: #F0F0F0; padding: 0 .8mm;
}
table.md {
  width: 100%; border-collapse: collapse; margin: 0 0 3mm;
  font-size: 9pt; page-break-inside: auto;
}
table.md tr { page-break-inside: avoid; }
table.md th, table.md td {
  border: 0.12mm solid #808080; padding: 1.5mm 2mm;
  vertical-align: top; line-height: 1.45;
}
table.md th { background: #F0F0F0; font-weight: 700; }
a { color: #000; text-decoration: underline; word-break: break-all; }
strong { font-weight: 700; }
"""

PAGE = """<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"><title>{title}</title>
<style>{css}</style></head><body>
<table class="head">
<colgroup><col style="width:15.1%"><col style="width:1.9%"><col style="width:83%"></colgroup>
<tbody><tr>
<td class="h-tag">{tag}</td><td class="h-gap"></td><td class="h-title">{title}</td>
</tr></tbody></table>

<table class="form">
<colgroup><col style="width:29.1%"><col style="width:70.9%"></colgroup>
<tbody>
{rows}
</tbody></table>
</body></html>"""

ROW_RE = re.compile(r"^\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|\s*$")


def build(md, tag, title, convert, inline):
    md = re.sub(r"^#\s+.*\n", "", md, count=1)  # 표지 제목은 머리말 표가 대신한다
    lines = md.replace("\r\n", "\n").split("\n")

    # 앞머리 표에서 팀명/구성원만 뽑는다 (양식이 그 두 줄만 갖는다)
    meta = {}
    i = 0
    while i < len(lines) and not lines[i].startswith("## "):
        m = ROW_RE.match(lines[i])
        if m and m.group(1) in ("팀명", "구성원 성명"):
            meta[m.group(1)] = inline(m.group(2))
        i += 1

    # 항목 단위로 자른다
    sections = []
    cur, buf = None, []
    for ln in lines[i:]:
        if ln.startswith("## "):
            if cur is not None:
                sections.append((cur, buf))
            cur, buf = ln[3:].strip(), []
        elif cur is not None:
            buf.append(ln)
    if cur is not None:
        sections.append((cur, buf))

    rows = []
    for label in ("팀명", "구성원 성명"):
        rows.append(
            '<tr><td class="lbl">%s</td><td class="val">%s</td></tr>'
            % (label, meta.get(label, ""))
        )
    rows.append('<tr><td class="req" colspan="2">( * 필수항목)</td></tr>')
    for heading, body in sections:
        # 칸 자체가 구분선이므로 본문 안의 가로줄은 뺀다
        text = "\n".join(l for l in body if not re.fullmatch(r"-{3,}", l.strip()))
        rows.append('<tr><td class="sec" colspan="2">%s</td></tr>' % inline(heading))
        rows.append('<tr><td class="cell" colspan="2">%s</td></tr>' % convert(text))

    return PAGE.format(css=CSS, tag=tag, title=title, rows="\n".join(rows))


def main():
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from md2html import convert, inline

    src, dst, tag, title = sys.argv[1:5]
    md = io.open(src, encoding="utf-8").read()
    io.open(dst, "w", encoding="utf-8").write(build(md, tag, title, convert, inline))
    print("wrote", dst)


if __name__ == "__main__":
    main()
