import {Component, ViewChild, AfterViewInit, ElementRef, AfterViewChecked, ChangeDetectorRef} from '@angular/core';
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
  private resizingImage: HTMLImageElement | null = null;
  private startX: number = 0;
  private startY: number = 0;
  pages: number[] = [1];
  private pageID : number = 1;
  private selectedElement: HTMLElement | null = null;
  private overflowElements : string = "";
  private focusPageIndex = 0;
  private focusPageChanged = false;
  private rubberToolActive = false;
  public draggingFile = false;
  private readonly minImageWidth = 50;
  private readonly maxImageWidth = 575;
  private readonly minImageHeight = 50;
  private readonly maxImageHeight = 400;
  rubberButtonColor: any;


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
      newPage.innerHTML = "<div>" + this.overflowElements + "</div>" + newPage.innerHTML;
      newPage.focus();
      this.moveCursorToEnd(newPage);
      this.overflowElements = ""
    }
  }

  exportAsPDF() {
    this.pdf.saveAs('document.pdf');
  }


  //Code for multiple pages generation
  checkOverflow(event: Event) {
    event.preventDefault();
    let e = event.target as HTMLElement;
  
    if (!(e.classList.contains("page-textarea"))) {
      e = e.closest(".page-textarea")
    }
  
    if (e.innerHTML !== '' || this.pages.length === 1) {
      let contentToAppend = '';
  
      if (event.type === 'paste') {
        const clipboardData = (event as ClipboardEvent).clipboardData || (window as any).clipboardData;
        contentToAppend = clipboardData.getData('text/plain');
        const selection = window.getSelection();
        if (selection) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(contentToAppend));
        }
      }
  
      let lastChild = e.lastChild;
      while (e.offsetHeight < e.scrollHeight) {
        if ((lastChild as Element).tagName == "DIV") {
          let lastCharacter = (lastChild as Element).innerHTML.slice(-1);
        
          let brTagIndex = (lastChild as Element).innerHTML.lastIndexOf("<br>");
          if (brTagIndex !== -1) {
            this.overflowElements = "<br>" + this.overflowElements;
            (lastChild as Element).innerHTML = (lastChild as Element).innerHTML.substring(0, brTagIndex);
          } else {
            this.overflowElements = lastCharacter + this.overflowElements;
            (lastChild as Element).innerHTML = (lastChild as Element).innerHTML.slice(0, -1);
          }

          if ((lastChild as Element).innerHTML == "") {
            lastChild.remove();
            lastChild = e.lastChild;
          }
        }
        else {
          this.overflowElements = (lastChild as Element).outerHTML + this.overflowElements;
          lastChild.remove();
          lastChild = e.lastChild;
        }
      }
  
      if (this.overflowElements !== '') {
        this.focusPageIndex = Array.from(document.querySelectorAll('.page-textarea')).indexOf(e) + 1;
        this.focusPageChanged = true;
        if (!this.pages[this.focusPageIndex]) {
          this.pageID += 1;
          this.pages.splice(this.focusPageIndex, 0, this.pageID);
        }
      }
    } else {
      this.pages.splice(Array.from(document.querySelectorAll('.page-textarea')).indexOf(e), 1);
      this.focusPageIndex = Array.from(document.querySelectorAll('.page-textarea')).indexOf(e) - 1;
      this.focusPageChanged = true;
    }
  }
  
  moveCursorToEnd(element: HTMLElement): void {
    const range = document.createRange();
    const selection = window.getSelection();

    if (selection) {
      range.selectNodeContents(element);
      range.collapse(false);
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

  handleShapeMouseDown(event: MouseEvent | TouchEvent, shapeElement: HTMLElement): void {
    // Extract touch details if it's a touch event
    const isTouchEvent = event instanceof TouchEvent;
    const touch = isTouchEvent ? (event as TouchEvent).touches[0] : null;

    // Get coordinates based on whether it's a mouse or touch event
    const clientX = isTouchEvent ? touch?.clientX || 0 : (event as MouseEvent).clientX;
    const clientY = isTouchEvent ? touch?.clientY || 0 : (event as MouseEvent).clientY;

    const isResizableShape = shapeElement.classList.contains('inserted-shape');
    if (isResizableShape) {
      const rect = shapeElement.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distanceToCenter = Math.sqrt((clientX - centerX) ** 2 + (clientY - centerY) ** 2);

      // Adjust the distance for easy shape grabbing
      const grabThreshold = 20;

      if (distanceToCenter < grabThreshold) {
        // Dragging
        this.draggingElement = shapeElement;
        this.dragStartX = clientX - shapeElement.offsetLeft;
        this.dragStartY = clientY - shapeElement.offsetTop;

        // Add touchmove and touchend event listeners for touch events
        if (isTouchEvent) {
          document.addEventListener('touchmove', this.handleShapeDragMouseMove);
          document.addEventListener('touchend', this.handleShapeDragMouseUp);
        } else {
          // Add mousemove and mouseup event listeners for mouse events
          document.addEventListener('mousemove', this.handleShapeDragMouseMove);
          document.addEventListener('mouseup', this.handleShapeDragMouseUp);
        }
      } else {
        // Resizing
        this.resizingShape = shapeElement;
        this.resizeStartX = clientX;
        this.resizeStartY = clientY;

        // Add touchmove and touchend event listeners for touch events
        if (isTouchEvent) {
          document.addEventListener('touchmove', this.handleShapeResizeMouseMove);
          document.addEventListener('touchend', this.handleShapeResizeMouseUp);
        } else {
          // Add mousemove and mouseup event listeners for mouse events
          document.addEventListener('mousemove', this.handleShapeResizeMouseMove);
          document.addEventListener('mouseup', this.handleShapeResizeMouseUp);
        }
      }
    }
  }

  handleShapeDragMouseUp = (): void => {
    this.draggingElement = null;

    // Remove mousemove and mouseup event listeners after dragging for mouse events
    document.removeEventListener('mousemove', this.handleShapeDragMouseMove);
    document.removeEventListener('mouseup', this.handleShapeDragMouseUp);

    // Remove touchmove and touchend event listeners after dragging for touch events
    document.removeEventListener('touchmove', this.handleShapeDragMouseMove);
    document.removeEventListener('touchend', this.handleShapeDragMouseUp);
  }

  handleShapeDragMouseMove = (event: MouseEvent | TouchEvent): void => {
    const isTouchEvent = event instanceof TouchEvent;
    const touch = isTouchEvent ? (event as TouchEvent).touches[0] : null;
    const clientX = isTouchEvent ? touch?.clientX || 0 : (event as MouseEvent).clientX;
    const clientY = isTouchEvent ? touch?.clientY || 0 : (event as MouseEvent).clientY;

    if (this.draggingElement) {
      const newLeft = clientX - this.dragStartX;
      const newTop = clientY - this.dragStartY;

      // Set new position for the shape
      this.draggingElement.style.left = `${newLeft}px`;
      this.draggingElement.style.top = `${newTop}px`;

      this.dragStartX = clientX - newLeft;
      this.dragStartY = clientY - newTop;
    }
  }

  handleShapeResizeMouseUp = (): void => {
    this.resizingShape = null;

    // Remove mousemove and mouseup event listeners after resizing for mouse events
    document.removeEventListener('mousemove', this.handleShapeResizeMouseMove);
    document.removeEventListener('mouseup', this.handleShapeResizeMouseUp);

    // Remove touchmove and touchend event listeners after resizing for touch events
    document.removeEventListener('touchmove', this.handleShapeResizeMouseMove);
    document.removeEventListener('touchend', this.handleShapeResizeMouseUp);
  }

  handleShapeResizeMouseMove = (event: MouseEvent | TouchEvent): void => {
    const isTouchEvent = event instanceof TouchEvent;
    const touch = isTouchEvent ? (event as TouchEvent).touches[0] : null;
    const clientX = isTouchEvent ? touch?.clientX || 0 : (event as MouseEvent).clientX;
    const clientY = isTouchEvent ? touch?.clientY || 0 : (event as MouseEvent).clientY;

    if (this.resizingShape) {
      const deltaX = clientX - this.resizeStartX;
      const deltaY = clientY - this.resizeStartY;

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

      this.resizeStartX = clientX;
      this.resizeStartY = clientY;
    }
  }
  activateRubberTool(): void {
    this.rubberToolActive = !this.rubberToolActive; // Toggle rubber tool state
    this.rubberButtonColor = this.rubberToolActive ? 'green' : 'black'; // Change button color
  }

  // Modify the deleteSelectedShape method to handle both div elements and images
  deleteSelectedShape(): void {
    if (this.rubberToolActive && this.selectedElement) {
      if (
        this.selectedElement.classList.contains('inserted-shape') ||
        this.selectedElement.classList.contains('inserted-image')
      ) {
        this.selectedElement.remove();
        this.selectedElement = null;
      }
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
    shapeElement.addEventListener('touchstart', (event) => this.handleShapeMouseDown(event, shapeElement));
    shapeElement.addEventListener('click', (event) => this.handleElementClick(event));


    return shapeElement;
  }



  setCursorPosition(event: MouseEvent): void {
    const editor = this.editor.nativeElement;
    const range = document.caretRangeFromPoint(event.clientX, event.clientY);

    if (range) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    // editor.focus();
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
    imgElement.addEventListener('touchstart', (event) => this.handleImageMouseDown(event));
    imgElement.addEventListener('click', (event) => this.handleElementClick(event));


    return imgElement;
  }


  handleElementClick(event: MouseEvent): void {
    if (this.rubberToolActive) {
      const clickedElement = event.target as HTMLElement;

      if (
        clickedElement.classList.contains('inserted-shape') ||
        clickedElement.classList.contains('inserted-image')
      ) {
        clickedElement.remove();
      }
    }
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

  handleImageMouseDown(event: MouseEvent | TouchEvent): void {
    // Extract touch details if it's a touch event
    const isTouchEvent = event instanceof TouchEvent;
    const touch = isTouchEvent ? (event as TouchEvent).touches[0] : null;

    // Get coordinates based on whether it's a mouse or touch event
    const clientX = isTouchEvent ? touch?.clientX || 0 : (event as MouseEvent).clientX;
    const clientY = isTouchEvent ? touch?.clientY || 0 : (event as MouseEvent).clientY;

    this.resizingImage = event.target as HTMLImageElement;
    this.startX = clientX;
    this.startY = clientY;

    // Add touchmove and touchend event listeners for touch events
    if (isTouchEvent) {
      document.addEventListener('touchmove', this.handleImageMouseMove);
      document.addEventListener('touchend', this.handleImageMouseUp);
    } else {
      // Add mousemove and mouseup event listeners for mouse events
      document.addEventListener('mousemove', this.handleImageMouseMove);
      document.addEventListener('mouseup', this.handleImageMouseUp);
    }
  }

  handleImageMouseUp = (): void => {
    this.resizingImage = null;

    // Remove mousemove and mouseup event listeners after resizing for mouse events
    document.removeEventListener('mousemove', this.handleImageMouseMove);
    document.removeEventListener('mouseup', this.handleImageMouseUp);

    // Remove touchmove and touchend event listeners after resizing for touch events
    document.removeEventListener('touchmove', this.handleImageMouseMove);
    document.removeEventListener('touchend', this.handleImageMouseUp);
  }

  handleImageMouseMove = (event: MouseEvent | TouchEvent): void => {
    // Extract touch details if it's a touch event
    const isTouchEvent = event instanceof TouchEvent;
    const touch = isTouchEvent ? (event as TouchEvent).touches[0] : null;

    // Get coordinates based on whether it's a mouse or touch event
    const clientX = isTouchEvent ? touch?.clientX || 0 : (event as MouseEvent).clientX;
    const clientY = isTouchEvent ? touch?.clientY || 0 : (event as MouseEvent).clientY;

    if (this.resizingImage) {
      const deltaX = clientX - this.startX;
      const deltaY = clientY - this.startY;

      const newWidth = Math.max(this.minImageWidth, Math.min(this.maxImageWidth, this.resizingImage.width + deltaX));
      const newHeight = Math.max(this.minImageHeight, Math.min(this.maxImageHeight, this.resizingImage.height + deltaY));

      // Set new dimensions for the image
      this.resizingImage.style.width = `${newWidth}px`;
      this.resizingImage.style.height = `${newHeight}px`;

      this.startX = clientX;
      this.startY = clientY;
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
