import fitz  # PyMuPDF
import os

def extract_text_from_pdf(pdf_path, max_pages=20):
    """ extracts text from the first max_pages of a PDF file. """
    text = ""
    try:
        doc = fitz.open(pdf_path)
        num_pages = min(len(doc), max_pages)
        for i in range(num_pages):
            page = doc.load_page(i)
            text += page.get_text()
        doc.close()
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
    return text

def extract_text_from_docx(docx_path):
    """ extracts text from a Word (.docx) file. """
    try:
        doc = docx.Document(docx_path)
        full_text = []
        for para in doc.paragraphs:
            full_text.append(para.text)
        return "\n".join(full_text)
    except Exception as e:
        print(f"Error extracting text from DOCX: {e}")
        return ""

def extract_text_from_image(image_path):
    """ Logic for OCR if needed, but Gemini handles images directly. """
    return image_path
