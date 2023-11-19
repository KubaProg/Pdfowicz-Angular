// editor.component.ts
import {Component, ViewChild, ElementRef, OnInit, OnDestroy, AfterViewInit} from '@angular/core';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { Path, Surface} from "@progress/kendo-drawing";
import {drawScene} from "../draw-scene";
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = pdfFonts.pdfMake.vfs;

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements  OnDestroy, AfterViewInit{

  @ViewChild('pageTextarea') pageTextarea!: ElementRef<HTMLDivElement>;
  private surface!: Surface;
  private drawingPath: Path | undefined;
  isDrawing: boolean = false;

  ngAfterViewInit(): void {
    this.surface = this.createSurface();
    drawScene(this.surface);
    this.insertParagraph()

  }

  ngOnDestroy(): void {
    this.surface.destroy();
    drawScene(this.surface);
  }

  generatePDF(): void {
    const content: HTMLElement | null = this.pageTextarea.nativeElement;

    if (content) {
      const elements = this.getElementsForPDF(content);

      const docDefinition = {
        content: elements
      };

      pdfMake.createPdf(docDefinition).download('generated.pdf');
    }
  }

  private getElementsForPDF(content: HTMLElement): any[] {
    const elementsArray = [];
    let currentParagraph: string[] = [];

    content.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        // Obsługa tekstu
        currentParagraph.push(node.nodeValue);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.nodeName.toLowerCase() === 'img') {
          // Obsługa obrazu
          if (currentParagraph.length > 0) {
            elementsArray.push({ text: currentParagraph.join(' '), margin: [0, 0, 0, 10] });
            currentParagraph = []; // Resetuj bieżący paragraf
          }

          const imgData = (node as HTMLImageElement).src;
          elementsArray.push({ image: imgData, width: 500, margin: [0, 10, 0, 10] });
        } else if (node.nodeName.toLowerCase() === 'p') {
          // Obsługa paragrafu
          const textContent = node.textContent?.trim();
          if (textContent) {
            if (currentParagraph.length > 0) {
              elementsArray.push({ text: currentParagraph.join(' '), margin: [0, 0, 0, 10] });
              currentParagraph = []; // Resetuj bieżący paragraf
            }

            elementsArray.push({ text: textContent, margin: [0, 0, 0, 10] });
          }
        }
      }
    });

    // Dodaj ewentualny ostatni paragraf
    if (currentParagraph.length > 0) {
      elementsArray.push({ text: currentParagraph.join(' '), margin: [0, 0, 0, 10] });
    }

    return elementsArray;
  }



  handleImageDrop(event: DragEvent): void {
    event.preventDefault();

    const files = event.dataTransfer!.files;
    if (files.length > 0) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageElement = document.createElement('img');
        imageElement.src = e.target!.result as string;
        this.pageTextarea.nativeElement.appendChild(imageElement);
        this.insertParagraph(); // Wstaw nowy paragraf po dodaniu obrazu
      };
      reader.readAsDataURL(files[0]);
    }
  }

  allowDrop(event: DragEvent): void {
    event.preventDefault();
  }

  startDrawing(event: MouseEvent): void {
    if(this.isDrawing){
      this.drawingPath = new Path({
        stroke: { color: 'blue', width: 2 },
      });

      const offset = this.getOffset(event);
      this.drawingPath.moveTo(offset.x, offset.y);
      this.surface.draw(this.drawingPath);
    }
  }

  handleMouseMove(event: MouseEvent): void {
    if (this.drawingPath) {
      const offset = this.getOffset(event);
      this.drawingPath.lineTo(offset.x, offset.y);
      this.surface.draw(this.drawingPath);
    }
  }

  stopDrawing(): void {
    this.drawingPath = undefined;
  }

  private createSurface(): Surface {
    const nativeElement: HTMLDivElement = this.pageTextarea.nativeElement;
    const surface = Surface.create(nativeElement);

    nativeElement.addEventListener('mousedown', (event) => this.startDrawing(event));
    nativeElement.addEventListener('mouseup', () => this.stopDrawing());
    nativeElement.addEventListener('mousemove', (event) => this.handleMouseMove(event));

    const svgElement = nativeElement.querySelector('svg');
    if (svgElement) {
      svgElement.style.height = '100%';
      svgElement.style.width = '100%';
      svgElement.style.position = 'absolute';
      svgElement.style.left = '0';
      svgElement.style.top = '0';
    }

    return surface;
  }

  private getOffset(event: MouseEvent): { x: number; y: number } {
    // Check if the surface has a property that holds the HTML element
    // @ts-ignore
    const surfaceElement = this.surface['element'] || (this.surface as any).element;

    if (!surfaceElement) {
      console.error('Unable to find the surface element.');
      return { x: 0, y: 0 };
    }

    const rect = surfaceElement.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  insertParagraph(): void {
    const content: HTMLElement | null = this.pageTextarea.nativeElement;

    if (content) {
      const paragraphElement = document.createElement('p');
      paragraphElement.innerHTML = '<br>'; // Używamy <br>, aby można było pisać w polu tekstowym
      content.appendChild(paragraphElement);
    }
  }

  toggleDrawing(): void {
    this.isDrawing = !this.isDrawing;

    if (this.isDrawing) {
      // Enable drawing logic
      // For example, add event listeners or other drawing setup
    } else {
      // Disable drawing logic
      // For example, remove event listeners or reset drawing state
    }
  }

}
