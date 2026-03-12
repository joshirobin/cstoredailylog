import { useState } from 'react';
import { Camera } from 'lucide-react';

interface BarcodeScannerProps {
    buttonText?: string;
    onScanned: (value: string) => void;
    stopOnScan?: boolean;
}

export default function BarcodeScanner({ buttonText = "Scan Barcode", onScanned, stopOnScan = false }: BarcodeScannerProps) {
    const [inputValue, setInputValue] = useState('');

    const handleSimulateScan = () => {
        if (inputValue) {
            onScanned(inputValue);
            if (!stopOnScan) {
                setInputValue('');
            }
        }
    };

    return (
        <div className="flex items-center gap-3">
            <input
                type="text"
                placeholder="Simulate barcode scan..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="input-field flex-1 max-w-sm"
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSimulateScan();
                }}
            />
            <button
                onClick={handleSimulateScan}
                className="btn-secondary whitespace-nowrap"
            >
                <Camera className="w-4 h-4" />
                {buttonText}
            </button>
        </div>
    );
}
