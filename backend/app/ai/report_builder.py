"""
SceneSolver — Professional PDF Forensic Report Builder (ReportLab)
Produces a fully formatted, paginated A4 report with:
  - Branded cover page
  - Metadata summary cards
  - Annotated scene image
  - Evidence table with risk-weighted bar indicators
  - AI narrative, timeline, recommendations
  - Investigator notes
  - Legal disclaimer footer on every page
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

# ── Brand palette ─────────────────────────────────────────────────────────────
NAV   = (0.06, 0.13, 0.28)   # #0F2147  deep navy
BLUE  = (0.10, 0.40, 0.72)   # #1A66B8  accent blue
LGREY = (0.96, 0.97, 0.99)   # #F5F7FC  light panel bg
MGREY = (0.85, 0.87, 0.91)   # #D9DDE8  border grey
DGREY = (0.25, 0.27, 0.32)   # #404452  body text

RISK_CLR = {
    "low":      (0.08, 0.60, 0.33),   # green
    "medium":   (0.93, 0.57, 0.06),   # amber
    "high":     (0.83, 0.18, 0.18),   # red
    "critical": (0.50, 0.10, 0.60),   # purple
}
RISK_LABEL = {"low": "LOW", "medium": "MEDIUM", "high": "HIGH", "critical": "CRITICAL"}

EVIDENCE_WEIGHTS = {
    "Gun": 25, "Blood": 20, "Knife": 18, "Suspicious Object": 15,
    "Broken Glass": 10, "Mask": 8, "Gloves": 8, "Vehicle": 5,
    "Mobile Phone": 3, "Bag": 3, "Person": 2,
}


# ── Page template with running header/footer ──────────────────────────────────

def _make_doc(output_path: str, case_id: str):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate
    from reportlab.lib import colors

    W, H = A4
    ML = MR = 18 * mm
    MT = 22 * mm
    MB = 22 * mm

    def _header_footer(canvas, doc):
        canvas.saveState()
        # Top rule + brand
        canvas.setFillColorRGB(*NAV)
        canvas.rect(ML, H - 14*mm, W - ML - MR, 8*mm, fill=1, stroke=0)
        canvas.setFillColorRGB(1, 1, 1)
        canvas.setFont("Helvetica-Bold", 8)
        canvas.drawString(ML + 3*mm, H - 9.5*mm, "SCENESOLVER  ·  FORENSIC INVESTIGATION REPORT")
        canvas.setFont("Helvetica", 8)
        canvas.drawRightString(W - MR - 3*mm, H - 9.5*mm, f"Case: {case_id}")
        # Bottom rule + page number
        canvas.setFillColorRGB(*MGREY)
        canvas.rect(ML, MB - 7*mm, W - ML - MR, 0.4*mm, fill=1, stroke=0)
        canvas.setFillColorRGB(*DGREY)
        canvas.setFont("Helvetica", 7.5)
        canvas.drawString(ML, MB - 12*mm,
            "CONFIDENTIAL — AI-assisted analysis. Not a legal determination.")
        canvas.drawRightString(W - MR, MB - 12*mm, f"Page {doc.page}")
        canvas.restoreState()

    frame = Frame(ML, MB, W - ML - MR, H - MT - MB, id="body")
    pt = PageTemplate(id="main", frames=[frame], onPage=_header_footer)
    doc = BaseDocTemplate(
        output_path, pagesize=A4,
        leftMargin=ML, rightMargin=MR, topMargin=MT, bottomMargin=MB,
    )
    doc.addPageTemplates([pt])
    return doc


# ── Style helpers ─────────────────────────────────────────────────────────────

def _styles():
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
    from reportlab.lib import colors

    def c(rgb): return colors.Color(*rgb)

    return {
        "cover_title": ParagraphStyle("ct", fontSize=28, fontName="Helvetica-Bold",
            textColor=c(NAV), spaceAfter=6, leading=32),
        "cover_sub":   ParagraphStyle("cs", fontSize=13, fontName="Helvetica",
            textColor=c(BLUE), spaceAfter=4),
        "section":     ParagraphStyle("sec", fontSize=11, fontName="Helvetica-Bold",
            textColor=c(NAV), spaceBefore=14, spaceAfter=6,
            borderPad=4, leading=14),
        "label":       ParagraphStyle("lbl", fontSize=8, fontName="Helvetica-Bold",
            textColor=c(BLUE), spaceAfter=1, leading=10),
        "body":        ParagraphStyle("body", fontSize=9.5, fontName="Helvetica",
            textColor=c(DGREY), leading=14, spaceAfter=3, alignment=TA_JUSTIFY),
        "mono":        ParagraphStyle("mono", fontSize=8.5, fontName="Courier",
            textColor=c(DGREY), leading=13, spaceAfter=2),
        "small":       ParagraphStyle("sm", fontSize=8, fontName="Helvetica",
            textColor=colors.grey, leading=11),
        "note_author": ParagraphStyle("na", fontSize=8.5, fontName="Helvetica-Bold",
            textColor=c(NAV), spaceAfter=1),
        "disc":        ParagraphStyle("disc", fontSize=7.5, fontName="Helvetica",
            textColor=colors.grey, leading=11, alignment=TA_JUSTIFY),
    }


def _c(rgb):
    from reportlab.lib import colors
    return colors.Color(*rgb)


def _hr(color=MGREY, thickness=0.5):
    from reportlab.platypus import HRFlowable
    return HRFlowable(width="100%", thickness=thickness, color=_c(color), spaceAfter=6)


def _section_heading(text: str, S: dict):
    from reportlab.platypus import Paragraph, Table, TableStyle, Spacer
    from reportlab.lib.units import mm
    # Coloured left-border effect via a 2-col table
    bar = Table([["", Paragraph(text, S["section"])]],
                colWidths=[3*mm, None])
    bar.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), _c(BLUE)),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    return bar


# ── Cover page ────────────────────────────────────────────────────────────────

def _build_cover(case_id, investigator_name, org_name, created_at,
                 crime_type, crime_confidence, risk_score, risk_level, S):
    from reportlab.platypus import (Paragraph, Table, TableStyle, Spacer, HRFlowable)
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    story = []

    story.append(Spacer(1, 8*mm))
    story.append(Paragraph("SceneSolver", S["cover_title"]))
    story.append(Paragraph("AI-Powered Forensic Investigation Report", S["cover_sub"]))
    story.append(_hr(NAV, 2))
    story.append(Spacer(1, 6*mm))

    # 2-column meta cards
    r_clr = RISK_CLR.get(risk_level.lower(), BLUE)
    meta = [
        ["CASE ID",         case_id,
         "RISK LEVEL",      RISK_LABEL.get(risk_level.lower(), risk_level.upper())],
        ["ORGANIZATION",    org_name,
         "RISK SCORE",      f"{risk_score} / 100"],
        ["INVESTIGATOR",    investigator_name,
         "CRIME TYPE",      crime_type],
        ["DATE CREATED",    created_at.strftime("%d %B %Y"),
         "CONFIDENCE",      f"{crime_confidence:.1%}"],
        ["REPORT DATE",     datetime.now(timezone.utc).strftime("%d %B %Y  %H:%M UTC"),
         "", ""],
    ]
    col_w = [28*mm, 52*mm, 28*mm, 52*mm]
    t = Table(meta, colWidths=col_w)
    ts = TableStyle([
        ("FONTNAME",   (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME",   (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, -1), 8),
        ("TEXTCOLOR",  (0, 0), (0, -1), _c(BLUE)),
        ("TEXTCOLOR",  (2, 0), (2, -1), _c(BLUE)),
        ("BACKGROUND", (0, 0), (-1, -1), _c(LGREY)),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [_c(LGREY), colors.white]),
        ("GRID",       (0, 0), (-1, -1), 0.4, _c(MGREY)),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        # Risk level cell: colored background
        ("BACKGROUND", (3, 0), (3, 0), _c(r_clr)),
        ("TEXTCOLOR",  (3, 0), (3, 0), colors.white),
        ("FONTNAME",   (3, 0), (3, 0), "Helvetica-Bold"),
        ("FONTSIZE",   (3, 0), (3, 0), 9),
    ])
    t.setStyle(ts)
    story.append(t)
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph(
        "This document contains AI-generated forensic analysis. All findings are "
        "probabilistic and must be verified by qualified investigators before any "
        "official or legal use.", S["disc"]))
    return story


# ── Scene image section ───────────────────────────────────────────────────────

def _build_image_section(original_path, annotated_path, W_pts, S):
    from reportlab.platypus import Paragraph, Image as RLImage, Spacer, Table, TableStyle
    from reportlab.lib.units import mm
    story = []
    story.append(_section_heading("Scene Image  —  Annotated", S))

    img_path = annotated_path if (annotated_path and Path(annotated_path).exists()) \
               else original_path

    if img_path and Path(img_path).exists():
        try:
            from PIL import Image as PILImage
            with PILImage.open(img_path) as pil:
                iw, ih = pil.size
            aspect = ih / iw
            max_w = W_pts * 0.92
            max_h = 180  # points
            disp_w = min(max_w, max_h / aspect)
            disp_h = disp_w * aspect
            img = RLImage(img_path, width=disp_w, height=disp_h)
            # Center it
            wrapper = Table([[img]], colWidths=[W_pts * 0.92])
            wrapper.setStyle(TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            story.append(wrapper)
            story.append(Paragraph(
                "Figure 1 — YOLOv8 annotated scene image with detected evidence bounding boxes.",
                S["small"]))
        except Exception as e:
            story.append(Paragraph(f"[Image unavailable: {e}]", S["small"]))
    else:
        story.append(Paragraph("[No image available]", S["small"]))

    return story


# ── Evidence table ────────────────────────────────────────────────────────────

def _build_evidence_section(evidence_list: List[Dict], W_pts: float, S: dict):
    from reportlab.platypus import Paragraph, Table, TableStyle, Spacer
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    story = []
    story.append(_section_heading("Detected Evidence", S))

    if not evidence_list:
        story.append(Paragraph("No evidence objects were detected in this image.", S["body"]))
        return story

    sorted_ev = sorted(evidence_list,
                       key=lambda x: EVIDENCE_WEIGHTS.get(x["class_name"], 0), reverse=True)

    header = [["Evidence Type", "Count", "Confidence", "Risk Weight", "Contribution"]]
    rows = []
    for item in sorted_ev:
        w = EVIDENCE_WEIGHTS.get(item["class_name"], 1)
        contrib = min(100, w * item["count"])
        bar = "█" * min(20, contrib // 5) + "░" * (20 - min(20, contrib // 5))
        rows.append([
            item["class_name"],
            str(item["count"]),
            f"{item['confidence']*100:.1f}%",
            str(w),
            bar,
        ])

    col_w = [38*mm, 16*mm, 22*mm, 22*mm, W_pts - 38*mm - 16*mm - 22*mm - 22*mm - 6*mm]
    t = Table(header + rows, colWidths=col_w, repeatRows=1)
    t.setStyle(TableStyle([
        # Header
        ("BACKGROUND",  (0, 0), (-1, 0), _c(NAV)),
        ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, 0), 8),
        # Body
        ("FONTSIZE",    (0, 1), (-1, -1), 8.5),
        ("FONTNAME",    (4, 1), (4, -1), "Courier"),
        ("FONTSIZE",    (4, 1), (4, -1), 6.5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _c(LGREY)]),
        ("GRID",        (0, 0), (-1, -1), 0.3, _c(MGREY)),
        ("ALIGN",       (1, 0), (3, -1), "CENTER"),
        ("TOPPADDING",  (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t)
    return story


# ── AI narrative sections ─────────────────────────────────────────────────────

def _build_narrative(ai_summary, sequence_of_events, recommendations, S):
    from reportlab.platypus import Paragraph, Table, TableStyle, Spacer
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    story = []

    # AI Summary
    story.append(_section_heading("AI Crime Narrative Summary", S))
    story.append(Paragraph(
        ai_summary or "AI narrative not available.",
        S["body"]))

    # Sequence of events
    if sequence_of_events:
        story.append(Spacer(1, 3*mm))
        story.append(_section_heading("Probable Sequence of Events", S))
        rows = [[Paragraph(f"<b>{i}.</b>", S["body"]),
                 Paragraph(ev, S["body"])]
                for i, ev in enumerate(sequence_of_events, 1)]
        t = Table(rows, colWidths=[8*mm, None])
        t.setStyle(TableStyle([
            ("VALIGN",  (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 2),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1),
             [_c(LGREY), (1, 1, 1)]),
        ]))
        story.append(t)

    # Recommendations
    if recommendations:
        story.append(Spacer(1, 3*mm))
        story.append(_section_heading("Investigation Recommendations", S))
        for i, rec in enumerate(recommendations, 1):
            story.append(Paragraph(f"<b>▶  {i}.</b>  {rec}", S["body"]))

    return story


# ── Investigator notes ────────────────────────────────────────────────────────

def _build_notes(notes: List[Dict], S: dict):
    from reportlab.platypus import Paragraph, Table, TableStyle, Spacer
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    story = []
    story.append(_section_heading("Investigator Notes", S))

    if not notes:
        story.append(Paragraph("No investigator notes have been added.", S["body"]))
        return story

    for note in notes:
        ts = note.get("created_at", "")
        if hasattr(ts, "strftime"):
            ts = ts.strftime("%d %b %Y  %H:%M UTC")
        inner = Table([
            [Paragraph(note.get("author_name", "Investigator"), S["note_author"]),
             Paragraph(ts, S["small"])],
            [Paragraph(note.get("text", ""), S["body"]), ""],
        ], colWidths=[None, 40*mm])
        inner.setStyle(TableStyle([
            ("SPAN",    (0, 1), (-1, 1)),
            ("VALIGN",  (0, 0), (-1, -1), "TOP"),
            ("ALIGN",   (1, 0), (1, 0), "RIGHT"),
            ("BACKGROUND", (0, 0), (-1, -1), _c(LGREY)),
            ("BOX",     (0, 0), (-1, -1), 0.5, _c(BLUE)),
            ("LEFTPADDING",  (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING",   (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
        ]))
        story.append(inner)
        story.append(Spacer(1, 2*mm))

    return story


# ── Disclaimer ────────────────────────────────────────────────────────────────

def _build_disclaimer(S):
    from reportlab.platypus import Paragraph, Table, TableStyle, Spacer
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    story = []
    story.append(Spacer(1, 6*mm))
    story.append(_hr(MGREY, 0.5))
    box = Table([[Paragraph(
        "<b>Legal Disclaimer.</b>  This report is generated by SceneSolver, an AI-assisted "
        "crime scene analysis system. All findings are <b>probabilistic and advisory only</b>. "
        "This document does NOT constitute a legal conclusion, official police report, or "
        "forensic determination. All AI-generated content uses probabilistic language and "
        "MUST be verified by qualified human investigators before use in any legal, judicial, "
        "or official capacity.  "
        "SceneSolver — Phase 1  v1.0  ·  " +
        datetime.now(timezone.utc).strftime("%B %Y"),
        S["disc"])]], colWidths=[None])
    box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), _c(LGREY)),
        ("BOX",        (0, 0), (-1, -1), 0.5, _c(MGREY)),
        ("LEFTPADDING",  (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING",   (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
    ]))
    story.append(box)
    return story


# ── Public entry point ────────────────────────────────────────────────────────

def generate_report(
    output_path: str,
    case_id: str,
    investigator_name: str,
    org_name: str,
    created_at: datetime,
    crime_type: str,
    crime_confidence: float,
    risk_score: int,
    risk_level: str,
    evidence_list: List[Dict],
    ai_summary: str,
    sequence_of_events: List[str],
    recommendations: List[str],
    original_image_path: str,
    annotated_image_path: Optional[str],
    notes: List[Dict] = None,
):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.platypus import PageBreak, Spacer

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    doc = _make_doc(output_path, case_id)
    S = _styles()
    W_pts = A4[0] - 36 * mm   # usable content width

    story = []

    # ── Cover ─────────────────────────────────────────────────────────────────
    story += _build_cover(
        case_id, investigator_name, org_name, created_at,
        crime_type, crime_confidence, risk_score, risk_level, S)

    story.append(PageBreak())

    # ── Scene image ───────────────────────────────────────────────────────────
    story += _build_image_section(original_image_path, annotated_image_path, W_pts, S)
    story.append(Spacer(1, 4*mm))

    # ── Evidence table ────────────────────────────────────────────────────────
    story += _build_evidence_section(evidence_list or [], W_pts, S)
    story.append(Spacer(1, 4*mm))

    # ── AI narrative ──────────────────────────────────────────────────────────
    story += _build_narrative(ai_summary, sequence_of_events or [], recommendations or [], S)
    story.append(Spacer(1, 4*mm))

    # ── Investigator notes ────────────────────────────────────────────────────
    story += _build_notes(notes or [], S)

    # ── Disclaimer ────────────────────────────────────────────────────────────
    story += _build_disclaimer(S)

    doc.build(story)
    logger.info(f"PDF report generated: {output_path}")
