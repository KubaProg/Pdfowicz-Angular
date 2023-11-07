import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements AfterViewInit {
  @ViewChild('canvas', {static: true}) canvas!: ElementRef<HTMLCanvasElement>;
  pdfDataUri: string | null = null;
  pageWidth = 595;
  pageHeight = 842;
  padding = 20;
  fontSize = 20;
  image: HTMLImageElement | null = null;
  imageX = 50;
  imageY = this.pageHeight - 50;
  isDragging = false;

  ngAfterViewInit(): void {
    this.createBlankPdf();
  }

  async createBlankPdf() {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([this.pageWidth, this.pageHeight]);
    const canvas = this.canvas.nativeElement;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.clearRect(0, 0, this.pageWidth, this.pageHeight);
    }

    const div = document.querySelector('div[contenteditable="true"]');
    const content = div ? div.innerHTML : '';

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const pageContent = this.transformHtmlTags(content);

    page.drawText(pageContent, {
      x: this.padding,
      y: this.pageHeight - this.padding - this.fontSize,
      size: this.fontSize,
      font: font,
      color: rgb(0, 0, 0),
    });

    const pdfBytes = await pdfDoc.save();
    this.pdfDataUri = this.bytesToDataUri(pdfBytes);
  }

  bytesToDataUri(pdfBytes: Uint8Array): string {
    const binaryArray = Array.from(pdfBytes);
    const binaryString = String.fromCharCode.apply(null, binaryArray);
    return 'data:application/pdf;base64,' + btoa(binaryString);
  }

  updateCanvas(event: any): void {
    this.createBlankPdf();
  }

  transformHtmlTags(html: string): string {
    const finalHtml = html.replace(/<\/div>/ig, "\n").replace(/<div>/ig, "").replace(/<br>/ig, "");
    return finalHtml;
  }


}
