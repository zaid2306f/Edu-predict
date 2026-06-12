from io import BytesIO

import openpyxl
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas


class ReportService:
    def generate_pdf(self, title: str, lines: list[str]) -> bytes:
        output = BytesIO()
        pdf = canvas.Canvas(output, pagesize=letter)
        pdf.drawString(50, 760, title)
        y = 730
        for line in lines:
            pdf.drawString(50, y, line)
            y -= 18
            if y < 60:
                pdf.showPage()
                y = 760
        pdf.save()
        output.seek(0)
        return output.read()

    def generate_excel(self, rows: list[dict]) -> bytes:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Report"
        if rows:
            headers = list(rows[0].keys())
            ws.append(headers)
            for row in rows:
                ws.append([row.get(h) for h in headers])
        out = BytesIO()
        wb.save(out)
        out.seek(0)
        return out.read()
