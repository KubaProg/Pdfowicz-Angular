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
  @ViewChild('editor', { static: false }) editor: ElementRef;
  @ViewChild('pageContainer', { static: false }) pageContainer: ElementRef;

  private surface!: Surface;
  private currentRange: Range | null = null;
  private resizingImage: HTMLImageElement | null = null;
  private startX: number = 0;
  private startY: number = 0;
  pages: number[] = [1];
  private pageID : number = 1;
  private selectedElement: HTMLElement | null = null;
  private overflowText : string = "";
  private focusPageIndex = 0;
  private focusPageChanged = false;
  private rubberToolActive = false;
  private rubberToolClicked = false;

  ngAfterViewInit(): void {
    drawScene(this.surface);
  }


  ngAfterViewChecked(): void {
    if (this.focusPageChanged) {
      this.focusPageChanged = false;
      const newPage = (document.querySelectorAll(".page-textarea")[this.focusPageIndex] as HTMLElement);
      newPage.innerHTML = this.overflowText + newPage.innerHTML;
      newPage.focus();
      this.moveCursorToEnd(newPage);
      this.overflowText = ""
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

  handleMouseMove(event: MouseEvent): void {
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
    event.preventDefault();
    const e = event.target as HTMLElement;
    if (e.innerHTML != "<br>" || this.pages.length == 1) {
      let pastedText = "";
      if (event.type == 'paste') {
        const clipboardData = (event as ClipboardEvent).clipboardData || (window as any).clipboardData;
        pastedText = clipboardData.getData('text/plain');
        const selection = window.getSelection();
        if (selection) {
          selection.getRangeAt(0).insertNode(document.createTextNode(pastedText));
        }
      }

      while(e.offsetHeight < e.scrollHeight || e.offsetWidth < e.scrollWidth == true) {
        this.overflowText = e.innerText.substring(e.innerText.length - 1) + this.overflowText;
        const fullPageText = e.innerText.slice(0, -1);
        e.innerText = fullPageText;
      }

      if(this.overflowText != "") {
        this.focusPageIndex = Array.from(document.querySelectorAll(".page-textarea")).indexOf(e) + 1;
        this.focusPageChanged = true;
        if (!this.pages[this.focusPageIndex]) {
          this.pageID += 1;
          this.pages.splice(this.focusPageIndex, 0, this.pageID);
        }
      }
    }
    else {
      this.pages.splice(Array.from(document.querySelectorAll(".page-textarea")).indexOf(e), 1);
      this.focusPageIndex = Array.from(document.querySelectorAll(".page-textarea")).indexOf(e) - 1;
      this.focusPageChanged = true;
    }
  }

  moveCursorToEnd(element: HTMLElement): void {
    const range = document.createRange();
    const selection = window.getSelection();
  
    if (selection) {
      range.selectNodeContents(element);
      range.collapse(false); // Collapse the range to the end
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  insertShape(shape: string): void {
    if (shape === 'rubber') {
      // Toggle the active state of the rubber tool
      this.rubberToolActive = !this.rubberToolActive;
    } else {
      const selection = window.getSelection();
      const range = selection?.getRangeAt(0);

      if (range) {
        const shapeElement = this.createShapeElement(shape);

        // Insert a non-breaking space along with the shape
        const spaceNode = document.createTextNode('\u00A0');
        range.deleteContents();
        range.insertNode(spaceNode);
        range.insertNode(shapeElement);

        // Set focus on the editor
        this.editor.nativeElement.focus();

        // Set selection range to the end of the non-breaking space
        selection?.collapse(spaceNode, 1);
      }
    }

    // Change the color of the rubber tool button based on the active state
    this.rubberToolActive ? this.rubberButtonColor = 'green' : this.rubberButtonColor = 'black';
  }

  deleteSelectedShape(): void {
    if (this.rubberToolActive && this.selectedElement) {
      this.selectedElement.remove();
      this.selectedElement = null;
    }
  }


  createShapeElement(shape: string): HTMLImageElement {
    const imgElement = new Image();
    imgElement.classList.add('inserted-shape');
    imgElement.style.width = '50px';
    imgElement.style.height = '50px';
    imgElement.style.position = 'absolute';
    imgElement.style.cursor = 'grab'; // Set cursor to indicate draggable element

    if (shape === 'square') {
      imgElement.src = 'assets/square.png'; // Replace with your square image path
    } else if (shape === 'rectangle') {
      imgElement.src = 'assets/rectangle.png'; // Replace with your rectangle image path
    } else if (shape === 'circle') {
      imgElement.src = 'assets/circle.png';
    } else {
      imgElement.src = 'path_to_default_image'; // Replace with your default image path
    }

    // Add click event listener to handle shape click
    imgElement.addEventListener('click', (event) => this.handleShapeClick(event));

    // Add mousedown event listener to enable dragging
    imgElement.addEventListener('mousedown', (event) => this.handleShapeMouseDown(event));

    return imgElement;
  }


  handleShapeMouseDown(event: MouseEvent): void {
    this.selectedElement = event.target as HTMLImageElement;
    this.startX = event.clientX - this.selectedElement.offsetLeft;
    this.startY = event.clientY - this.selectedElement.offsetTop;

    // Add mousemove and mouseup event listeners for dragging
    document.addEventListener('mousemove', this.handleShapeMouseMove);
    document.addEventListener('mouseup', this.handleShapeMouseUp);
  }


  handleShapeMouseUp = (): void => {
    this.selectedElement = null;

    // Remove mousemove and mouseup event listeners after dragging
    document.removeEventListener('mousemove', this.handleShapeMouseMove);
    document.removeEventListener('mouseup', this.handleShapeMouseUp);
  }


  handleShapeMouseMove = (event: MouseEvent): void => {
    if (this.selectedElement) {
      const mouseX = event.clientX - this.startX;
      const mouseY = event.clientY - this.startY;

      this.selectedElement.style.left = mouseX + 'px';
      this.selectedElement.style.top = mouseY + 'px';
    }
  }
  rubberButtonColor: any;


  handleShapeClick(event: MouseEvent): void {
    const clickedShape = event.target as HTMLElement;

    if (this.rubberToolActive) {
      // Delete the clicked shape if the rubber tool is active
      this.selectedElement = clickedShape;
      this.deleteSelectedShape();
    } else {
      if (this.selectedElement === clickedShape) {
        // If the clicked shape is already selected, deselect it
        this.selectedElement = null;
      } else {
        // Select the clicked shape
        this.selectedElement = clickedShape;

        // Move the cursor to the beginning of the container div
        const containerDiv = clickedShape.closest('.inserted-shape') as HTMLElement;
        const range = document.createRange();
        const selection = window.getSelection();

        if (containerDiv) {
          range.setStart(containerDiv.firstChild || containerDiv, 0);
          range.collapse(true);

          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      }
    }

  }

  setCursorPosition(event: MouseEvent): void {
    const editor = this.editor.nativeElement;
    const range = document.caretRangeFromPoint(event.clientX, event.clientY);

    if (range) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    editor.focus();
  }

}
