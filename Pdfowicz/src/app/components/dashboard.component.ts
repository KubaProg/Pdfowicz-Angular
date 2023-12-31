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
  private overflowElements : string = "";
  private focusPageIndex = 0;
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
  private minSquareSize: number = 50;
  private maxSquareSize: number = 400;


  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    document.querySelector(".page-textarea").innerHTML = '<div><br/></div>';
    drawScene(this.surface);
  }


  ngAfterViewChecked(): void {
    if (this.overflowElements != "") {
      const newPage = (document.querySelectorAll(".page-textarea")[this.focusPageIndex] as HTMLElement);
      newPage.innerHTML = this.overflowElements + newPage.innerHTML;
      this.overflowElements = "";
      newPage.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
  }

  exportAsPDF() {
    this.pdf.saveAs('document.pdf');
  }

  //Code for multiple pages generation
  checkOverflow(event: Event) {
    if (event.type === 'paste') {
      event.preventDefault();
      let contentToAppend = '';
      const clipboardData = (event as ClipboardEvent).clipboardData || (window as any).clipboardData;
      contentToAppend = clipboardData.getData('text/html');
      const selection = window.getSelection();
      if (selection) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = contentToAppend.replace(/<html>|<\/html>/g, '').replace(/<body>|<\/body>/g, '').replace(/<span\s+([^>]*)>|<\/span>/g, '').replace(/<p\s+([^>]*)>/g, "").replace(/<\/p>/g, "<br>").replace(/<!--[\s\S]*?-->/g, "");
        const fragment = document.createDocumentFragment();
        while (tempDiv.firstChild) {
          fragment.appendChild(tempDiv.firstChild);
        }
        range.insertNode(fragment);
      }
    }
    let e = event.target as HTMLElement;

    if (!(e.classList.contains("page-textarea"))) {
      e = e.closest(".page-textarea");
    }

    if (e.innerHTML !== '' || this.pages.length === 1) {
      let lastChild = (e.lastChild as HTMLElement);
      while (e.offsetHeight < e.scrollHeight) {
        if (lastChild.nodeType === Node.TEXT_NODE) {
          var newDivElement = document.createElement("div");
          newDivElement.textContent = lastChild.nodeValue;
          e.replaceChild(newDivElement, lastChild);
          lastChild = (e.lastChild as HTMLElement);
        }

        if (lastChild.tagName == "DIV") {
          lastChild.innerHTML = lastChild.innerHTML.replace(/<span\s+([^>]*)>|<\/span>/g, '').replace(/<br[^>]*>/g, "<br>");

          let lastElement = lastChild.lastChild as HTMLElement;
          if (lastElement.tagName == "IMG" || lastElement.tagName == "DIV") {
            this.overflowElements = lastElement.outerHTML + this.overflowElements;
            lastElement.remove();
          }
          else {
            let lastCharacter = "";
            let sliceCharacters = 1;
            if (lastChild.innerHTML.slice(-4) == "<br>") {
              sliceCharacters = 4;
            }
            else if (lastChild.innerHTML.slice(-6) == "&nbsp;") {
              sliceCharacters = 6;
            }
            lastCharacter = lastChild.innerHTML.slice(-sliceCharacters);

            this.overflowElements = lastCharacter + this.overflowElements;
            lastChild.innerHTML = lastChild.innerHTML.slice(0, -sliceCharacters);
          }

          if (lastChild.innerHTML == "") {
            this.overflowElements = "<div>" + this.overflowElements + "</div>";
            lastChild.remove();
            lastChild = e.lastChild as HTMLElement;
          }
        }
        else {
          this.overflowElements = lastChild.outerHTML + this.overflowElements;
          lastChild.remove();
          lastChild = e.lastChild as HTMLElement;
        }
      }
      if (this.overflowElements !== '') {
        this.focusPageIndex = Array.from(document.querySelectorAll('.page-textarea')).indexOf(e) + 1;
        if (!this.pages[this.focusPageIndex]) {
          this.pageID += 1;
          this.pages.splice(this.focusPageIndex, 0, this.pageID);
        }
      }
    } else {
      let pageIndexNumber = Array.from(document.querySelectorAll('.page-textarea')).indexOf(e);
      this.pages.splice(pageIndexNumber, 1);
      this.focusPageIndex = pageIndexNumber - 1;
    }
  }

  insertShape(shape: string): void {
    if (shape === 'rubber') {
      // Toggle the active state of the rubber tool
      this.rubberToolActive = !this.rubberToolActive;
    } else {
      const selection = window.getSelection();

      if (selection) {
        const anchorNode = selection.anchorNode;

        if (anchorNode && !(anchorNode instanceof HTMLElement && anchorNode.classList.contains('inserted-shape'))) {
          let parentContainer: Element | null = null;

          if (anchorNode.nodeType === Node.ELEMENT_NODE) {
            // If anchorNode is an element, check its closest parent with class 'page-textarea'
            parentContainer = (anchorNode as Element).closest('.page-textarea');
          } else if (anchorNode.nodeType === Node.TEXT_NODE) {
            // If anchorNode is a text node, check its parent element and then closest parent with class 'page-textarea'
            const parentElement = (anchorNode as Text).parentElement;
            parentContainer = parentElement ? parentElement.closest('.page-textarea') : null;
          }

          if (parentContainer) {
            const range = selection.getRangeAt(0);

            // Your code to create and insert the shapeElement goes here
            const shapeElement = this.createShapeElement(shape);
            const spaceNode = document.createTextNode('\u00A0');

            range.deleteContents();
            range.insertNode(spaceNode);
            range.insertNode(shapeElement);

            // Set focus on the editor
            // this.editor.nativeElement.focus();

            // Set selection range to the end of the non-breaking space
            selection?.collapse(spaceNode, 1);

            // Change the color of the rubber tool button based on the active state
            this.rubberToolActive ? this.rubberButtonColor = 'green' : this.rubberButtonColor = 'black';
          } else {
            console.warn("Selection is not within an element with the class 'page-textarea'.");
          }
        }
      }
    }
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
      const grabThreshold = rect.width / 3;

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

    this.draggingElement = shapeElement;
    const rect = shapeElement.getBoundingClientRect();
    this.dragStartX = clientX - rect.left;
    this.dragStartY = clientY - rect.top;


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
      // Get the parent page-textarea element
      const parentContainer = this.draggingElement.closest('.page-textarea');
      if (parentContainer) {
        const parentRect = parentContainer.getBoundingClientRect();

        // Calculate new position
        let newLeft = clientX - this.dragStartX - parentRect.left;
        let newTop = clientY - this.dragStartY - parentRect.top;

        // Check left boundary
        if (newLeft < 0) {
          newLeft = 0;
        }

        // Check right boundary
        if (newLeft + this.draggingElement.offsetWidth > parentRect.width) {
          newLeft = parentRect.width - this.draggingElement.offsetWidth;
        }

        // Check top boundary
        if (newTop < 0) {
          newTop = 0;
        }

        // Check bottom boundary
        if (newTop + this.draggingElement.offsetHeight > parentRect.height) {
          newTop = parentRect.height - this.draggingElement.offsetHeight;
        }

        // Set new position for the shape
        this.draggingElement.style.left = `${newLeft}px`;
        this.draggingElement.style.top = `${newTop}px`;

        this.dragStartX = clientX - newLeft - parentRect.left;
        this.dragStartY = clientY - newTop - parentRect.top;
      }
    }

    if (this.draggingElement) {
      const parentContainer = this.draggingElement.closest('.page-textarea');
      if (parentContainer) {
        const parentRect = parentContainer.getBoundingClientRect();

        // Calculate new position using the constant offset values
        let newLeft = clientX - this.dragStartX - parentRect.left;
        let newTop = clientY - this.dragStartY - parentRect.top;

        // Boundary checks...
        // Set new position for the shape
        this.draggingElement.style.left = `${newLeft}px`;
        this.draggingElement.style.top = `${newTop}px`;
      }
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

      // Ustal środek kształtu i aktualne wymiary
      const centerX = this.resizingShape.offsetLeft + this.resizingShape.offsetWidth / 2;
      const centerY = this.resizingShape.offsetTop + this.resizingShape.offsetHeight / 2;
      const currentWidth = this.resizingShape.offsetWidth;
      const currentHeight = this.resizingShape.offsetHeight;

      // Przeskaluj wymiary proporcjonalnie tylko dla kwadratów
      if (this.resizingShape.classList.contains('square')) {
        const newDimension = Math.max(this.minImageWidth, Math.min(this.maxImageWidth, currentWidth + deltaX));

        // Sprawdź, czy kształt wychodzi poza obszar .page-textarea
        const leftBoundary = centerX - newDimension / 2;
        const rightBoundary = centerX + newDimension / 2;
        const topBoundary = centerY - newDimension / 2;
        const bottomBoundary = centerY + newDimension / 2;

        if (
          leftBoundary >= 0 &&
          rightBoundary <= this.pageTextarea.nativeElement.clientWidth &&
          topBoundary >= 0 &&
          bottomBoundary <= this.pageTextarea.nativeElement.clientHeight
        ) {
          this.resizingShape.style.width = `${newDimension}px`;
          this.resizingShape.style.height = `${newDimension}px`;

          // Dostosuj pozycję na podstawie środka
          this.resizingShape.style.left = `${centerX - newDimension / 2}px`;
          this.resizingShape.style.top = `${centerY - newDimension / 2}px`;

          this.resizeStartX = clientX;
          this.resizeStartY = clientY;
        }
      } else {
        // Przeskaluj wymiary proporcjonalnie dla innych kształtów
        const newWidth = Math.max(this.minImageWidth, Math.min(this.maxImageWidth, currentWidth + deltaX));
        const newHeight = Math.max(this.minImageHeight, Math.min(this.maxImageHeight, currentHeight + deltaY));

        // Sprawdź, czy kształt wychodzi poza obszar .page-textarea
        const leftBoundary = centerX - newWidth / 2;
        const rightBoundary = centerX + newWidth / 2;
        const topBoundary = centerY - newHeight / 2;
        const bottomBoundary = centerY + newHeight / 2;

        if (
          leftBoundary >= 0 &&
          rightBoundary <= this.pageTextarea.nativeElement.clientWidth &&
          topBoundary >= 0 &&
          bottomBoundary <= this.pageTextarea.nativeElement.clientHeight
        ) {
          // Dostosuj pozycję na podstawie środka
          this.resizingShape.style.width = `${newWidth}px`;
          this.resizingShape.style.height = `${newHeight}px`;
          this.resizingShape.style.left = `${centerX - newWidth / 2}px`;
          this.resizingShape.style.top = `${centerY - newHeight / 2}px`;

          this.resizeStartX = clientX;
          this.resizeStartY = clientY;
        }
      }
    }
  }

  activateRubberTool(): void {
    this.rubberToolActive = !this.rubberToolActive; // Toggle rubber tool state
    this.rubberButtonColor = this.rubberToolActive ? 'green' : 'black'; // Change button color
  }

  createShapeElement(shape: string): HTMLElement {
    const shapeElement = document.createElement('div');
    shapeElement.classList.add('inserted-shape', shape);
    shapeElement.style.width = '150px';
    shapeElement.style.height = '150px';
    shapeElement.style.position = 'absolute';
    shapeElement.style.cursor = 'grab'; // Set cursor to indicate draggable element

    if (shape === 'square') {
      shapeElement.style.backgroundColor = 'red'; // Replace with your styling for a square
      shapeElement.style.width = '150px';
      shapeElement.style.height = '150px';
    } else if (shape === 'rectangle') {
      shapeElement.style.width = '150px';
      shapeElement.style.height = '70px';
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
    const editor = this.pageTextarea.nativeElement;
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

          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);

            // Użycie type assertion, aby poinformować TypeScript, że startContainer jest Element
            const anchorNode = range.startContainer as Element;
            const parentContainer = anchorNode.closest('.page-textarea');

            if (parentContainer) {
              range.deleteContents();
              range.insertNode(imgElement);

              // Przesunięcie kursora po obrazie
              const newRange = document.createRange();
              newRange.setStartAfter(imgElement);
              selection.removeAllRanges();
              selection.addRange(newRange);
            } else {
              console.warn("Selection is not within an element with the class 'page-textarea'.");
            }
            parentContainer.dispatchEvent(new InputEvent('input', { bubbles: true }));
          } else {
            // Jeśli nie znaleziono zaznaczenia, dodaj na koniec edytora lub obsłuż według potrzeb
            const parentContainer = this.editor.nativeElement.closest('.page-textarea');

            if (parentContainer) {
              this.editor.nativeElement.appendChild(imgElement);
            } else {
              console.warn("Editor is not within an element with the class 'page-textarea'.");
            }
            parentContainer.dispatchEvent(new InputEvent('input', { bubbles: true }));
          }

          this.editor.nativeElement.focus();
          this.cdr.detectChanges();
        })
        .catch((error) => {
          console.error('Error reading file:', error);
        })
        .finally(() => {
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

  importCsvOrJson() {
    const documentInput = document.getElementById('documentInput') as HTMLInputElement;

    // Resetujemy wartość elementu wejściowego, aby umożliwić dodanie tego samego pliku ponownie
    documentInput.value = '';

    // Trigger the click event on the hidden file input
    documentInput.click();
  }

  handleDocumentInput(event: any): void {
    const fileInput = event.target;
    const file = fileInput.files[0];

    if (file && file.type === 'text/csv') {
      this.readFileAsText(file)
        .then((csvText: string) => {
          const tableElements = this.createTableElementFromCsv(csvText);
          tableElements.forEach((table, index) => {
            if (index === 0) {
              this.insertTableAtCursor(table);
            } else {
              if (this.pages.length > index) {
                this.insertTableInExistingPage(table, index);
              } else {
                this.createNewPageWithTable(table);
              }
            }
          });

          this.cdr.detectChanges();
        })
        .catch((error) => {
          console.error('Error reading file:', error);
        })
        .finally(() => {
          fileInput.value = '';
        });
    }
  }

  insertTableInExistingPage(table: HTMLElement, pageIndex: number): void {
    const pages = this.editor.nativeElement.querySelectorAll('.page-textarea');
    if (pages.length > pageIndex) {
      const page = pages[pageIndex];
      page.appendChild(table);
    }
  }


  insertTableAtCursor(table: HTMLElement): void {
    const selection = window.getSelection();

    if (selection) {
      const anchorNode = selection.anchorNode as Node | null;

      if (anchorNode instanceof Element) {
        const parentContainer = anchorNode.closest('.page-textarea');

        if (parentContainer) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(table);
        } else {
          console.warn("Selection is not within an element with the class 'page-textarea'.");
        }
      }
    } else {
      this.editor.nativeElement.appendChild(table);
    }
  }

  createNewPageWithTable(table: HTMLElement): void {
    // Create and append a new page element
    const newPage = document.createElement('div');
    newPage.classList.add('page-textarea');
    newPage.contentEditable = 'true';
    this.editor.nativeElement.appendChild(newPage);

    // Append the table to the new page
    newPage.appendChild(table);

    // Update the pages array
    this.pageID += 1;
    this.pages.push(this.pageID);

    // Set cursor to the beginning of the new page
    this.setCursorToBeginningOfElement(newPage);

    // Trigger change detection
    this.cdr.detectChanges();
  }

  setCursorToBeginningOfElement(element: HTMLElement): void {
    const range = document.createRange();
    const selection = window.getSelection();
    range.setStart(element, 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }






  readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  createTableElementFromCsv(csvText: string): HTMLElement[] {
    const parsedData = this.parseCsv(csvText);
    const tables = [];
    let table, headerRow, tableWrapper;

    const createHeader = () => {
      headerRow = document.createElement('tr');
      Object.keys(parsedData[0]).forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        th.style.border = '1px solid black';
        th.style.padding = '5px';
        headerRow.appendChild(th);
      });
    };

    parsedData.forEach((row, index) => {
      // For every 20 rows or at start, create a new table
      if (index % 20 === 0 || index === 0) {
        table = document.createElement('table');
        table.style.borderCollapse = 'collapse';

        createHeader();
        table.appendChild(headerRow.cloneNode(true));

        // Create a wrapper div for the table
        tableWrapper = document.createElement('div');
        tableWrapper.className = 'inserted-table';
        tableWrapper.appendChild(table);

        tables.push(tableWrapper); // Push the wrapper instead of the table
      }

      // Create a table row
      const tr = document.createElement('tr');
      Object.values(row).forEach(value => {
        const td = document.createElement('td');
        if (typeof value === "string") {
          td.textContent = value;
        }
        td.style.border = '1px solid black';
        td.style.padding = '5px';
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });

    return tables;
  }




  // @ts-ignore
  parseCsv(csvText: string): any[] {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');

    return lines.slice(1).map(line => {
      const cells = line.split(',');
      return headers.reduce((obj, nextKey, index) => {
        obj[nextKey] = cells[index];
        return obj;
      }, {});
    });
  }


}
