/**
 * Print utilities for generating printer-friendly layouts
 */

export interface PrintOptions {
    title?: string;
    orientation?: 'portrait' | 'landscape';
    includeTimestamp?: boolean;
    includeLocation?: boolean;
}

/**
 * Generate print-friendly HTML for a table
 */
export function generatePrintTable(
    headers: string[],
    rows: any[][],
    options: PrintOptions = {}
): string {
    const {
        title = 'Report',
        orientation = 'portrait',
        includeTimestamp = true,
        includeLocation = true
    } = options;

    const timestamp = new Date().toLocaleString();
    const location = localStorage.getItem('activeLocationName') || 'Unknown Location';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        @media print {
            @page {
                size: ${orientation};
                margin: 0.5in;
            }
            body {
                margin: 0;
                padding: 0;
            }
            .no-print {
                display: none !important;
            }
        }
        
        body {
            font-family: 'Arial', sans-serif;
            font-size: 11pt;
            color: #000;
            background: #fff;
        }
        
        .print-header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
        }
        
        .print-header h1 {
            margin: 0 0 5px 0;
            font-size: 18pt;
            font-weight: bold;
        }
        
        .print-meta {
            font-size: 9pt;
            color: #666;
            margin-top: 5px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        
        th {
            background: #f0f0f0;
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
            font-weight: bold;
            font-size: 10pt;
        }
        
        td {
            border: 1px solid #ccc;
            padding: 6px 8px;
            font-size: 10pt;
        }
        
        tr:nth-child(even) {
            background: #f9f9f9;
        }
        
        .print-footer {
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px solid #ccc;
            font-size: 9pt;
            color: #666;
            text-align: center;
        }
        
        .text-right {
            text-align: right;
        }
        
        .text-center {
            text-align: center;
        }
        
        .font-bold {
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="print-header">
        <h1>${title}</h1>
        <div class="print-meta">
            ${includeLocation ? `<div><strong>Location:</strong> ${location}</div>` : ''}
            ${includeTimestamp ? `<div><strong>Generated:</strong> ${timestamp}</div>` : ''}
        </div>
    </div>
    
    <table>
        <thead>
            <tr>
                ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
        </thead>
        <tbody>
            ${rows.map(row => `
                <tr>
                    ${row.map(cell => `<td>${cell}</td>`).join('')}
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="print-footer">
        <p>This is a computer-generated report. No signature required.</p>
    </div>
</body>
</html>
    `;
}

/**
 * Print the current page or custom HTML
 */
export function printDocument(html?: string) {
    if (html) {
        // Print custom HTML
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups to print');
            return;
        }

        printWindow.document.write(html);
        printWindow.document.close();

        // Wait for content to load, then print
        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
            // Don't close automatically - let user close it
        };
    } else {
        // Print current page
        window.print();
    }
}

/**
 * Export table data to CSV
 */
export function exportToCSV(
    headers: string[],
    rows: any[][],
    filename: string = 'export.csv'
) {
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => {
            // Escape cells containing commas or quotes
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('"')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
        }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
