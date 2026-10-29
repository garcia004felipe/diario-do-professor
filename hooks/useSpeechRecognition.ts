import { useState, useEffect, useRef, useCallback } from 'react';

export const useSpeechRecognition = () => {
    const [text, setText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [hasRecognitionSupport, setHasRecognitionSupport] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            setHasRecognitionSupport(true);
        }
    }, []);

    const startListening = useCallback(() => {
        if (!hasRecognitionSupport) return;
        
        setText('');
        setIsListening(true);

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'pt-BR';

        recognition.onresult = (event: any) => {
            let fullTranscript = '';
            for(let i=0; i<event.results.length; i++) {
                fullTranscript += event.results[i][0].transcript;
            }
            setText(fullTranscript);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
             setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, [hasRecognitionSupport]);

    const stopListening = useCallback(() => {
        setIsListening(false);
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    }, []);

    return {
        text,
        setText,
        isListening,
        startListening,
        stopListening,
        hasRecognitionSupport
    };
};
