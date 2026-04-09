from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
import arabic_reshaper
from bidi.algorithm import get_display
import os

def create_pdf(text, output_path, title="المستند الذكي", watermark_name="عبدالله منعم (acxo3)"):
    """
    Creates a professional PDF from text with a watermark.
    """
    # Font registration for Arabic support
    font_name = 'Helvetica' # Default
    
    # List of possible font paths (Windows and Linux)
    # prioritization: Local Professional Bold Font > Local Professional Font > System Arabic Font > Default
    font_paths = [
        "assets/fonts/Cairo-Bold.ttf",    # New Professional Bold Arabic Font
        "assets/fonts/Cairo-Regular.ttf", # New Professional Arabic Font
        "/usr/share/fonts/truetype/kacst/KacstBook.ttf", # Standard Arabic font on Ubuntu
        "/usr/share/fonts/truetype/kacst/KacstOne.ttf",  # Another standard Arabic font
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 
        "C:/Windows/Fonts/arial.ttf",     # Windows
    ]
    
    loaded_path = None
    for path in font_paths:
        if os.path.exists(path):
            try:
                pdfmetrics.registerFont(TTFont('Arabic', path))
                font_name = 'Arabic'
                loaded_path = path
                break
            except Exception as e:
                print(f"Failed to load font {path}: {e}")
                continue
    
    if loaded_path:
        print(f"Successfully loaded font for Arabic: {loaded_path}")
    else:
        print("WARNING: No Arabic-compatible font found. Falling back to Helvetica.")
    
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    styles = getSampleStyleSheet()
    
    # Custom Styles
    english_style = ParagraphStyle(
        'EnglishStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        alignment=0, # Left alignment
        textColor=colors.black
    )

    arabic_style = ParagraphStyle(
        'ArabicStyle',
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=10, # Smaller font for annotation look
        leading=14,
        alignment=0, # Match English alignment for study guide
        textColor=colors.red
    )

    def add_watermark(canvas, doc):
        canvas.saveState()
        canvas.setFont(font_name, 10)
        canvas.setStrokeColor(colors.lightgrey)
        canvas.setFillColor(colors.lightgrey)
        # Reshape watermark for RTL
        w_text = arabic_reshaper.reshape(watermark_name)
        bidi_w_text = get_display(w_text)
        
        # Estimate text width for the link rectangle (approx 6 points per char)
        text_width = len(watermark_name) * 6
        x_pos = 7.5 * inch
        y_pos = 0.5 * inch
        
        # Draw the watermark
        canvas.drawRightString(x_pos, y_pos, bidi_w_text)
        
        # Add a clickable link over the watermark area
        canvas.linkURL("https://t.me/acxo3", 
                       (x_pos - text_width, y_pos - 5, x_pos, y_pos + 15), 
                       relative=0)
        canvas.restoreState()
    
    elements = []
    
    # Add title (reshaped)
    reshaped_title = arabic_reshaper.reshape(title)
    bidi_title = get_display(reshaped_title)
    elements.append(Paragraph(f"<font name='{font_name}' size='18'>{bidi_title}</font>", styles['Title']))
    elements.append(Spacer(1, 0.3 * inch))
    
    # Process text into paragraphs with Bilingual Pairing
    lines = text.split('\n')
    current_en = None
    
    for line in lines:
        line = line.strip()
        if not line:
            if current_en: # Flush if orphaned
                elements.append(Paragraph(current_en, english_style))
                current_en = None
            elements.append(Spacer(1, 0.1 * inch))
            continue

        if line.startswith("[EN]"):
            if current_en: # Flush previous if new EN starts
                elements.append(Paragraph(current_en, english_style))
                elements.append(Spacer(1, 0.1 * inch))
            current_en = line.replace("[EN]", "").strip()
            
        elif line.startswith("[AR]"):
            ar_content = line.replace("[AR]", "").strip()
            # Reshape and handle Bidi (RTL)
            reshaped_ar = arabic_reshaper.reshape(ar_content)
            bidi_ar = get_display(reshaped_ar)
            
            if current_en:
                # We have a Pair! Use a Table to keep them together
                en_p = Paragraph(current_en, english_style)
                ar_p = Paragraph(bidi_ar, arabic_style)
                
                # Table with 1 column, 2 rows
                t = Table([[en_p], [ar_p]], colWidths=[6.5 * inch])
                t.setStyle(TableStyle([
                    ('LEFTPADDING', (0,0), (-1,-1), 0),
                    ('RIGHTPADDING', (0,0), (-1,-1), 0),
                    ('TOPPADDING', (0,0), (-1,-1), 1),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 1),
                    ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                    ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ]))
                elements.append(t)
                elements.append(Spacer(1, 0.15 * inch))
                current_en = None # Reset
            else:
                # Orphaned AR
                elements.append(Paragraph(bidi_ar, arabic_style))
                elements.append(Spacer(1, 0.1 * inch))
        else:
            # Fallback for untagged lines
            if current_en:
                elements.append(Paragraph(current_en, english_style))
                current_en = None
                
            reshaped_text = arabic_reshaper.reshape(line)
            bidi_text = get_display(reshaped_text)
            elements.append(Paragraph(bidi_text, arabic_style))
            elements.append(Spacer(1, 0.1 * inch))
    
    # Final flush
    if current_en:
        elements.append(Paragraph(current_en, english_style))

            
    doc.build(elements, onFirstPage=add_watermark, onLaterPages=add_watermark)
    return output_path
