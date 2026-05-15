import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';

declare var window: any;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export interface SpeechState {
  isListening: boolean;
  text: string;
  interimText: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SpeechRecognitionService {
  private recognition: any;
  private isListening = false;
  private finalTranscript = '';

  private stateSubject = new Subject<SpeechState>();
  public state$ = this.stateSubject.asObservable();

  constructor(private zone: NgZone) {
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.zone.run(() => {
          this.isListening = true;
          this.updateState();
        });
      };

      this.recognition.onresult = (event: any) => {
        this.zone.run(() => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              this.finalTranscript += event.results[i][0].transcript + ' ';
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          this.updateState(interimTranscript);
        });
      };

      this.recognition.onerror = (event: any) => {
        this.zone.run(() => {
          this.isListening = false;
          let errorMessage = 'Speech recognition error: ' + event.error;
          if (event.error === 'not-allowed') {
            errorMessage = 'Microphone permission denied. Please allow access.';
          } else if (event.error === 'no-speech') {
             // Just a timeout on speech
             errorMessage = '';
          }
          this.updateState();
          this.stateSubject.next({
            isListening: this.isListening,
            text: this.finalTranscript,
            interimText: '',
            error: errorMessage
          });
        });
      };

      this.recognition.onend = () => {
        this.zone.run(() => {
          // Restart if still marked as listening (continuous listening)
          if (this.isListening) {
              try {
                  this.recognition.start();
              } catch (e) {
                  // Catch DOMException if already started
              }
          } else {
              this.updateState();
          }
        });
      };
    } else {
      setTimeout(() => {
        this.stateSubject.next({
          isListening: false,
          text: '',
          interimText: '',
          error: 'Your browser does not support the Web Speech API. Please use Google Chrome or Edge.'
        });
      }, 0);
    }
  }

  startListening() {
    if (!this.recognition) return;
    this.isListening = true;
    this.updateState();
    try {
        this.recognition.start();
    } catch (e) {
        // Handle DOMException if already listening
    }
  }

  stopListening() {
    if (!this.recognition) return;
    this.isListening = false;
    this.updateState();
    this.recognition.stop();
  }
  
  clearText() {
    this.finalTranscript = '';
    this.updateState();
  }

  private updateState(interimTranscript: string = '') {
    this.stateSubject.next({
      isListening: this.isListening,
      text: this.finalTranscript,
      interimText: interimTranscript,
      error: ''
    });
  }
}
