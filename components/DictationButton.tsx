import React, { useEffect, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface DictationButtonProps {
  onResult: (text: string) => void;
  className?: string;
}

export const DictationButton: React.FC<DictationButtonProps> = ({ onResult, className = '' }) => {
  const { text, isListening, startListening, stopListening, hasRecognitionSupport } = useSpeechRecognition();
  const [lastProcessedLength, setLastProcessedLength] = useState(0);

  useEffect(() => {
    if (text.length > lastProcessedLength) {
      const newText = text.slice(lastProcessedLength);
      onResult(newText);
      setLastProcessedLength(text.length);
    }
  }, [text, lastProcessedLength, onResult]);

  useEffect(() => {
    if (!isListening) {
      setLastProcessedLength(0); // Reset when stopped
    }
  }, [isListening]);

  if (!hasRecognitionSupport) return null;

  return (
    <button
      type="button"
      onClick={isListening ? stopListening : startListening}
      className={`p-2 rounded-full transition-colors flex items-center justify-center ${
        isListening 
          ? 'bg-red-100 text-red-600 hover:bg-red-200 animate-pulse' 
          : 'bg-gray-100 text-gray-500 hover:bg-brand-50 hover:text-brand-600'
      } ${className}`}
      title={isListening ? "Parar Ditado" : "Iniciar Ditado de Voz"}
    >
      {isListening ? <Mic size={18} /> : <MicOff size={18} />}
    </button>
  );
};
