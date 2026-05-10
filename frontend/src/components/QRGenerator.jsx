import { QRCodeSVG } from 'qrcode.react';

const QRGenerator = ({ restaurantId }) => {
  if (!restaurantId) return null;

  // Assuming a standard set of 6 tables for this phase
  const tables = [1, 2, 3, 4, 5, 6];

  const handlePrint = () => {
    window.print();
  };

  return (
    <section className="mt-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Table QR Codes</h2>
          <p className="mt-1 text-sm text-slate-500">
            Download or print these codes for physical table placement.
          </p>
        </div>
        
        <button
          onClick={handlePrint}
          className="print:hidden flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print QR Codes
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2 print:gap-12">
        {tables.map((tableId) => {
          const qrValue = `${window.location.origin}/?restaurantId=${restaurantId}&tableId=${tableId}`;
          
          return (
            <div 
              key={tableId}
              className="group flex flex-col items-center justify-center rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-md print:border-slate-300 print:shadow-none"
            >
              <p className="mb-6 text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                RestoSync Smart Table
              </p>
              
              <div className="rounded-3xl bg-slate-50 p-6 ring-1 ring-slate-100 group-hover:bg-white transition-colors">
                <QRCodeSVG 
                  value={qrValue} 
                  size={160}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <div className="mt-8 text-center">
                <h3 className="text-3xl font-black text-slate-900">Table {tableId}</h3>
                <p className="mt-2 text-xs font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                  Scan to Open Menu
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @media print {
          body {
            background: white !important;
          }
          .min-h-screen {
            min-height: auto !important;
            padding: 0 !important;
          }
          header, footer, .stat-cards {
            display: none !important;
          }
        }
      `}</style>
    </section>
  );
};

export default QRGenerator;
