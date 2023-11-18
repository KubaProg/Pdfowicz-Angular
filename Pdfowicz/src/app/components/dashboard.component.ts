// editor.component.ts
import { Component, ViewChild, ElementRef } from '@angular/core';
// @ts-ignore
import html2pdf from 'html2pdf.js';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  @ViewChild('pageTextarea') pageTextarea!: ElementRef<HTMLDivElement>;

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
}
