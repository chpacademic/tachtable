from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def register_font() -> str:
    candidates = [
        os.getenv("THAI_FONT_PATH", ""),
        "assets/fonts/THSarabunNew.ttf",
        "C:/Windows/Fonts/THSarabun.ttf",
        "C:/Windows/Fonts/tahoma.ttf",
        "C:/Windows/Fonts/LeelawUI.ttf",
    ]
    fallback = "Helvetica"

    for font_path in candidates:
        if font_path and Path(font_path).exists():
            pdfmetrics.registerFont(TTFont("ThaiSchool", font_path))
            return "ThaiSchool"

    return fallback


def build_styles(font_name: str) -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "title",
            parent=base["Heading1"],
            fontName=font_name,
            fontSize=20,
            leading=24,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#153b78"),
            spaceAfter=8,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["BodyText"],
            fontName=font_name,
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#1f2937"),
        ),
        "meta": ParagraphStyle(
            "meta",
            parent=base["BodyText"],
            fontName=font_name,
            fontSize=11,
            leading=14,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#475569"),
        ),
    }


def normalize_cell(value: Any) -> str:
    if isinstance(value, list):
        return "\n----------------\n".join(str(item) for item in value)
    return str(value)


def build_timetable_table(payload: dict[str, Any], font_name: str) -> Table:
    head = ["คาบ", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"]
    rows = [head]

    for period, row in enumerate(payload["matrix"], start=1):
        rows.append([f"คาบ {period}", *[normalize_cell(item) for item in row]])

    table = Table(rows, colWidths=[24 * mm, 47 * mm, 47 * mm, 47 * mm, 47 * mm, 47 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#123d7a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, -1), font_name),
                ("FONTSIZE", (0, 0), (-1, -1), 11),
                ("LEADING", (0, 0), (-1, -1), 14),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cdd7e4")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (-1, 0), "CENTER"),
                ("ALIGN", (0, 1), (0, -1), "CENTER"),
                ("BACKGROUND", (0, 1), (0, -1), colors.HexColor("#eef3fb")),
                ("ROWBACKGROUNDS", (1, 1), (-1, -1), [colors.white, colors.HexColor("#f8fbff")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def build_signature_block(font_name: str, signatories: list[dict[str, str]] | None) -> Table:
    signatories = signatories or [
        {"title": "ผู้บริหารสถานศึกษา", "name": "........................................"},
        {"title": "ฝ่ายบริหารวิชาการ", "name": "........................................"},
        {"title": "ครูผู้สอน", "name": "........................................"},
    ]
    normalized = signatories[:3]
    while len(normalized) < 3:
        normalized.append({"title": "", "name": "........................................"})

    data = [
        ["ลงชื่อ ____________________", "ลงชื่อ ____________________", "ลงชื่อ ____________________"],
        [f"({normalized[0]['name']})", f"({normalized[1]['name']})", f"({normalized[2]['name']})"],
        [normalized[0]["title"], normalized[1]["title"], normalized[2]["title"]],
    ]
    table = Table(data, colWidths=[82 * mm, 82 * mm, 82 * mm])
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), font_name),
                ("FONTSIZE", (0, 0), (-1, -1), 12),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def generate_timetable_pdf(payload: dict[str, Any], output_path: str) -> None:
    font_name = register_font()
    styles = build_styles(font_name)
    doc = SimpleDocTemplate(
        output_path,
        pagesize=landscape(A4),
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=14 * mm,
        bottomMargin=12 * mm,
    )

    story = []

    logo_path = payload.get("logo_path")
    if logo_path and Path(logo_path).exists():
        story.append(Image(logo_path, width=18 * mm, height=18 * mm))
        story.append(Spacer(1, 4 * mm))

    story.append(Paragraph(payload["school_name"], styles["title"]))
    story.append(Paragraph(payload["report_title"], styles["meta"]))
    story.append(Spacer(1, 4 * mm))
    story.append(
        Paragraph(
            f'ระดับ {payload["education_level"]} | รายการ {payload["section_name"]} | ภาคเรียน {payload["term"]} | ปีการศึกษา {payload["academic_year"]}',
            styles["meta"],
        )
    )
    story.append(Spacer(1, 6 * mm))
    story.append(build_timetable_table(payload, font_name))
    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph(f'วันที่พิมพ์เอกสาร: {payload["printed_at"]}', styles["body"]))
    story.append(Spacer(1, 12 * mm))
    story.append(build_signature_block(font_name, payload.get("signatories")))

    doc.build(story)


def main() -> None:
    if len(sys.argv) == 3:
        with open(sys.argv[1], "r", encoding="utf-8") as source:
            payload = json.load(source)
        generate_timetable_pdf(payload, sys.argv[2])
        return

    sample_payload = {
        "school_name": "โรงเรียนตัวอย่างวิทยา",
        "report_title": "ตารางเรียนประจำภาคเรียนที่ 1 ปีการศึกษา 2569",
        "education_level": "ประถมศึกษา",
        "section_name": "ป.5/1",
        "term": "1",
        "academic_year": "2569",
        "printed_at": "17 เมษายน 2569",
        "matrix": [
            ["คณิตศาสตร์", "ภาษาไทย", "วิทยาศาสตร์", "สังคมศึกษา", "ภาษาอังกฤษ"],
            ["วิทยาศาสตร์", "คณิตศาสตร์", "ภาษาไทย", "ศิลปะ", "สุขศึกษา"],
            ["ภาษาไทย", "คณิตศาสตร์", "คอมพิวเตอร์", "สังคมศึกษา", "แนะแนว"],
            ["ภาษาอังกฤษ", "สังคมศึกษา", "คณิตศาสตร์", "กิจกรรม", "ศิลปะ"],
            ["สังคมศึกษา", "ภาษาอังกฤษ", "ดนตรี", "สุขศึกษา", "กิจกรรม"],
            ["โฮมรูม", "อ่านเสริม", "กิจกรรม", "วิทยาศาสตร์", "ภาษาไทย"],
        ],
    }
    generate_timetable_pdf(sample_payload, "output_timetable.pdf")


if __name__ == "__main__":
    main()
