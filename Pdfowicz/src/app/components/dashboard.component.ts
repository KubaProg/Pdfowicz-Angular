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
  private overflowText : string = "";
  private focusPageIndex = 0;
  private focusPageChanged = false;
  private rubberToolActive = false;
  public draggingFile = false;
  private readonly minImageWidth = 50;
  private readonly maxImageWidth = 575;
  private readonly minImageHeight = 50;
  private readonly maxImageHeight = 400;
  private touchStartX: number = 0;
  private touchStartY: number = 0;

  private isDragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  rubberButtonColor: any;



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

  handleShapeTouchStart(event: TouchEvent): void {
    this.selectedElement = event.target as HTMLElement;

    // Check if the touched element is an image (not a div or other non-image element)
    if (!this.selectedElement.classList.contains('inserted-shape')) {
      return;
    }

    const touch = event.touches[0];

    // Save the initial touch position
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;

    // Add touchmove and touchend event listeners for dragging
    document.addEventListener('touchmove', this.handleShapeTouchMove);
    document.addEventListener('touchend', this.handleShapeTouchEnd);
  }

  handleShapeTouchEnd = (): void => {
    this.selectedElement = null;

    // Remove touchmove and touchend event listeners after dragging
    document.removeEventListener('touchmove', this.handleShapeTouchMove);
    document.removeEventListener('touchend', this.handleShapeTouchEnd);

    // Reset drag variables
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
  }

  handleShapeTouchMove = (event: TouchEvent): void => {
    if (this.selectedElement) {
      const touch = event.touches[0];

      if (!this.isDragging) {
        this.isDragging = true;
        const boundingRect = this.selectedElement.getBoundingClientRect();
        this.dragOffsetX = touch.clientX - boundingRect.left;
        this.dragOffsetY = touch.clientY - boundingRect.top;
      }

      const mouseX = touch.clientX - this.dragOffsetX;
      const mouseY = touch.clientY - this.dragOffsetY;

      this.selectedElement.style.left = mouseX - 120 + 'px';
      this.selectedElement.style.top = mouseY - 120 + 'px';
    }
  }

  handleImageTouchStart(event: TouchEvent): void {
    this.resizingImage = event.target as HTMLImageElement;
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;

    // Add touchmove and touchend event listeners for resizing
    // document.addEventListener('touchmove', this.handleImageTouchMove);
    document.addEventListener('touchend', this.handleImageTouchEnd);
  }

  handleImageTouchEnd = (): void => {
    this.resizingImage = null;

    // Remove touchmove and touchend event listeners after resizing
    // document.removeEventListener('touchmove', this.handleImageTouchMove);
    document.removeEventListener('touchend', this.handleImageTouchEnd);
  }

  handleImageTouchMove = (event: TouchEvent): void => {
    if (this.resizingImage) {
      const deltaX = event.touches[0].clientX - this.touchStartX;
      const deltaY = event.touches[0].clientY - this.touchStartY;

      const newWidth = Math.max(this.minImageWidth, Math.min(this.maxImageWidth, this.resizingImage.width + deltaX));
      const newHeight = Math.max(this.minImageHeight, Math.min(this.maxImageHeight, this.resizingImage.height + deltaY));

      // Set the new dimensions of the image
      this.resizingImage.style.width = `${newWidth}px`;
      this.resizingImage.style.height = `${newHeight}px`;

      this.touchStartX = event.touches[0].clientX;
      this.touchStartY = event.touches[0].clientY;
    }
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


    imgElement.addEventListener('touchstart', (event) => this.handleImageTouchStart(event));
    // imgElement.addEventListener('touchmove', (event) => this.handleImageTouchMove(event));
    imgElement.addEventListener('touchend', () => this.handleImageTouchEnd());

    imgElement.addEventListener('touchstart', (event) => this.handleShapeTouchStart(event));
    imgElement.addEventListener('touchmove', (event) => this.handleShapeTouchMove(event));
    imgElement.addEventListener('touchend', () => this.handleShapeTouchEnd());


    return imgElement;
  }


  handleShapeMouseDown(event: MouseEvent): void {
    this.selectedElement = event.target as HTMLElement;

    // Check if the clicked element is an image (not a div or other non-image element)
    if (!this.selectedElement.classList.contains('inserted-shape')) {
      return;
    }

    // Save the initial cursor position
    this.dragOffsetX = event.clientX;
    this.dragOffsetY = event.clientY;

    // Add mousemove and mouseup event listeners for dragging
    document.addEventListener('mousemove', this.handleShapeMouseMove);
    document.addEventListener('mouseup', this.handleShapeMouseUp);
  }

  handleShapeMouseUp = (): void => {
    this.selectedElement = null;

    // Remove mousemove and mouseup event listeners after dragging
    document.removeEventListener('mousemove', this.handleShapeMouseMove);
    document.removeEventListener('mouseup', this.handleShapeMouseUp);

    // Reset drag variables
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
  }

  handleShapeMouseMove = (event: MouseEvent): void => {
    if (this.selectedElement) {
      if (!this.isDragging) {
        this.isDragging = true;
        const boundingRect = this.selectedElement.getBoundingClientRect();
        this.dragOffsetX = event.clientX - boundingRect.left;
        this.dragOffsetY = event.clientY - boundingRect.top;
      }

      const mouseX = event.clientX - this.dragOffsetX;
      const mouseY = event.clientY - this.dragOffsetY;

      this.selectedElement.style.left = mouseX-120 + 'px';
      this.selectedElement.style.top = mouseY-120 + 'px';
    }
  }


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

    // Dodajemy obsługę 'click' i 'mousedown' do obsługi zaznaczania obrazu i przeciągania
    imgElement.addEventListener('click', (event) => this.handleShapeClick(event));
    imgElement.addEventListener('mousedown', (event) => this.handleShapeMouseDown(event));

    imgElement.addEventListener('touchstart', (event) => this.handleImageTouchStart(event));
    imgElement.addEventListener('touchmove', (event) => this.handleImageTouchMove(event));
    imgElement.addEventListener('touchend', () => this.handleImageTouchEnd());

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
  handleDragOver(event: Event | DragEvent | TouchEvent): void {
    event.preventDefault();

    if (event instanceof TouchEvent) {
      // Handle touch events on mobile devices
      const touchEvent = event as TouchEvent;
      if (touchEvent.touches.length > 0) {
        this.draggingFile = true;
      }
    } else if (event instanceof DragEvent) {
      // Handle drag events on desktop
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
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
