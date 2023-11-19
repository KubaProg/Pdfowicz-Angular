// editor.component.ts
import {Component, ViewChild, ElementRef, OnInit, OnDestroy, AfterViewInit} from '@angular/core';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { Path, Surface} from "@progress/kendo-drawing";
import {drawScene} from "../draw-scene";

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements  OnDestroy, AfterViewInit{

  @ViewChild('pageTextarea') pageTextarea!: ElementRef<HTMLDivElement>;
  private surface!: Surface;
  private drawingPath: Path | undefined;

  ngAfterViewInit(): void {
    this.surface = this.createSurface();
    drawScene(this.surface);
  }

  ngOnDestroy(): void {
    this.surface.destroy();
    drawScene(this.surface)
  }

  generatePDF(): void {
    const content: HTMLElement | null = this.pageTextarea.nativeElement;

    if (content) {
      html2pdf(content);
    }
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
      };
      reader.readAsDataURL(files[0]);
    }
  }

  allowDrop(event: DragEvent): void {
    event.preventDefault();
  }

  startDrawing(event: MouseEvent): void {
    this.drawingPath = new Path({
      stroke: { color: 'blue', width: 2 },
    });

    const offset = this.getOffset(event);
    this.drawingPath.moveTo(offset.x, offset.y);
    this.surface.draw(this.drawingPath);
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


    // Prevent the Kendo UI Surface from intercepting keydown events
    nativeElement.addEventListener('keydown', (event) => {
      event.stopPropagation();
    });

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



}
