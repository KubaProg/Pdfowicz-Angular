import {Component, ViewChild, AfterViewInit, ElementRef, AfterViewChecked, ChangeDetectorRef} from '@angular/core';
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
  public draggingFile = false;
  private readonly minImageWidth = 50;
  private readonly maxImageWidth = 575;
  private readonly minImageHeight = 50;
  private readonly maxImageHeight = 400;

  private resizingShape: HTMLElement | null = null;
  private resizeStartX: number = 0;
  private resizeStartY: number = 0;

  private draggingElement: HTMLElement | null = null;
  private dragStartX: number = 0;
  private dragStartY: number = 0;


  constructor(private cdr: ChangeDetectorRef) {}

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

  handleShapeMouseDown(event: MouseEvent, shapeElement: HTMLElement): void {
    const isResizableShape = shapeElement.classList.contains('inserted-shape');
    if (isResizableShape) {
      const rect = shapeElement.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distanceToCenter = Math.sqrt((event.clientX - centerX) ** 2 + (event.clientY - centerY) ** 2);

      // Dostosuj odległość, aby umożliwić łatwe złapanie za kształt
      const grabThreshold = 20;

      if (distanceToCenter < grabThreshold) {
        // Przesuwanie
        this.draggingElement = shapeElement;
        this.dragStartX = event.clientX - shapeElement.offsetLeft;
        this.dragStartY = event.clientY - shapeElement.offsetTop;

        document.addEventListener('mousemove', this.handleShapeDragMouseMove);
        document.addEventListener('mouseup', this.handleShapeDragMouseUp);
      } else {
        // Zmiana rozmiaru
        this.resizingShape = shapeElement;
        this.resizeStartX = event.clientX;
        this.resizeStartY = event.clientY;

        document.addEventListener('mousemove', this.handleShapeResizeMouseMove);
        document.addEventListener('mouseup', this.handleShapeResizeMouseUp);
      }
    }
  }

  handleShapeDragMouseUp = (): void => {
    this.draggingElement = null;

    // Remove mousemove and mouseup event listeners after dragging
    document.removeEventListener('mousemove', this.handleShapeDragMouseMove);
    document.removeEventListener('mouseup', this.handleShapeDragMouseUp);
  }
  handleShapeDragMouseMove = (event: MouseEvent): void => {
    if (this.draggingElement) {
      const newLeft = event.clientX - this.dragStartX;
      const newTop = event.clientY - this.dragStartY;

      // Set new position for the shape
      this.draggingElement.style.left = `${newLeft}px`;
      this.draggingElement.style.top = `${newTop}px`;

      this.dragStartX = event.clientX - newLeft;
      this.dragStartY = event.clientY - newTop;
    }
  }

  handleShapeResizeMouseUp = (): void => {
    this.resizingShape = null;

    // Remove mousemove and mouseup event listeners after resizing
    document.removeEventListener('mousemove', this.handleShapeResizeMouseMove);
    document.removeEventListener('mouseup', this.handleShapeResizeMouseUp);
  }

  handleShapeResizeMouseMove = (event: MouseEvent): void => {
    if (this.resizingShape) {
      const deltaX = event.clientX - this.resizeStartX;
      const deltaY = event.clientY - this.resizeStartY;

      // Ustal środek okręgu i aktualne promienie
      const centerX = this.resizingShape.offsetLeft + this.resizingShape.offsetWidth / 2;
      const centerY = this.resizingShape.offsetTop + this.resizingShape.offsetHeight / 2;
      const currentRadiusX = this.resizingShape.offsetWidth / 2;
      const currentRadiusY = this.resizingShape.offsetHeight / 2;

      // Przeskaluj promienie proporcjonalnie
      const newRadiusX = Math.max(this.minImageWidth / 2, Math.min(this.maxImageWidth / 2, currentRadiusX + deltaX / 2));
      const newRadiusY = Math.max(this.minImageHeight / 2, Math.min(this.maxImageHeight / 2, currentRadiusY + deltaY / 2));

      // Ustaw nowe promienie i pozycję dla okręgu
      this.resizingShape.style.width = `${newRadiusX * 2}px`;
      this.resizingShape.style.height = `${newRadiusY * 2}px`;
      this.resizingShape.style.left = `${centerX - newRadiusX}px`;
      this.resizingShape.style.top = `${centerY - newRadiusY}px`;

      this.resizeStartX = event.clientX;
      this.resizeStartY = event.clientY;
    }
  }
  deleteSelectedShape(): void {
    if (this.rubberToolActive && this.selectedElement) {
      this.selectedElement.remove();
      this.selectedElement = null;
    }
  }


  createShapeElement(shape: string): HTMLElement {
    const shapeElement = document.createElement('div');
    shapeElement.classList.add('inserted-shape');
    shapeElement.style.width = '50px';
    shapeElement.style.height = '50px';
    shapeElement.style.position = 'absolute';
    shapeElement.style.cursor = 'grab'; // Set cursor to indicate draggable element

    if (shape === 'square') {
      shapeElement.style.backgroundColor = 'red'; // Replace with your styling for a square
    } else if (shape === 'rectangle') {
      shapeElement.style.backgroundColor = 'blue'; // Replace with your styling for a rectangle
    } else if (shape === 'circle') {
      shapeElement.style.backgroundColor = 'green'; // Replace with your styling for a circle
      shapeElement.style.borderRadius = '50%';
    } else {
      shapeElement.style.backgroundColor = 'gray'; // Default styling
    }

    // Add mousedown event listener to enable resizing
    shapeElement.addEventListener('mousedown', (event) => this.handleShapeMouseDown(event, shapeElement));

    return shapeElement;
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


  addImage(): void {
    const imageInput = document.getElementById('imageInput') as HTMLInputElement;

    // Resetujemy wartość elementu wejściowego, aby umożliwić dodanie tego samego pliku ponownie
    imageInput.value = '';

    // Trigger the click event on the hidden file input
    imageInput.click();
  }

  handleImageInput(event: any): void {
    const fileInput = event.target;
    const file = fileInput.files[0];

    if (file) {
      this.readFileAsDataURL(file)
        .then((result: string) => {
          const imgElement = this.createImageElement(result);

          // Pobieramy aktualny zakres zaznaczenia
          const selection = window.getSelection();
          const range = selection?.getRangeAt(0);

          if (range && !range.collapsed) {
            // Jeśli coś jest zaznaczone, wstawiamy obraz w miejscu aktualnego zakresu
            range.deleteContents();
            range.insertNode(imgElement);
          } else {
            // Jeśli nic nie jest zaznaczone, dodajemy obraz na koniec edytora
            this.editor.nativeElement.appendChild(imgElement);
          }

          this.editor.nativeElement.focus();
          this.cdr.detectChanges(); // Wykrywamy zmiany, aby zaktualizować widok
        })
        .catch((error) => {
          console.error('Błąd odczytu pliku:', error);
        })
        .finally(() => {
          // Resetujemy wartość elementu wejściowego, aby umożliwić dodanie tego samego pliku ponownie
          fileInput.value = '';
        });
    }
  }

  private readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        resolve(e.target.result);
      };

      reader.onerror = (error) => {
        reject(error);
      };

      reader.readAsDataURL(file);
    });
  }

  // Function to create an image element
  createImageElement(src: string): HTMLImageElement {
    const imgElement = new Image();
    imgElement.src = src;
    imgElement.classList.add('inserted-image');
    imgElement.style.width = 'auto';
    imgElement.style.height = '100px'; // Ustaw rozmiar początkowy według własnych preferencji
    imgElement.style.cursor = 'grab';

    // Dodajemy obsługę zdarzenia 'mousedown' do obsługi zmiany rozmiaru
    imgElement.addEventListener('mousedown', (event) => this.handleImageMouseDown(event));



    return imgElement;
  }
  // Function to insert an element at the current cursor position
  insertElementAtCursor(element: HTMLElement): void {
    const selection = window.getSelection();
    const range = selection?.getRangeAt(0);

    if (range) {
      range.deleteContents();
      range.insertNode(element);
      this.editor.nativeElement.focus();
      this.cdr.detectChanges(); // Detect changes to update the view
    }
  }


  // section of resizing photos

  handleImageMouseDown(event: MouseEvent): void {
    this.resizingImage = event.target as HTMLImageElement;
    this.startX = event.clientX;
    this.startY = event.clientY;

    // Dodajemy nasłuchiwanie na ruch myszy i puszczenie przycisku
    document.addEventListener('mousemove', this.handleImageMouseMove);
    document.addEventListener('mouseup', this.handleImageMouseUp);
  }

  handleImageMouseUp = (): void => {
    this.resizingImage = null;

    // Usuwamy nasłuchiwanie na ruch myszy i puszczenie przycisku
    document.removeEventListener('mousemove', this.handleImageMouseMove);
    document.removeEventListener('mouseup', this.handleImageMouseUp);
  }

  handleImageMouseMove = (event: MouseEvent): void => {
    if (this.resizingImage) {
      const deltaX = event.clientX - this.startX;
      const deltaY = event.clientY - this.startY;

      const newWidth = Math.max(this.minImageWidth, Math.min(this.maxImageWidth, this.resizingImage.width + deltaX));
      const newHeight = Math.max(this.minImageHeight, Math.min(this.maxImageHeight, this.resizingImage.height + deltaY));

      // Ustawiamy nowe wymiary obrazu
      this.resizingImage.style.width = `${newWidth}px`;
      this.resizingImage.style.height = `${newHeight}px`;

      this.startX = event.clientX;
      this.startY = event.clientY;
    }
  }

  // Dodajemy obsługę zdarzenia 'dragover' do umożliwienia przeciągania plików nad edytorem
  handleDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  // Dodajemy obsługę zdarzenia 'drop' do obsługi przeciągania i upuszczania plików
  handleDrop(event: DragEvent): void {
    event.preventDefault();

    this.draggingFile = false;

    const files = event.dataTransfer?.files;

    if (files && files.length > 0) {
      const file = files[0];

      this.readFileAsDataURL(file)
        .then((result: string) => {
          const imgElement = this.createImageElement(result);

          // Dodajemy obraz do aktualnego zakresu zaznaczenia, jeśli istnieje
          const selection = window.getSelection();
          const range = selection?.getRangeAt(0);

          if (range && !range.collapsed) {
            range.deleteContents();
            range.insertNode(imgElement);
          } else {
            // Dodajemy obraz na koniec edytora, jeśli nic nie jest zaznaczone
            this.editor.nativeElement.appendChild(imgElement);
          }

          this.editor.nativeElement.focus();
          this.cdr.detectChanges();
        })
        .catch((error) => {
          console.error('Błąd odczytu pliku:', error);
        });
    }
  }

  // Dodajemy obsługę zdarzenia 'dragenter' i 'dragleave' do śledzenia, czy użytkownik przeciąga plik
  handleDragEnter(event: DragEvent): void {
    event.preventDefault();
    this.draggingFile = true;
  }

  handleDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.draggingFile = false;
  }

}
