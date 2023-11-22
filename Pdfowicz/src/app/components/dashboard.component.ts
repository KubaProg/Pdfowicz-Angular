
import {Component, ViewChild,AfterViewInit} from '@angular/core';
import {Surface} from "@progress/kendo-drawing";
import {drawScene} from "../draw-scene";
import {PDFExportComponent} from "@progress/kendo-angular-pdf-export";

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements  AfterViewInit{

  @ViewChild('pdf', { static: false }) pdf: PDFExportComponent;
  private surface!: Surface;

  ngAfterViewInit(): void {
    drawScene(this.surface);
  }

  exportAsPDF() {
    this.pdf.saveAs('document.pdf');
  }

}
