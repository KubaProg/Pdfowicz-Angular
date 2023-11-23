import { Component, ViewChild, AfterViewInit, ElementRef, AfterViewChecked } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Surface } from "@progress/kendo-drawing";
import { drawScene } from "../draw-scene";
import { PDFExportComponent } from "@progress/kendo-angular-pdf-export";

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements AfterViewInit, AfterViewChecked {

  @ViewChild('pdf', { static: false }) pdf: PDFExportComponent;
  @ViewChild('pageTextarea', { static: false }) pageTextarea: ElementRef;

  private surface!: Surface;
  private currentRange: Range | null = null;
  private resizingImage: HTMLImageElement | null = null;
  private startX: number = 0;
  private startY: number = 0;
  private isPageAdded = false;
  pages: number[] = [1];
  private pageID : number = 1;

  ngAfterViewInit(): void {
    drawScene(this.surface);
  }

  ngAfterViewChecked(): void {
    if (this.isPageAdded) {
      this.isPageAdded = false;
      (document.querySelectorAll(".page-textarea")[this.pages.indexOf(Math.max(...this.pages))] as HTMLElement).focus()
    }
  }

  exportAsPDF() {
    this.pdf.saveAs('document.pdf');
  }

  addImage() {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    fileInput.click();
  }

  handleFileInput(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0];

    if (file) {
      if (this.currentRange) {
        this.insertImageFromFile(file);
      } else {
        this.appendImageToFile(file);
      }
    }

    // Clear the file input to allow selecting the same file again
    inputElement.value = '';
  }

  insertImageFromFile(file: File) {
    const imageUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = imageUrl;
    img.setAttribute('draggable', 'true');
    img.addEventListener('mousedown', (e) => this.handleMouseDown(e));

    if (this.currentRange) {
      const fragment = this.currentRange.createContextualFragment(img.outerHTML);
      this.currentRange.deleteContents();
      this.currentRange.insertNode(fragment);
    }
  }

  appendImageToFile(file: File) {
    const imageUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = imageUrl;
    img.setAttribute('draggable', 'true');
    img.addEventListener('mousedown', (e) => this.handleMouseDown(e));

    const pageTextarea = this.pageTextarea.nativeElement;
    pageTextarea.appendChild(img);
  }

  saveSelection() {
    const selection = window.getSelection();
    this.currentRange = selection.getRangeAt(0);
    // You can store the range or selection for later use if needed
  }

  handleMouseDown(event: MouseEvent) {
    this.resizingImage = event.target as HTMLImageElement;
    this.startX = event.clientX;
    this.startY = event.clientY;
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('mouseup', () => this.handleMouseUp());
  }

  handleMouseMove(event: MouseEvent) {
    if (this.resizingImage) {
      const deltaX = event.clientX - this.startX;
      const deltaY = event.clientY - this.startY;

      this.resizingImage.width += deltaX;
      this.resizingImage.height += deltaY;

      this.startX = event.clientX;
      this.startY = event.clientY;
    }
  }

  handleMouseUp() {
    this.resizingImage = null;
    document.removeEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.removeEventListener('mouseup', () => this.handleMouseUp());
  }

  //Code for multiple pages generation
  checkOverflow(event: Event) {
    const e = event.target as HTMLElement;
    if(e.offsetHeight < e.scrollHeight || e.offsetWidth < e.scrollWidth == true) {
      const originalText = e.innerText;
      this.pageID += 1;
      this.pages.splice(Array.from(document.querySelectorAll(".page-textarea")).indexOf(e) + 1, 0, this.pageID);
      this.isPageAdded = true;
    }
  }
}
