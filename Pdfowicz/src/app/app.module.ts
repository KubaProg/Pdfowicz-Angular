import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ButtonsModule } from "@progress/kendo-angular-buttons";
import { IntlModule } from "@progress/kendo-angular-intl";
import { PDFExportModule } from "@progress/kendo-angular-pdf-export";
import {DashboardComponent} from "./components/dashboard.component";

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent

  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatIconModule,
    MatButtonModule,
    IntlModule,
    PDFExportModule,
    ButtonsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
