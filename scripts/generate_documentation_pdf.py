from pathlib import Path
import re, html, shutil
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Preformatted

ROOT = Path(__file__).resolve().parent.parent
EMERALD = colors.HexColor('#167D58')
CHARCOAL = colors.HexColor('#182420')
SAGE = colors.HexColor('#A8C3AE')
IVORY = colors.HexColor('#F7F6F0')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyERP', fontName='Helvetica', fontSize=9, leading=13, textColor=CHARCOAL, spaceAfter=7))
styles.add(ParagraphStyle(name='CellERP', fontName='Helvetica', fontSize=7, leading=10, textColor=CHARCOAL))
styles.add(ParagraphStyle(name='CodeERP', fontName='Courier', fontSize=7, leading=10, backColor=IVORY, borderPadding=5))
for heading in ['Heading1','Heading2','Heading3']:
    styles[heading].textColor = EMERALD


def inline(value):
    value = value.replace('→',' -> ').replace('—',' - ').replace('–','-').replace('×','x')
    value = html.escape(value)
    value = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: '<link href="'+m[2]+'" color="#167D58">'+m[1]+'</link>' if m[2].startswith('https://') else m[1]+' ('+m[2]+')', value)
    value = re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',value)
    value = re.sub(r'`([^`]+)`',r'<font name="Courier">\1</font>',value)
    return value


def markdown(text):
    story=[];lines=text.splitlines();i=0
    while i<len(lines):
        line=lines[i]
        if not line.strip(): i+=1;continue
        if line.startswith('```'):
            block=[];i+=1
            while i<len(lines) and not lines[i].startswith('```'):
                block.append(lines[i]);i+=1
            if block: story.append(Preformatted('\n'.join(block),styles['CodeERP'],maxLineLength=100))
            i+=1;continue
        if line.startswith('|'):
            rows=[]
            while i<len(lines) and lines[i].startswith('|'):
                cells=[c.strip() for c in lines[i].strip('|').split('|')]
                if not all(re.fullmatch(r'[:\- ]+',c) for c in cells):rows.append([Paragraph(inline(c),styles['CellERP']) for c in cells])
                i+=1
            if rows:
                widths=[(A4[0]-80)/len(rows[0])]*len(rows[0])
                table=Table(rows,colWidths=widths,repeatRows=1,hAlign='LEFT')
                table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),SAGE),('VALIGN',(0,0),(-1,-1),'TOP'),('BOX',(0,0),(-1,-1),0.5,SAGE),('INNERGRID',(0,0),(-1,-1),0.25,SAGE),('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
                story.extend([table,Spacer(1,10)])
            continue
        if line.startswith('#'):
            level=len(line)-len(line.lstrip('#'))
            story.append(Paragraph(inline(line.lstrip('#').strip()),styles['Heading'+str(min(level,3))]));i+=1;continue
        if line.startswith('- '):line='\u2022 '+line[2:]
        story.append(Paragraph(inline(line),styles['BodyERP']));i+=1
    return story


def footer(canvas,doc):
    canvas.saveState();canvas.setStrokeColor(SAGE);canvas.line(40,35,A4[0]-40,35)
    canvas.setFont('Helvetica',8);canvas.setFillColor(CHARCOAL);canvas.drawString(40,23,'EnterpriseX / Project 08 / verified implementation / 27 November 2026')
    canvas.drawRightString(A4[0]-40,23,str(doc.page));canvas.restoreState()


def main():
    target=ROOT/'docs/EnterpriseX_Project_Documentation.pdf'
    story=[Spacer(1,85),Paragraph('EnterpriseX',styles['Title']),Spacer(1,12),Paragraph('Integrated Finance, Procurement, Inventory & Sales ERP',styles['Heading1']),Spacer(1,16),Paragraph('Project 08 - implementation, assessment evidence and deployment report',styles['BodyERP']),Paragraph('Review date: 27 November 2026 (Asia/Kolkata)',styles['BodyERP']),Paragraph('Existing project repaired in place; qualifications and unresolved provider/account constraints are stated explicitly.',styles['BodyERP']),PageBreak()]
    story+=markdown((ROOT/'README.md').read_text(encoding='utf-8-sig'))
    for filename,title in [('docs/API_DOCUMENTATION.md','API contracts'),('docs/INCIDENT_RUNBOOK.md','Operation and recovery')]:
        story.extend([PageBreak(),Paragraph(title,styles['Heading1'])]);story+=markdown((ROOT/filename).read_text(encoding='utf-8-sig'))
    SimpleDocTemplate(str(target),pagesize=A4,rightMargin=40,leftMargin=40,topMargin=40,bottomMargin=48,title='EnterpriseX Project 08 verified implementation',author='EnterpriseX').build(story,onFirstPage=footer,onLaterPages=footer)
    shutil.copyfile(target,ROOT/'EnterpriseX_Project_Documentation.pdf')
    print(target)

if __name__=='__main__':main()
