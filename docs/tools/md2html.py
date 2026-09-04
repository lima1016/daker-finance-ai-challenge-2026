# -*- coding: utf-8 -*-
"""공모전 제출용 마크다운 -> 인쇄용 HTML 조각 변환기.

hwpx 양식(첨부1/첨부2)의 구성을 그대로 따르도록, 문서 상단에 첨부 번호와
공식 문서명을 얹고 본문은 양식의 항목 번호 순서대로 흘려보낸다.
외부 라이브러리를 쓰지 않는다 - 이 문서들이 쓰는 마크다운 부분집합
(제목/표/목록/인용/코드/구분선)만 다루면 충분하다.
"""
import html
import re
import sys
import io
import os

# ---------------------------------------------------------------- 인라인

LINK_RE = re.compile(r"\[([^\]]+)\]\((https?://[^)\s]+)\)")
BARE_URL_RE = re.compile(r"(?<![\"=>])(https?://[^\s<)]+)")
CODE_RE = re.compile(r"`([^`]+)`")
BOLD_RE = re.compile(r"\*\*([^*]+)\*\*")


def inline(text):
    """굵게/코드/링크만 처리한다. 짝이 없는 별표(필수항목 표시 *)는 글자 그대로 둔다."""
    stash = []

    def keep(m):
        stash.append((m.group(1), m.group(2)))
        return "\x00L%d\x00" % (len(stash) - 1)

    text = LINK_RE.sub(keep, text)
    text = html.escape(text)
    text = CODE_RE.sub(lambda m: "<code>%s</code>" % m.group(1), text)
    text = BOLD_RE.sub(lambda m: "<strong>%s</strong>" % m.group(1), text)
    text = BARE_URL_RE.sub(lambda m: '<a href="%s">%s</a>' % (m.group(1), m.group(1)), text)

    for i, (label, url) in enumerate(stash):
        text = text.replace(
            "\x00L%d\x00" % i,
            '<a href="%s">%s</a>' % (html.escape(url), html.escape(label)),
        )
    return text


# ---------------------------------------------------------------- 블록

BULLET_RE = re.compile(r"^(\s*)[-*]\s+(.*)$")
ORDERED_RE = re.compile(r"^(\s*)(\d+)\.\s+(.*)$")
HEADING_RE = re.compile(r"^(#{1,4})\s+(.*)$")


def split_row(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def convert(md):
    lines = md.replace("\r\n", "\n").split("\n")
    out = []
    i = 0
    n = len(lines)

    while i < n:
        line = lines[i]
        stripped = line.strip()

        # 빈 줄
        if not stripped:
            i += 1
            continue

        # 코드 블록
        if stripped.startswith("```"):
            i += 1
            buf = []
            while i < n and not lines[i].strip().startswith("```"):
                buf.append(html.escape(lines[i]))
                i += 1
            i += 1
            out.append("<pre>%s</pre>" % "\n".join(buf))
            continue

        # 구분선
        if re.fullmatch(r"-{3,}", stripped):
            out.append("<hr>")
            i += 1
            continue

        # 제목
        m = HEADING_RE.match(stripped)
        if m:
            level = len(m.group(1))
            out.append("<h%d>%s</h%d>" % (level, inline(m.group(2)), level))
            i += 1
            continue

        # 표 - | 로 시작하고 다음 줄이 구분행이면
        if stripped.startswith("|") and i + 1 < n and re.fullmatch(
            r"\|[\s:|-]+\|", lines[i + 1].strip()
        ):
            header = split_row(stripped)
            aligns = []
            for cell in split_row(lines[i + 1].strip()):
                if cell.endswith(":") and cell.startswith(":"):
                    aligns.append("center")
                elif cell.endswith(":"):
                    aligns.append("right")
                else:
                    aligns.append("left")
            i += 2
            body = []
            while i < n and lines[i].strip().startswith("|"):
                body.append(split_row(lines[i].strip()))
                i += 1

            def cells(row, tag):
                res = []
                for idx, cell in enumerate(row):
                    align = aligns[idx] if idx < len(aligns) else "left"
                    res.append(
                        '<%s style="text-align:%s">%s</%s>' % (tag, align, inline(cell), tag)
                    )
                return "".join(res)

            table = ['<table class="md"><thead><tr>%s</tr></thead><tbody>' % cells(header, "th")]
            for row in body:
                table.append("<tr>%s</tr>" % cells(row, "td"))
            table.append("</tbody></table>")
            out.append("".join(table))
            continue

        # 인용
        if stripped.startswith(">"):
            buf = []
            while i < n and lines[i].strip().startswith(">"):
                buf.append(inline(lines[i].strip()[1:].strip()))
                i += 1
            out.append("<blockquote>%s</blockquote>" % "<br>".join(buf))
            continue

        # 목록 (들여쓴 항목은 한 단계 안으로)
        if BULLET_RE.match(line) or ORDERED_RE.match(line):
            ordered = bool(ORDERED_RE.match(line))
            indent = len(line) - len(line.lstrip())
            tag = "ol" if ordered else "ul"
            cls = ' class="sub"' if indent >= 2 else ""
            items = []
            while i < n:
                mb = BULLET_RE.match(lines[i])
                mo = ORDERED_RE.match(lines[i])
                if not (mb or mo):
                    break
                cur_indent = len(lines[i]) - len(lines[i].lstrip())
                cur_ordered = bool(mo)
                if cur_ordered != ordered or (cur_indent >= 2) != (indent >= 2):
                    break
                items.append("<li>%s</li>" % inline((mo.group(3) if mo else mb.group(2))))
                i += 1
                # 목록 항목 사이의 빈 줄 하나는 같은 목록으로 본다
                if i < n and not lines[i].strip():
                    j = i
                    while j < n and not lines[j].strip():
                        j += 1
                    if j < n and (BULLET_RE.match(lines[j]) or ORDERED_RE.match(lines[j])):
                        nxt_indent = len(lines[j]) - len(lines[j].lstrip())
                        nxt_ordered = bool(ORDERED_RE.match(lines[j]))
                        if nxt_ordered == ordered and (nxt_indent >= 2) == (indent >= 2):
                            i = j
                            continue
                    break
            out.append("<%s%s>%s</%s>" % (tag, cls, "".join(items), tag))
            continue

        # 문단
        buf = []
        while i < n and lines[i].strip() and not re.match(
            r"^\s*(#{1,4}\s|[-*]\s|\d+\.\s|\||>|```|-{3,}$)", lines[i]
        ):
            buf.append(inline(lines[i].strip()))
            i += 1
        if buf:
            out.append("<p>%s</p>" % "<br>".join(buf))
        else:
            i += 1

    return "\n".join(out)


