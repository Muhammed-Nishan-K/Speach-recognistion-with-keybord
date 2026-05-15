import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SpeechRecognitionService, SpeechState } from './speech-recognition.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  isListening = false;
  
  // The fully editable text
  editableText = '';
  
  interimText = '';
  error = '';
  
  // Keep track of what we've already appended from the service to avoid duplicates
  private lastServiceTextLength = 0;
  
  private subscription?: Subscription;
  
  // Track active keys for the visual keyboard
  activeKeys = new Set<string>();

  constructor(private speechService: SpeechRecognitionService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.subscription = this.speechService.state$.subscribe((state: SpeechState) => {
      this.isListening = state.isListening;
      this.interimText = state.interimText;
      this.error = state.error || '';
      
      // Append only new final text to our editable area
      const newFinalText = state.text.substring(this.lastServiceTextLength);
      if (newFinalText) {
        this.editableText += newFinalText;
        this.lastServiceTextLength = state.text.length;
      }
      
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  toggleListening() {
    if (this.isListening) {
      this.speechService.stopListening();
    } else {
      this.speechService.startListening();
    }
    this.cdr.detectChanges();
  }

  clearText() {
    this.speechService.clearText();
    this.editableText = '';
    this.lastServiceTextLength = 0;
    this.cdr.detectChanges();
  }

  async copyText() {
    const fullText = (this.editableText + ' ' + this.interimText).trim();
    if (fullText) {
      try {
        await navigator.clipboard.writeText(fullText);
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    }
  }

  // Visual Keyboard Logic
  
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    this.activeKeys.add(event.code);
    this.cdr.detectChanges();
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent) {
    this.activeKeys.delete(event.code);
    this.cdr.detectChanges();
  }
  
  isKeyActive(code: string): boolean {
    return this.activeKeys.has(code);
  }
}
