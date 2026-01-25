/**
 * Browser API type extensions for APIs not fully typed in lib.dom
 */
declare global {
  interface Navigator {
    /** iOS Safari standalone web app mode detection */
    standalone?: boolean;
  }

  interface Window {
    /** Webkit Speech Recognition (Safari, older Chrome) */
    webkitSpeechRecognition?: typeof SpeechRecognition;
    /** Standard Speech Recognition API */
    SpeechRecognition?: typeof SpeechRecognition;
  }
}

export {};
