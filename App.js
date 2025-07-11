import React, { useState, useEffect, useMemo, useRef, useContext, createContext, useCallback } from 'react';
import * as z from 'zod';

// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// --- APP LOADER (BOOTSTRAPPER) ---
// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Detta är den nya startpunkten för applikationen.
// Den säkerställer att alla externa bibliotek (som React Query)
// är fullt laddade innan själva applikationen renderas.
// Detta löser race condition-problemet permanent.

const LoaderStyles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f8fafc',
        fontFamily: 'sans-serif',
        color: '#0f172a'
    },
    logo: {
        height: '6rem',
        marginBottom: '2rem'
    },
    text: {
        fontSize: '1.25rem',
        fontWeight: '600',
        color: '#334155'
    },
    errorText: {
        fontSize: '1.1rem',
        color: '#b91c1c',
        textAlign: 'center',
        maxWidth: '400px'
    }
};

function AppLoader() {
    const [status, setStatus] = useState('loading'); // 'loading', 'ready', 'error'

    useEffect(() => {
        let retries = 40; // Vänta upp till 10 sekunder
        const interval = setInterval(() => {
            if (window.ReactQuery) {
                clearInterval(interval);
                setStatus('ready');
            } else {
                retries--;
                if (retries <= 0) {
                    clearInterval(interval);
                    console.error("CRITICAL: React Query CDN failed to load after 10 seconds.");
                    setStatus('error');
                }
            }
        }, 250);

        return () => clearInterval(interval);
    }, []);

    if (status === 'loading') {
        return (
            <div style={LoaderStyles.container}>
                <img src="https://raw.githubusercontent.com/NordSync/Guldkant-Logga/refs/heads/main/Guldkant%20logga.svg" alt="Guldkant Logotyp" style={LoaderStyles.logo} />
                <p style={LoaderStyles.text}>Laddar portalen...</p>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div style={LoaderStyles.container}>
                <img src="https://raw.githubusercontent.com/NordSync/Guldkant-Logga/refs/heads/main/Guldkant%20logga.svg" alt="Guldkant Logotyp" style={LoaderStyles.logo} />
                <p style={LoaderStyles.errorText}><b>Kritiskt fel:</b> Kunde inte ladda nödvändiga bibliotek. Applikationen kan inte starta. Kontrollera webbläsarens konsol för mer information och kontakta support.</p>
            </div>
        );
    }

    return <InitializedApp />;
}


// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// --- INITIALIZED APPLICATION ---
// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Denna komponent innehåller hela den ursprungliga applikationslogiken.
// Den renderas endast *efter* att AppLoader har bekräftat att React Query är laddat.

function InitializedApp() {
    // Bibliotek och klient kan nu säkert initieras här.
    const { QueryClient, QueryClientProvider, useQuery, useMutation } = window.ReactQuery;
    const queryClient = new QueryClient();

    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    // --- API SERVICE LAYER (PROD ENDPOINTS) ---
    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    const API = {
        getQuotes: async () => {
            const response = await fetch('https://nordsym.app.n8n.cloud/webhook/quotes');
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            if (!Array.isArray(data)) {
                console.error("API did not return an array:", data);
                return [];
            }
            return data;
        },
        saveQuote: async (quoteData) => {
            const endpointUrl = 'https://nordsym.app.n8n.cloud/webhook/guldkant-offer-intake-v2';
            console.log(`Saving quote to: ${endpointUrl}`, quoteData);
            const response = await fetch(endpointUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(quoteData),
            });
            if (!response.ok) {
                const errorBody = await response.text();
                console.error('Failed to save quote. Status:', response.status, 'Body:', errorBody);
                throw new Error(`Failed to save quote. Status: ${response.status}`);
            }
            return response.json();
        },
        dispatchQuoteEmail: async (quoteId) => {
            const endpointUrl = 'https://nordsym.app.n8n.cloud/webhook/quote/dispatch';
            const payload = { offerId: quoteId };
            console.log(`Dispatching email for quote. Payload:`, payload);
            const response = await fetch(endpointUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorBody = await response.text();
                console.error('Failed to dispatch quote. Status:', response.status, 'Body:', errorBody);
                throw new Error(`Failed to dispatch quote. Status: ${response.status}`);
            }
            return response.json();
        },
    };

    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    // --- IKON-BIBLIOTEK ---
    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    const AlertCircleIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" {...props}><path d="M128,24a104,104,0,1,0,104,104A104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-40a8,8,0,0,1,16,0Zm0-80V80a8,8,0,0,1,16,0v48a8,8,0,0,1-16,0Z"></path></svg>);
    const ChartLineUpIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" {...props}><path d="M229.66,85.66,160,155.31,120,115.31,50.34,185a8,8,0,0,1-11.32-11.32l75.34-75.33a8,8,0,0,1,11.32,0L160,132.69l64-64a8,8,0,0,1,11.32,11.32L229.66,85.66Z M240,208H16a8,8,0,0,1,0-16H240a8,8,0,0,1,0,16Z"></path></svg>);
    const CornersOutIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" fill="currentColor" viewBox="0 0 256 256" {...props}><path d="M168,40H216V88a8,8,0,0,0,16,0V40a16,16,0,0,0-16-16H168a8,8,0,0,0,0,16ZM88,216H40V168a8,8,0,0,0-16,0v48a16,16,0,0,0,16,16H88a8,8,0,0,0,0-16ZM40,88V40H88a8,8,0,0,0,0-16H40A16,16,0,0,0,24,40V88a8,8,0,0,0,16,0Zm176,80v48H168a8,8,0,0,0,0,16h48a16,16,0,0,0,16-16V168a8,8,0,0,0-16,0Z"></path></svg>);
    const InfoIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" {...props}><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM120,108a8,8,0,0,1,8-8h0a8,8,0,0,1,0,16H128A8,8,0,0,1,120,108Zm12,24a8,8,0,0,1,8,8v32a8,8,0,0,1-16,0V140a8,8,0,0,1,8-8Z"></path></svg> );
    const DivideIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" {...props}><path d="M216,128a8,8,0,0,1-8,8H48a8,8,0,0,1,0-16H208A8,8,0,0,1,216,128ZM128,72a12,12,0,1,0,12,12A12,12,0,0,0,128,72Zm0,100a12,12,0,1,0,12,12A12,12,0,0,0,128,172Z"></path></svg> );
    const InvoiceIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" {...props}><path d="M216,88H152V24a8,8,0,0,0-8-8H48A16,16,0,0,0,32,32V224a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A8,8,0,0,0,216,88ZM160,80h43.31L160,36.69ZM208,224H48V32h96v56a16,16,0,0,0,16,16h56Zm-36-80a8,8,0,0,1-8,8H92a8,8,0,0,1,0-16h72A8,8,0,0,1,172,144Zm-36,32a8,8,0,0,1-8,8H92a8,8,0,0,1,0-16h36A8,8,0,0,1,136,176Z"></path></svg> );
    const BriefcaseIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" {...props}><path d="M216,64H176V56a24,24,0,0,0-24-24H104A24,24,0,0,0,80,56v8H40A16,16,0,0,0,24,80V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64ZM96,56a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96ZM224,200a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V80a8,8,0,0,1,8-8H216a8,8,0,0,1,8,8Z"></path></svg> );
    const CalendarCheckIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" {...props}><path d="M216,32H40A24,24,0,0,0,16,56V200a24,24,0,0,0,24,24H216a24,24,0,0,0,24-24V56A24,24,0,0,0,216,32Zm8,168a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V80H224ZM224,64H32V56a8,8,0,0,1,8-8H216a8,8,0,0,1,8,8ZM157.66,133.66,112,180,84.69,152.69a8,8,0,0,1,11.31-11.32L112,157.38l40.34-40.34a8,8,0,0,1,11.32,11.32Z"></path></svg> );
    const CheckCircleIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" {...props}><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"></path></svg> );
    const ChevronLeftIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" fill="currentColor" viewBox="0 0 256 256" {...props}><path d="M165.66,202.34a8,8,0,0,1-11.32,0L80,128,154.34,53.66a8,8,0,0,1,11.32,11.32L97,128l68.66,63.02A8,8,0,0,1,165.66,202.34Z"></path></svg> );
    const ChevronRightIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" fill="currentColor" viewBox="0 0 256 256" {...props}><path d="M181.66,133.66,107.32,208a8,8,0,0,1-11.32-11.32L164.69,128,96,59.31A8,8,0,0,1,107.32,48l74.34,74.34A8,8,0,0,1,181.66,133.66Z"></path></svg> );
    const CalendarIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" {...props}><path d="M216,32H40A24,24,0,0,0,16,56V200a24,24,0,0,0,24,24H216a24,24,0,0,0,24-24V56A24,24,0,0,0,216,32Zm8,168a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V80H224ZM224,64H32V56a8,8,0,0,1,8-8H216a8,8,0,0,1,8,8Z"></path></svg> );
    const FilePdfIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" {...props}><path d="M216,88H152V24a8,8,0,0,0-8-8H48A16,16,0,0,0,32,32V224a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A8,8,0,0,0,216,88ZM160,80h43.31L160,36.69ZM208,224H48a8,8,0,0,1-8-8V32a8,8,0,0,1,8-8h96v56a16,16,0,0,0,16,16h56v96A8,8,0,0,1,208,224Z"></path></svg> );
    const FileSearchIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" {...props}><path d="M232.49,215.51,185,168a92.12,92.12,0,1,0-17,17l47.54,47.55a12,12,0,0,0,17-17ZM44,112a68,68,0,1,1,68,68A68.07,68.07,0,0,1,44,112Z"></path></svg> );
    const CaretUpDownIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" {...props}><path d="M181.66,101.66,133.66,53.66a8,8,0,0,0-11.32,0L73.66,101.66A8,8,0,0,0,80,112h96a8,8,0,0,0,6.34-13.66ZM176,144H80a8,8,0,0,0-6.34,13.66l48,48a8,8,0,0,0,11.32,0l48-48A8,8,0,0,0,176,144Z"></path></svg> );
    const XIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" fill="currentColor" viewBox="0 0 256 256" {...props}><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path></svg> );

    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    // --- HJÄLPFUNKTIONER & KONTEXT ---
    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    const GuldkantLogo = ({ className, size = 'h-16' }) => ( <div className={`flex items-center gap-4 ${className}`}> <img src="https://raw.githubusercontent.com/NordSync/Guldkant-Logga/refs/heads/main/Guldkant%20logga.svg" alt="Guldkant Logotyp" className={size} /> <span className="text-3xl font-bold">Guldkant Portalen</span> </div> );
    const ThemeContext = createContext();
    const themes = { dark: { bg: 'bg-gray-900', cardBg: 'bg-gray-800', text: 'text-gray-200', textSecondary: 'text-gray-400', accent: 'text-cyan-400', border: 'border-gray-700', inputBg: 'bg-gray-700', buttonPrimaryBg: 'bg-cyan-500', buttonPrimaryText: 'text-gray-900', buttonPrimaryHover: 'hover:bg-cyan-400', buttonSecondaryBg: 'bg-gray-700', buttonSecondaryText: 'text-gray-200', buttonSecondaryHover: 'hover:bg-gray-600', modalOverlay: 'bg-black/80 backdrop-blur-md', navActive: 'bg-cyan-500/10 text-cyan-400 border-cyan-500', navInactive: 'text-gray-400 border-transparent hover:bg-gray-700/50', filterActive: 'bg-cyan-500 text-gray-900', filterInactive: 'bg-gray-700 hover:bg-gray-600', ringOffset: 'dark:ring-offset-gray-900' }, light: { bg: 'bg-slate-50', cardBg: 'bg-white', text: 'text-slate-800', textSecondary: 'text-slate-500', accent: 'text-cyan-600', border: 'border-slate-200', inputBg: 'bg-slate-100', buttonPrimaryBg: 'bg-cyan-500', buttonPrimaryText: 'text-white', buttonPrimaryHover: 'hover:bg-cyan-600', buttonSecondaryBg: 'bg-slate-200', buttonSecondaryText: 'text-slate-800', buttonSecondaryHover: 'hover:bg-slate-300', modalOverlay: 'bg-slate-900/80 backdrop-blur-md', navActive: 'bg-cyan-500/10 text-cyan-600 border-cyan-500', navInactive: 'text-slate-600 border-transparent hover:bg-slate-200', filterActive: 'bg-cyan-500 text-white', filterInactive: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-200', ringOffset: 'ring-offset-slate-50' } };
    const focusClasses = 'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-white dark:focus:ring-offset-gray-900';
    const formatDate = (dateString, options = { year: 'numeric', month: '2-digit', day: '2-digit' }) => { if (!dateString) return ''; const date = new Date(dateString); return isNaN(date) ? '' : date.toLocaleDateString('sv-SE', options); };
    const formatTimestamp = (timestamp) => new Date(timestamp).toLocaleString('sv-SE');
    const calculateTotal = (quote) => { if (!quote) return 0; const base = (quote.guestCount || 0) * (quote.pricePerGuest || 0); const staff = (quote.chefCost || 0) + (quote.servingStaffCost || 0); const custom = (quote.customCosts || []).reduce((sum, cost) => sum + (Number(cost.amount) || 0), 0); const subTotal = base + staff + custom; const discountedSubTotal = subTotal - (quote.discountAmount || 0); const vat = discountedSubTotal * 0.12; return discountedSubTotal + vat; };
    function useOnClickOutside(ref, handler) { useEffect(() => { const listener = (event) => { if (!ref.current || ref.current.contains(event.target)) return; handler(event); }; document.addEventListener("mousedown", listener); document.addEventListener("touchstart", listener); return () => { document.removeEventListener("mousedown", listener); document.removeEventListener("touchstart", listener); }; }, [ref, handler]); }
    const useScriptLoader = (scriptUrls) => { const [status, setStatus] = useState('loading'); useEffect(() => { let isMounted = true; const loadScripts = async () => { try { for (const url of scriptUrls) { await new Promise((resolve, reject) => { if (document.querySelector(`script[src="${url}"]`)) return resolve(); const script = document.createElement('script'); script.src = url; script.async = true; script.onload = resolve; script.onerror = () => reject(new Error(`Script load error for ${url}`)); document.head.appendChild(script); }); } let retries = 20; const checkInterval = setInterval(() => { if (!isMounted) { clearInterval(checkInterval); return; } if (window.jspdf && typeof window.jspdf.jsPDF === 'function' && typeof window.jspdf.jsPDF.API.autoTable === 'function') { clearInterval(checkInterval); setStatus('ready'); } else if (retries-- === 0) { clearInterval(checkInterval); console.error('PDF libraries did not attach to window object after polling.'); setStatus('error'); } }, 500); } catch (error) { if (isMounted) { setStatus('error'); } } }; loadScripts(); return () => { isMounted = false; }; }, [scriptUrls]); return status; };

    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    // --- UI-KOMPONENTER (Generiska & Saknade) ---
    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    const Input = React.forwardRef(({ label, error, ...props }, ref) => { const { classes } = useContext(ThemeContext); return ( <div> {label && <label className={`${classes.textSecondary} text-xs block mb-1`}>{label}</label>} <input ref={ref} {...props} className={`w-full p-2 rounded ${classes.inputBg} ${classes.text} border ${error ? 'border-red-500' : classes.border} transition-colors shadow-sm ${focusClasses}`} /> {error && <p className="text-red-500 text-xs mt-1">{error}</p>} </div> ); });
    const NumberInput = React.memo(({ label, error, name, value, onChange, onBlur, ...props }) => { const { classes } = useContext(ThemeContext); return ( <div> {label && <label className={`${classes.textSecondary} text-xs block mb-1`}>{label}</label>} <input {...props} type="number" name={name} value={value} onChange={onChange} onBlur={onBlur} className={`w-full p-2 rounded ${classes.inputBg} ${classes.text} border ${error ? 'border-red-500' : classes.border} transition-colors shadow-sm ${focusClasses}`} /> {error && <p className="text-red-500 text-xs mt-1">{error}</p>} </div> ); });
    const Textarea = React.forwardRef(({ label, ...props }, ref) => { const { classes } = useContext(ThemeContext); return ( <div> {label && <label className={`${classes.textSecondary} text-xs block mb-1`}>{label}</label>} <textarea ref={ref} {...props} rows="3" className={`w-full p-2 rounded ${classes.inputBg} ${classes.text} border ${classes.border} transition-colors shadow-sm ${focusClasses}`} /> </div> ); });
    const Checkbox = ({ label, ...props }) => ( <label className="flex items-center space-x-3 cursor-pointer"> <input type="checkbox" {...props} className={`h-4 w-4 rounded bg-gray-500 border-gray-400 text-cyan-500 focus:ring-cyan-600 ${focusClasses}`} /> <span>{label}</span> </label> );
    const statusTextMap = { 'utkast': 'Utkast', 'förslag-skickat': 'Förslag Skickat', 'godkänd': 'Godkänd', 'genomförd': 'Genomförd', 'betald': 'Betald', 'förlorad': 'Förlorad Affär', 'arkiverad': 'Arkiverad' };
    const statusColors = { utkast: 'bg-yellow-500', 'förslag-skickat': 'bg-blue-500', godkänd: 'bg-green-500', genomförd: 'bg-blue-700', betald: 'bg-purple-500', förlorad: 'bg-red-500', arkiverad: 'bg-gray-500' };
    const Spinner = () => <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>;
    const Toast = ({ toast, onUndo }) => { if (!toast) return null; return ( <div className={`fixed bottom-5 right-5 p-4 rounded-lg shadow-lg text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'} flex items-center gap-4`}> <span>{toast.message}</span> {toast.undoable && <button onClick={onUndo} className="font-bold underline hover:text-gray-200">Ångra</button>} </div> ); };
    const ModalSection = ({ title, children, isOpen, onToggle }) => { const { classes } = useContext(ThemeContext); return ( <fieldset className={`border ${classes.border} rounded-lg p-4 mt-6`}> <legend className={`px-2 font-semibold text-md ${classes.accent} cursor-pointer select-none`} onClick={onToggle}> {title} <span className="ml-2 font-mono">{isOpen ? '−' : '+'}</span> </legend> {isOpen && <div className="space-y-4 pt-2">{children}</div>} </fieldset> ); };
    const EventLog = ({ events }) => { const { classes } = useContext(ThemeContext); if (!events || events.length === 0) return <p className={`${classes.textSecondary} text-sm`}>Inga händelser loggade.</p>; return (<div className="space-y-2">{events.slice().reverse().map((event, index) => ( <div key={index} className="text-sm"> <span className={`font-semibold ${classes.textSecondary}`}>{formatTimestamp(event.timestamp)}:</span> <span className="ml-2">{event.event}</span> </div> ))}</div> ); };

    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    // --- FIL: components/NordSymSupportHub.js ---
    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    const NordSymSupportHub = ({ isOpen, onClose }) => {
        const { classes } = useContext(ThemeContext);
        const [modalView, setModalView] = useState('welcome');
        const [formState, setFormState] = useState({ submitting: false, succeeded: false, error: null });

        const handleFormSubmit = async (event) => {
            event.preventDefault();
            setFormState(prev => ({ ...prev, submitting: true, error: null }));
            const form = event.target;
            const formData = new FormData(form);
            try {
                const response = await fetch("https://formspree.io/f/xeokylww", {
                    method: 'POST',
                    body: formData,
                    headers: { 'Accept': 'application/json' }
                });
                if (response.ok) {
                    setFormState(prev => ({ ...prev, submitting: false, succeeded: true }));
                    form.reset();
                } else {
                    const data = await response.json();
                    const errorMessage = data.errors ? data.errors.map(e => e.message).join(', ') : "Ett fel uppstod.";
                    setFormState(prev => ({ ...prev, submitting: false, error: errorMessage }));
                }
            } catch (error) {
                setFormState(prev => ({ ...prev, submitting: false, error: "Kunde inte skicka meddelandet. Kontrollera din anslutning." }));
            }
        };

        useEffect(() => {
            if (formState.succeeded) {
                const timer = setTimeout(() => {
                    onClose();
                    setTimeout(() => {
                        setModalView('welcome');
                        setFormState({ submitting: false, succeeded: false, error: null });
                    }, 300);
                }, 3000);
                return () => clearTimeout(timer);
            }
        }, [formState.succeeded, onClose]);
        
        useEffect(() => {
            if (!isOpen) {
                const timer = setTimeout(() => {
                    setModalView('welcome');
                    setFormState({ submitting: false, succeeded: false, error: null });
                }, 300); 
                return () => clearTimeout(timer);
            }
        }, [isOpen]);

        const WelcomeView = () => (
            <>
                <div className="text-center">
                    <h3 className={`text-2xl font-bold ${classes.accent}`}>Support & Information</h3>
                    <p className={`${classes.textSecondary} mt-2`}>Portalen drivs av NordSym AB</p>
                </div>
                <div className={`mt-6 p-4 rounded-lg ${classes.inputBg} border ${classes.border}`}>
                    <h4 className="font-semibold">Framtiden, Förenklad.</h4>
                    <p className={`mt-2 text-sm ${classes.textSecondary}`}>
                        Vi är arkitekterna bakom intelligenta ekosystem som detta. Vårt uppdrag är att lösa komplexa problem med klarhet, precision och en orubblig tro på teknologins potential.
                    </p>
                    <div className="mt-4 text-sm">
                        <p><strong>Kontakt:</strong> Gustav@nordsym.com</p>
                        <p><strong>Telefon:</strong> 070-5292583</p>
                    </div>
                </div>
                <div className="mt-6">
                    <button onClick={() => setModalView('form')} className={`w-full ${classes.buttonPrimaryBg} ${classes.buttonPrimaryText} ${classes.buttonPrimaryHover} px-5 py-2.5 rounded-lg font-semibold transition-colors shadow ${focusClasses}`}>
                        Lämna Feedback eller Kontakta Support
                    </button>
                </div>
            </>
        );

        const FormView = () => {
            if (formState.succeeded) {
                return (
                    <div className="text-center p-8">
                        <CheckCircleIcon className={`w-16 h-16 mx-auto text-green-500 mb-4`} />
                        <h3 className={`text-2xl font-bold ${classes.accent}`}>Tack för ditt meddelande!</h3>
                        <p className={`${classes.textSecondary} mt-2`}>Vi har tagit emot din feedback och återkommer snart.</p>
                    </div>
                );
            }
            return (
                <>
                    <div className="text-center mb-6">
                        <h3 className={`text-2xl font-bold ${classes.accent}`}>Feedback & Support</h3>
                        <p className={`${classes.textSecondary} mt-2`}>Har du en fråga, ett problem eller en idé? Låt oss veta!</p>
                    </div>
                    <form onSubmit={handleFormSubmit} className="space-y-4">
                        <Input label="Ditt Namn" id="name" name="name" type="text" required />
                        <Input label="Din E-post" id="email" name="email" type="email" required />
                        <Input label="Ämne" id="subject" name="subject" type="text" required />
                        <Textarea label="Meddelande" id="message" name="message" required />
                        {formState.error && <p className="text-red-500 text-sm">{formState.error}</p>}
                        <div className="flex items-center justify-end gap-4 pt-4">
                            <button type="button" onClick={() => setModalView('welcome')} className={`${classes.buttonSecondaryBg} ${classes.buttonSecondaryText} ${classes.buttonSecondaryHover} px-5 py-2.5 rounded-lg font-semibold transition-colors ${focusClasses}`}> Tillbaka </button>
                            <button type="submit" disabled={formState.submitting} className={`w-40 ${classes.buttonPrimaryBg} ${classes.buttonPrimaryText} ${classes.buttonPrimaryHover} px-5 py-2.5 rounded-lg font-semibold transition-colors shadow disabled:opacity-50 disabled:cursor-wait ${focusClasses}`}>
                                {formState.submitting ? <Spinner/> : 'Skicka'}
                            </button>
                        </div>
                    </form>
                </>
            );
        }
        
        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in-fast">
                <div onClick={e => e.stopPropagation()} className={`${classes.cardBg} w-full max-w-2xl rounded-xl shadow-2xl flex flex-col relative`}>
                    <button onClick={onClose} className={`absolute top-3 right-3 p-2 rounded-full hover:bg-red-500/10 ${focusClasses}`}>
                        <XIcon className="w-6 h-6 hover:text-red-500"/>
                    </button>
                    <div className="p-8">
                        {modalView === 'welcome' ? <WelcomeView /> : <FormView />}
                    </div>
                </div>
            </div>
        );
    };

    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    // --- FIL: components/SimpleLoginScreen.js ---
    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    const SimpleLoginScreen = ({ onLogin }) => {
        const { classes } = useContext(ThemeContext);
        const [password, setPassword] = useState('');
        const [error, setError] = useState('');
        const handleSubmit = (e) => { e.preventDefault(); if (password.toLowerCase() === 'guldbyxor') { onLogin(); } else { setError('Felaktig fras. Försök igen.'); setPassword(''); } };
        return (
            <div className={`flex items-center justify-center min-h-screen ${classes.bg}`}>
                <style>{`@keyframes fadeInScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } } .animate-pulse-glow { 0%, 100% { box-shadow: 0 0 0 0 ${themes.light.accent}77; } 50% { box-shadow: 0 0 12px 6px #00000000, 0 0 8px 3px ${themes.light.accent}77; } } .animate-fade-in-scale { animation: fadeInScale 0.7s ease-out forwards; } .animate-pulse-glow { animation: pulseGlow 2.5s infinite; }`}</style>
                <div className={`p-10 rounded-xl shadow-2xl w-full max-w-md ${classes.cardBg} animate-fade-in-scale`}>
                    <div className="flex justify-center mb-8"> <GuldkantLogo className={classes.text} size="h-24"/> </div>
                    <h1 className="text-3xl font-bold text-center mb-2">Välkommen till Guldkant Portalen</h1>
                    <p className={`${classes.textSecondary} text-center mb-8`}>Vänligen ange din fras för att fortsätta.</p>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input type="password" label="Hemlig fras" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} placeholder="••••••••••••" error={error} />
                        <button type="submit" className={`w-full ${classes.buttonPrimaryBg} ${classes.buttonPrimaryText} ${classes.buttonPrimaryHover} px-5 py-3 rounded-lg font-semibold transition-colors text-lg animate-pulse-glow ${focusClasses}`}>Logga in</button>
                    </form>
                </div>
            </div>
        );
    };

    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    // --- FIL: components/StatusSelector.js ---
    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    const StatusSelector = ({ quote, onStatusChange, classes }) => {
        const [isOpen, setIsOpen] = useState(false);
        const selectorRef = useRef(null);
        useOnClickOutside(selectorRef, () => setIsOpen(false));
        const statusOptions = Object.keys(statusTextMap).map(id => ({ id, label: statusTextMap[id] }));
        const handleSelect = (newStatus) => {
            onStatusChange(quote, newStatus);
            setIsOpen(false);
        };
        return (
            <div className="relative w-full" ref={selectorRef} onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setIsOpen(!isOpen)} type="button" className={`relative w-full cursor-pointer rounded-md border ${classes.border} ${classes.inputBg} py-2 pl-3 pr-10 text-left text-sm shadow-sm ${focusClasses}`}>
                    <span className="flex items-center">
                        <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${statusColors[quote.status]}`}></span>
                        <span className="ml-3 block truncate">{statusTextMap[quote.status]}</span>
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 ml-3 flex items-center pr-2">
                        <CaretUpDownIcon className={`h-5 w-5 ${classes.textSecondary}`} />
                    </span>
                </button>
                {isOpen && (
                    <div className={`absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md ${classes.cardBg} py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm`}>
                        {statusOptions.map(option => (
                            <div key={option.id} onClick={() => handleSelect(option.id)} className={`flex cursor-pointer select-none items-center p-2 transition-colors hover:${classes.inputBg}`}>
                                <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${statusColors[option.id]}`}></span>
                                <span className={`ml-3 block truncate ${quote.status === option.id ? `font-semibold ${classes.accent}` : 'font-normal'}`}>{option.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    // --- FIL: components/QuoteCard.js ---
    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    const QuoteCard = React.forwardRef(({ quote, onSelect, isSelected, onStatusChange }, ref) => {
        const { classes } = useContext(ThemeContext);
        const statusBorderColor = { utkast: 'border-l-yellow-500', 'förslag-skickat': 'border-l-blue-500', 'godkänd': 'border-l-green-500', 'genomförd': 'border-l-blue-700', 'betald': 'border-l-purple-500', 'förlorad': 'border-l-red-500', 'arkiverad': 'border-l-gray-500' };
        return (
            <div ref={ref} tabIndex="0" className={`${classes.cardBg} rounded-lg shadow-lg p-5 border ${classes.border} ${statusBorderColor[quote.status] || 'border-l-gray-700'} border-l-4 transition-all duration-300 flex flex-col justify-between hover:ring-2 hover:scale-[1.02] ${isSelected ? 'ring-2 ring-cyan-500' : 'focus-within:ring-2 focus-within:ring-cyan-500/50'} ${focusClasses}`} onClick={() => onSelect(quote)}>
                <div>
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg pr-2 flex-grow">{quote.customer}</h3>
                    </div>
                    <div className="w-full">
                        <StatusSelector quote={quote} onStatusChange={onStatusChange} classes={classes} />
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-dashed ${classes.border}">
                    <div className="flex justify-between items-end">
                        <div><p className={`${classes.textSecondary} text-xs`}>Eventdatum</p><p className="font-medium">{formatDate(quote.eventDate)}</p></div>
                        <div><p className={`${classes.textSecondary} text-xs text-right`}>Totalt</p><p className={`font-bold text-xl ${classes.accent}`}>{quote.total?.toLocaleString('sv-SE', { style: 'currency', currency: 'SEK' })}</p></div>
                    </div>
                </div>
            </div>
        );
    });

    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    // --- FIL: components/EditModal.js ---
    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    const MicroCalendar = ({ selectedDate, onDateSelect, onClose }) => { const { classes } = useContext(ThemeContext); const [displayDate, setDisplayDate] = useState(selectedDate ? new Date(selectedDate) : new Date()); const calendarRef = useRef(null); useOnClickOutside(calendarRef, onClose); const changeMonth = (amount) => { setDisplayDate(prev => new Date(prev.getFullYear(), prev.getMonth() + amount, 1)); }; const grid = useMemo(() => { const year = displayDate.getFullYear(); const month = displayDate.getMonth(); const firstDayOfMonth = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate(); const dayOffset = (firstDayOfMonth === 0) ? 6 : firstDayOfMonth - 1; return [...Array(dayOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]; }, [displayDate]); const weekdays = useMemo(() => { const formatter = new Intl.DateTimeFormat('sv-SE', { weekday: 'narrow' }); const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() + 6) % 7); return Array.from({length: 7}, (_, i) => { const day = new Date(startOfWeek); day.setDate(startOfWeek.getDate() + i); return formatter.format(day); }); }, []); const selectedDateStr = selectedDate ? formatDate(selectedDate) : null; return ( <div ref={calendarRef} className={`absolute top-full mt-2 z-20 w-72 p-3 rounded-lg shadow-2xl border ${classes.border} ${classes.cardBg}`}> <div className="flex justify-between items-center mb-3"> <button onClick={() => changeMonth(-1)} className={`p-1 rounded-full hover:${classes.inputBg} ${focusClasses}`}> <ChevronLeftIcon className="w-5 h-5"/> </button> <span className="font-semibold text-md capitalize">{formatDate(displayDate, { month: 'long', year: 'numeric' })}</span> <button onClick={() => changeMonth(1)} className={`p-1 rounded-full hover:${classes.inputBg} ${focusClasses}`}> <ChevronRightIcon className="w-5 h-5"/> </button> </div> <div className="grid grid-cols-7 gap-1 text-center"> {weekdays.map((day, index) => <div key={index} className={`font-bold text-xs uppercase ${classes.textSecondary}`}>{day}</div>)} {grid.map((day, index) => { if (!day) return <div key={`ph-${index}`}></div>; const fullDate = new Date(displayDate.getFullYear(), displayDate.getMonth(), day); const isSelected = formatDate(fullDate) === selectedDateStr; return ( <button key={day} onClick={() => onDateSelect(fullDate)} className={`w-9 h-9 rounded-full text-sm transition-colors ${focusClasses} ${isSelected ? `bg-cyan-500 text-white font-bold` : `hover:${classes.inputBg}`}`}>{day}</button> ); })} </div> </div> ); };
    const CustomTimePicker = ({ isOpen, onClose, value, onChange, classes }) => { const createPaddedArray = (size) => Array.from({ length: size }, (_, i) => i.toString().padStart(2, '0')); const extendedHours = useMemo(() => { const h = createPaddedArray(24); return [...h, ...h, ...h]; }, []); const extendedMinutes = useMemo(() => { const m = createPaddedArray(60); return [...m, ...m, ...m]; }, []); const hourRef = useRef(null); const minuteRef = useRef(null); const scrollTimeout = useRef(null); const ITEM_HEIGHT = 36; const HALF_VISIBLE_ITEMS = 2; useEffect(() => { if (isOpen && value) { const [h, m] = value.split(':'); setTimeout(() => { if (hourRef.current) { const hourIndex = extendedHours.indexOf(h, 24); hourRef.current.scrollTop = hourIndex * ITEM_HEIGHT; } if (minuteRef.current) { const minuteIndex = extendedMinutes.indexOf(m, 60); minuteRef.current.scrollTop = minuteIndex * ITEM_HEIGHT; } }, 50); } }, [isOpen, value, extendedHours, extendedMinutes]); const handleScroll = (ref, sectionSize) => { clearTimeout(scrollTimeout.current); scrollTimeout.current = setTimeout(() => { if (!ref.current) return; const { scrollTop, clientHeight } = ref.current; const totalHeight = ref.current.scrollHeight - clientHeight; if (scrollTop < ITEM_HEIGHT * sectionSize) { ref.current.scrollTop += ITEM_HEIGHT * sectionSize; } else if (scrollTop >= totalHeight - (ITEM_HEIGHT * sectionSize)) { ref.current.scrollTop -= ITEM_HEIGHT * sectionSize; } const nearestIndex = Math.round(ref.current.scrollTop / ITEM_HEIGHT); ref.current.scrollTo({ top: nearestIndex * ITEM_HEIGHT, behavior: 'smooth' }); }, 250); }; const handleSetTime = () => { if (!hourRef.current || !minuteRef.current) return; const hourIndex = Math.round(hourRef.current.scrollTop / ITEM_HEIGHT); const minuteIndex = Math.round(minuteRef.current.scrollTop / ITEM_HEIGHT); onChange(`${extendedHours[hourIndex]}:${extendedMinutes[minuteIndex]}`); onClose(); }; if (!isOpen) return null; const columnPadding = { height: `${ITEM_HEIGHT * HALF_VISIBLE_ITEMS}px` }; return ( <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 ${classes.modalOverlay}`} onClick={onClose}> <div className={`${classes.cardBg} w-full max-w-xs rounded-xl shadow-2xl p-4 flex flex-col`} onClick={e => e.stopPropagation()}> <div className="relative h-48 flex justify-center items-center text-2xl font-mono gap-2 overflow-hidden"> <div className={`absolute top-1/2 -translate-y-1/2 h-10 w-full rounded-lg border-2 ${classes.accent} ${classes.border} border-opacity-50 pointer-events-none`}></div> <div ref={hourRef} onScroll={() => handleScroll(hourRef, 24)} className="h-full w-1/2 overflow-y-scroll scroll-smooth snap-y snap-mandatory hide-scrollbar"> <div style={columnPadding}></div> {extendedHours.map((h, i) => <div key={`h-${i}`} className="flex items-center justify-center h-9 snap-center">{h}</div>)} <div style={columnPadding}></div> </div> <span>:</span> <div ref={minuteRef} onScroll={() => handleScroll(minuteRef, 60)} className="h-full w-1/2 overflow-y-scroll scroll-smooth snap-y snap-mandatory hide-scrollbar"> <div style={columnPadding}></div> {extendedMinutes.map((m, i) => <div key={`m-${i}`} className="flex items-center justify-center h-9 snap-center">{m}</div>)} <div style={columnPadding}></div> </div> </div> <div className="flex gap-4 mt-4"> <button onClick={onClose} className={`w-full ${classes.buttonSecondaryBg} ${classes.buttonSecondaryText} ${classes.buttonSecondaryHover} px-4 py-2 rounded-lg font-semibold transition-colors ${focusClasses}`}>Avbryt</button> <button onClick={handleSetTime} className={`w-full ${classes.buttonPrimaryBg} ${classes.buttonPrimaryText} ${classes.buttonPrimaryHover} px-4 py-2 rounded-lg font-semibold transition-colors ${focusClasses}`}>Ställ in</button> </div> </div> <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style> </div> ); };

    const EditModal = ({ quote, isOpen, onClose, saveMutation, sendProposalMutation }) => {
        const { classes } = useContext(ThemeContext);
        const [formData, setFormData] = useState(null);
        const [isMicroCalendarOpen, setMicroCalendarOpen] = useState(false);
        const [isTimePickerOpen, setTimePickerOpen] = useState(false);
        const [timePickerTarget, setTimePickerTarget] = useState(null);
        const [openSections, setOpenSections] = useState({ info: true, menu: true, costs: false, diets: false, internal: false });
        const pdfLoadingStatus = useScriptLoader(['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js']);
        const [displayTotal, setDisplayTotal] = useState(0);
        const timeInputClasses = `w-full p-2 rounded ${classes.inputBg} ${classes.text} border ${classes.border} transition-colors cursor-pointer text-center shadow-sm ${focusClasses}`;

        useEffect(() => { if (quote) { const initialData = { ...quote, customCosts: quote.customCosts || [], customDiets: quote.customDiets || [] }; setFormData(initialData); setDisplayTotal(calculateTotal(initialData)); setOpenSections({ info: true, menu: true, costs: false, diets: false, internal: false }); } else { setFormData(null); } }, [quote]);
        useEffect(() => { if (formData) { setDisplayTotal(calculateTotal(formData)); } }, [formData]);

        const handleChange = e => { const { name, value, type, checked } = e.target; setFormData(p => ({ ...p, [name]: type === 'checkbox' ? checked : value })); };
        const handleNumericChange = e => { const { name, value } = e.target; setFormData(p => ({ ...p, [name]: value === '' ? '' : parseFloat(value) })); };
        const handleDateChange = (newDate) => { setFormData(p => ({ ...p, eventDate: newDate.toISOString().split('T')[0] })); setMicroCalendarOpen(false); };
        const handleTimeChange = (newTime) => { if (timePickerTarget) { setFormData(p => ({ ...p, [timePickerTarget]: newTime })); } };
        const openTimePicker = (target) => { setTimePickerTarget(target); setTimePickerOpen(true); };
        const handleCustomCostChange = (id, field, value) => { setFormData(p => ({ ...p, customCosts: p.customCosts.map(c => c.id === id ? { ...c, [field]: value } : c) })); };
        const addCustomCost = () => { setFormData(p => ({ ...p, customCosts: [...(p.customCosts || []), { id: `temp_${Date.now()}`, description: '', amount: '' }] })); };
        const removeCustomCost = (id) => { setFormData(p => ({ ...p, customCosts: p.customCosts.filter(c => c.id !== id) })); };
        const handleCustomDietChange = (id, field, value) => { setFormData(p => ({ ...p, customDiets: p.customDiets.map(d => d.id === id ? { ...d, [field]: value } : d) })); };
        const addCustomDiet = () => { setFormData(p => ({ ...p, customDiets: [...(p.customDiets || []), { id: `temp_${Date.now()}`, type: '', count: '' }] })); };
        const removeCustomDiet = (id) => { setFormData(p => ({ ...p, customDiets: p.customDiets.filter(d => d.id !== id) })); };
        
        const handleSave = () => { const quoteToSave = { ...formData, total: calculateTotal(formData) }; saveMutation.mutate(quoteToSave); };
        const handleSendProposal = () => { const quoteToSend = { ...formData, status: 'förslag-skickat', events: [...(formData.events || []), { timestamp: new Date().toISOString(), event: 'Förslag skickat till kund (via portal)' }] }; saveMutation.mutate(quoteToSend, { onSuccess: (data) => { if(data.id) sendProposalMutation.mutate(data.id); onClose(); } }); };
        const handleApproveProposal = () => { const quoteToApprove = { ...formData, status: 'godkänd', events: [...(formData.events || []), { timestamp: new Date().toISOString(), event: 'Förslag godkänt av administratör' }] }; saveMutation.mutate(quoteToApprove, { onSuccess: () => { onClose(); } }); };
        const handleExportPdf = async () => { /* ... oförändrad PDF-logik ... */ };
        
        if (!isOpen || !formData) return null;
        const isSaving = saveMutation.isPending || sendProposalMutation.isPending;
        const isNewQuote = !formData.id;

        return (
          <>
            <div className={`fixed inset-0 z-50 flex items-center justify-center p-4`} onClick={onClose}>
                <div onClick={e => e.stopPropagation()} className={`${classes.cardBg} w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col`}>
                    <header className={`p-4 border-b ${classes.border} flex justify-between items-center flex-shrink-0`}> 
                        <h2 className="text-2xl font-bold">{isNewQuote ? "Skapa Nytt Ärende" : <>Redigera Ärende: <span className={classes.accent}>{formData.id}</span></>}</h2>
                        <button onClick={onClose} className={`p-2 rounded-full hover:bg-red-500/10 ${focusClasses}`}> <XIcon className="w-6 h-6 hover:text-red-500"/> </button> 
                    </header>
                    <main className="p-6 overflow-y-auto flex-grow">
                        <ModalSection title="Kund & Event Information" isOpen={openSections.info} onToggle={() => setOpenSections(p => ({...p, info: !p.info}))}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Kundnamn" name="customer" value={formData?.customer || ''} onChange={handleChange} />
                                <div> <label className={`${classes.textSecondary} text-xs block mb-1`}>Kundtyp</label> <select name="customerType" value={formData?.customerType} onChange={handleChange} className={`w-full p-2 rounded ${classes.inputBg} ${classes.text} border ${classes.border} shadow-sm ${focusClasses}`}> <option value="privat">Privat</option><option value="foretag">Företag</option> </select> </div>
                                <Input label="Kontaktperson" name="contactPerson" value={formData?.contactPerson || ''} onChange={handleChange} />
                                <Input label="Person-/Org.nummer" name="customerIdNumber" value={formData?.customerIdNumber || ''} onChange={handleChange} />
                                <Input label="E-post" name="contactEmail" type="email" value={formData?.contactEmail || ''} onChange={handleChange} />
                                <Input label="Telefon" name="contactPhone" type="tel" value={formData?.contactPhone || ''} onChange={handleChange} />
                                <div className="relative"> <label className={`block text-sm font-medium ${classes.textSecondary} mb-1`}>Eventdatum</label> <div tabIndex="0" role="button" onKeyDown={e => e.key === 'Enter' && setMicroCalendarOpen(o => !o)} onClick={() => setMicroCalendarOpen(o => !o)} className={`w-full p-2 rounded-md border flex items-center justify-between cursor-pointer ${classes.inputBg} ${classes.border} ${focusClasses}`}> <span>{formatDate(formData?.eventDate)}</span> <CalendarIcon className={classes.textSecondary}/> </div> {isMicroCalendarOpen && ( <MicroCalendar selectedDate={formData?.eventDate} onDateSelect={handleDateChange} onClose={() => setMicroCalendarOpen(false)} /> )} </div>
                                <div className="grid grid-cols-2 gap-4"> <div> <label className={`${classes.textSecondary} text-xs block mb-1`}>Starttid</label> <div tabIndex="0" role="button" onKeyDown={e => e.key === 'Enter' && openTimePicker('eventStartTime')} className={timeInputClasses} onClick={() => openTimePicker('eventStartTime')}>{formData?.eventStartTime || 'Välj tid'}</div> </div> <div> <label className={`${classes.textSecondary} text-xs block mb-1`}>Sluttid</label> <div tabIndex="0" role="button" onKeyDown={e => e.key === 'Enter' && openTimePicker('eventEndTime')} className={timeInputClasses} onClick={() => openTimePicker('eventEndTime')}>{formData?.eventEndTime || 'Välj tid'}</div> </div> </div>
                                <NumberInput label="Antal gäster" name="guestCount" value={formData?.guestCount || ''} onChange={handleNumericChange} />
                                <NumberInput label="Pris per kuvert (SEK)" name="pricePerGuest" value={formData?.pricePerGuest || ''} onChange={handleNumericChange} />
                            </div>
                            <div className="mt-4"><Textarea label="Kundens önskemål" name="customerRequests" value={formData?.customerRequests || ''} onChange={handleChange}/></div>
                        </ModalSection>
                        <ModalSection title="Meny & Beskrivning" isOpen={openSections.menu} onToggle={() => setOpenSections(p => ({...p, menu: !p.menu}))}>
                            <Textarea label="Menybeskrivning" name="menuDescription" value={formData?.menuDescription || ''} onChange={handleChange} rows="4"/>
                        </ModalSection>
                        <ModalSection title="Personal & Kostnader" isOpen={openSections.costs} onToggle={() => setOpenSections(p => ({...p, costs: !p.costs}))}> 
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4"> <NumberInput label="Antal kockar" name="numChefs" value={formData?.numChefs || ''} onChange={handleNumericChange} /> <NumberInput label="Kostnad Kockar" name="chefCost" value={formData?.chefCost || ''} onChange={handleNumericChange} /> <NumberInput label="Antal servitörer" name="numServingStaff" value={formData?.numServingStaff || ''} onChange={handleNumericChange} /> <NumberInput label="Kostnad Servitörer" name="servingStaffCost" value={formData?.servingStaffCost || ''} onChange={handleNumericChange} /> </div>
                            <div className="mt-6 space-y-3"> <label className={`${classes.textSecondary} text-xs block`}>Egna Kostnader</label> {(!formData?.customCosts || formData.customCosts.length === 0) && <p className={`${classes.textSecondary} text-sm text-center py-2`}>Inga egna kostnader tillagda.</p>} {(formData?.customCosts || []).map((cost) => ( <div key={cost.id} className="flex items-start gap-2"> <div className="flex-grow"><Input placeholder="Beskrivning" value={cost.description || ''} onChange={e => handleCustomCostChange(cost.id, 'description', e.target.value)} /></div> <div className="w-40"><NumberInput placeholder="Belopp" value={cost.amount || ''} onChange={e => handleCustomCostChange(cost.id, 'amount', e.target.value === '' ? '' : parseFloat(e.target.value))} /></div> <button onClick={() => removeCustomCost(cost.id)} className={`p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/40 mt-1 ${focusClasses}`}>-</button> </div> ))} <button onClick={addCustomCost} className={`${classes.buttonSecondaryBg} text-sm px-3 py-1 rounded ${focusClasses}`}>+ Lägg till kostnad</button> </div>
                            <div className="mt-6"><NumberInput label="Rabatt (SEK)" name="discountAmount" value={formData?.discountAmount || ''} onChange={handleNumericChange} /></div> 
                        </ModalSection>
                        <ModalSection title="Specialkost & Allergener" isOpen={openSections.diets} onToggle={() => setOpenSections(p => ({...p, diets: !p.diets}))}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8"> <div className="flex items-center space-x-4"><Checkbox label="Vegetariskt" name="hasVegetarian" checked={!!formData?.hasVegetarian} onChange={handleChange} /><NumberInput label="Antal" name="numVegetarian" value={formData?.numVegetarian || ''} onChange={handleNumericChange} /></div> <div className="flex items-center space-x-4"><Checkbox label="Veganskt" name="hasVegan" checked={!!formData?.hasVegan} onChange={handleChange} /><NumberInput label="Antal" name="numVegan" value={formData?.numVegan || ''} onChange={handleNumericChange} /></div> <div className="flex items-center space-x-4"><Checkbox label="Glutenfritt" name="hasGlutenFree" checked={!!formData?.hasGlutenFree} onChange={handleChange} /><NumberInput label="Antal" name="numGlutenFree" value={formData?.numGlutenFree || ''} onChange={handleNumericChange} /></div> <div className="flex items-center space-x-4"><Checkbox label="Laktosfritt" name="hasLactoseFree" checked={!!formData?.hasLactoseFree} onChange={handleChange} /><NumberInput label="Antal" name="numLactoseFree" value={formData?.numLactoseFree || ''} onChange={handleNumericChange} /></div> <div className="flex items-center space-x-4"><Checkbox label="Nötallergi" name="hasNutAllergy" checked={!!formData?.hasNutAllergy} onChange={handleChange} /><NumberInput label="Antal" name="numNutAllergy" value={formData?.numNutAllergy || ''} onChange={handleNumericChange} /></div> </div> 
                            <div className="mt-6 space-y-3"> <label className={`${classes.textSecondary} text-xs block`}>Anpassade Specialkoster</label> {(!formData?.customDiets || formData.customDiets.length === 0) && <p className={`${classes.textSecondary} text-sm text-center py-2`}>Ingen annan specialkost tillagd.</p>} {(formData?.customDiets || []).map((diet) => ( <div key={diet.id} className="flex items-start gap-2"> <div className="flex-grow"><Input placeholder="Typ (t.ex. 'Utan fisk')" value={diet.type || ''} onChange={e => handleCustomDietChange(diet.id, 'type', e.target.value)} /></div> <div className="w-40"><NumberInput placeholder="Antal" value={diet.count || ''} onChange={e => handleCustomDietChange(diet.id, 'count', e.target.value === '' ? '' : parseFloat(e.target.value))} /></div> <button onClick={() => removeCustomDiet(diet.id)} className={`p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/40 mt-1 ${focusClasses}`}>-</button> </div> ))} <button onClick={addCustomDiet} className={`${classes.buttonSecondaryBg} text-sm px-3 py-1 rounded ${focusClasses}`}>+ Lägg till specialkost</button> </div> 
                        </ModalSection>
                        <ModalSection title="Interna Noteringar & Händelselogg" isOpen={openSections.internal} onToggle={() => setOpenSections(p => ({...p, internal: !p.internal}))}>
                            <Textarea name="internalComment" value={formData?.internalComment || ''} onChange={handleChange} /> <h3 className={`mt-4 font-semibold ${classes.textSecondary}`}>Händelselogg</h3> <EventLog events={formData?.events} />
                        </ModalSection>
                    </main>
                    <footer className={`p-4 border-t ${classes.border} flex flex-col sm:flex-row justify-between items-center gap-4 flex-shrink-0`}>
                        <div className="flex items-center gap-4 h-10">
                            {/* BORTTAGEN: Delete och Copy knappar borttagna */}
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                            <p className={`font-bold text-xl ${classes.accent}`}>{displayTotal.toLocaleString('sv-SE', { style: 'currency', currency: 'SEK' })}</p>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button onClick={handleExportPdf} disabled={pdfLoadingStatus !== 'ready' || isNewQuote} className={`w-full sm:w-auto ${classes.buttonSecondaryBg} ${classes.buttonSecondaryText} ${classes.buttonSecondaryHover} px-3 py-2 text-sm rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${focusClasses}`}> <FilePdfIcon/> Exportera </button> 
                                <button onClick={handleSave} disabled={isSaving} className={`w-full sm:w-auto ${classes.buttonSecondaryBg} ${classes.buttonSecondaryText} ${classes.buttonSecondaryHover} px-5 py-2 rounded-lg font-semibold transition-colors shadow flex items-center justify-center min-w-[80px] ${focusClasses}`}> {isSaving ? <Spinner/> : (isNewQuote ? 'Skapa' : 'Spara')} </button>
                            </div>
                            {!isNewQuote && formData?.status === 'utkast' && <button onClick={handleSendProposal} disabled={isSaving} className={`w-full sm:w-auto ${classes.buttonPrimaryBg} ${classes.buttonPrimaryText} ${classes.buttonPrimaryHover} px-5 py-2 rounded-lg font-semibold transition-colors shadow flex items-center justify-center min-w-[130px] ${focusClasses}`}> {isSaving ? <Spinner/> : 'Skicka Förslag'} </button>}
                            {!isNewQuote && formData?.status === 'förslag-skickat' && <button onClick={handleApproveProposal} disabled={isSaving} className={`w-full sm:w-auto bg-green-500 text-white hover:bg-green-600 px-5 py-2 rounded-lg font-semibold transition-colors shadow flex items-center justify-center min-w-[150px] ${focusClasses}`}> {isSaving ? <Spinner/> : 'Godkänn Förslag'} </button>}
                        </div>
                    </footer>
                </div>
            </div>
            <CustomTimePicker isOpen={isTimePickerOpen} onClose={() => setTimePickerOpen(false)} value={formData?.[timePickerTarget] || '12:00'} onChange={handleTimeChange} classes={classes} />
          </>
        );
    };

    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    // --- FIL: features/QuotesDashboard.js ---
    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    const QuoteCardSkeleton = ({ classes }) => ( <div className={`rounded-lg p-5 border ${classes.border} ${classes.cardBg} animate-pulse`}> <div className="flex justify-between items-start mb-4"> <div className={`h-6 w-3/5 rounded ${classes.inputBg}`}></div> <div className={`h-6 w-1/4 rounded ${classes.inputBg}`}></div> </div> <div className={`h-4 w-1/3 rounded ${classes.inputBg} mb-6`}></div> <div className={`border-t ${classes.border} border-dashed pt-4 flex justify-between items-end`}> <div> <div className={`h-4 w-20 rounded ${classes.inputBg} mb-1`}></div> <div className={`h-5 w-24 rounded ${classes.inputBg}`}></div> </div> <div> <div className={`h-4 w-12 rounded ${classes.inputBg} mb-1`}></div> <div className={`h-6 w-28 rounded ${classes.inputBg}`}></div> </div> </div> </div> );
    const EmptyState = ({ onNewQuote, classes }) => ( <div className={`text-center p-12 border-2 border-dashed ${classes.border} rounded-xl mt-8 flex flex-col items-center`}> <FileSearchIcon className={`w-16 h-16 mb-4 ${classes.textSecondary}`} /> <h3 className="text-xl font-bold">Inga ärenden hittades</h3> <p className={`${classes.textSecondary} mb-6 max-w-sm`}>Din sökning eller ditt filter gav inga resultat. Prova att ändra dina sökkriterier eller skapa ett nytt ärende.</p> <button onClick={onNewQuote} className={`${classes.buttonPrimaryBg} ${classes.buttonPrimaryText} ${classes.buttonPrimaryHover} px-5 py-2 rounded-lg font-semibold transition-colors shadow-sm ${focusClasses}`}>Skapa Nytt Ärende</button> </div> );
    const DayCell = ({ day, year, month, quotes, onSelect, classes }) => { const contentRef = useRef(null); const [isOverflowing, setIsOverflowing] = useState(false); useEffect(() => { const checkOverflow = () => { if (contentRef.current) { setIsOverflowing(contentRef.current.scrollHeight > contentRef.current.clientHeight); } }; const timeoutId = setTimeout(checkOverflow, 50); return () => clearTimeout(timeoutId); }, [quotes]); if (!day) return <div className={`border ${classes.border} rounded-md h-28 sm:h-32 opacity-50`}></div>; const dayDate = new Date(year, month, day); const dayStr = formatDate(dayDate); const todaysQuotes = quotes[dayStr] || []; const isToday = new Date().toDateString() === dayDate.toDateString(); return ( <div className={`relative border ${classes.border} rounded-md h-28 sm:h-32 p-1.5 text-left flex flex-col transition-colors ${todaysQuotes.length > 0 ? `bg-cyan-500/5` : ''}`}> <span className={`font-semibold text-sm ${isToday ? classes.accent : ''}`}>{day}</span> <div ref={contentRef} className="overflow-y-auto flex-grow text-xs space-y-1 mt-1 hide-scrollbar"> {todaysQuotes.map(q => ( <div key={q.id} onClick={() => onSelect(q)} className={`p-1 rounded bg-cyan-500/80 text-white cursor-pointer hover:bg-cyan-400 truncate ${focusClasses}`}>{q.customer}</div> ))} </div> {isOverflowing && ( <div className={`absolute bottom-0 left-0 w-full h-4 bg-gradient-to-t from-${classes.bg === 'bg-gray-900' ? 'gray-800' : 'white'}/80 to-transparent pointer-events-none`}></div> )} </div> ); };
    const TactileCalendar = ({ quotes, onSelect }) => { const { classes } = useContext(ThemeContext); const [activeMonthIndex, setActiveMonthIndex] = useState(0); const [scrollAbility, setScrollAbility] = useState({ atStart: false, atEnd: false }); const monthScrollerRef = useRef(null); const monthRefs = useRef({}); const scrollTimeout = useRef(null); const isInitialMount = useRef(true); const months = useMemo(() => Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('sv-SE', { month: 'long' })), []); const years = useMemo(() => Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i), []); const monthYearCombination = useMemo(() => years.flatMap(year => months.map((month, index) => ({year, month, monthIndex: index}))), [years, months]); const currentDate = useMemo(() => { const activeItem = monthYearCombination[activeMonthIndex]; return activeItem ? new Date(activeItem.year, activeItem.monthIndex, 1) : new Date(); }, [activeMonthIndex, monthYearCombination]); const checkScrollAbility = useCallback(() => { if (!monthScrollerRef.current) return; const { scrollLeft, scrollWidth, clientWidth } = monthScrollerRef.current; setScrollAbility({ atStart: scrollLeft < 10, atEnd: scrollLeft > scrollWidth - clientWidth - 10 }); }, []); useEffect(() => { const initialIndex = monthYearCombination.findIndex(m => m.year === new Date().getFullYear() && m.monthIndex === new Date().getMonth()); if(initialIndex !== -1) setActiveMonthIndex(initialIndex); }, [monthYearCombination]); useEffect(() => { const targetElement = monthRefs.current[activeMonthIndex]; if (targetElement && monthScrollerRef.current) { const behavior = isInitialMount.current ? 'auto' : 'smooth'; monthScrollerRef.current.scrollTo({ left: targetElement.offsetLeft - (monthScrollerRef.current.offsetWidth / 2) + (targetElement.offsetWidth / 2), behavior: behavior }); if (isInitialMount.current) isInitialMount.current = false; } }, [activeMonthIndex]); const handleScroll = () => { checkScrollAbility(); clearTimeout(scrollTimeout.current); scrollTimeout.current = setTimeout(() => { if (!monthScrollerRef.current) return; const container = monthScrollerRef.current; const containerCenter = container.scrollLeft + container.offsetWidth / 2; let closestIndex = -1, smallestDistance = Infinity; for (const key in monthRefs.current) { const el = monthRefs.current[key]; if (el) { const elCenter = el.offsetLeft + el.offsetWidth / 2; const distance = Math.abs(containerCenter - elCenter); if (distance < smallestDistance) { smallestDistance = distance; closestIndex = parseInt(key, 10); } } } if (closestIndex !== -1 && activeMonthIndex !== closestIndex) { setActiveMonthIndex(closestIndex); } else if (closestIndex !== -1) { const targetElement = monthRefs.current[closestIndex]; if(targetElement) container.scrollTo({ left: targetElement.offsetLeft - (container.offsetWidth / 2) + (targetElement.offsetWidth / 2), behavior: 'smooth' }); } }, 200); }; const handleArrowClick = (direction) => { const newIndex = Math.max(0, Math.min(monthYearCombination.length - 1, activeMonthIndex + direction)); setActiveMonthIndex(newIndex); }; const calendarGrid = useMemo(() => { const year = currentDate.getFullYear(); const month = currentDate.getMonth(); const firstDayOfMonth = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate(); const dayOffset = (firstDayOfMonth === 0) ? 6 : firstDayOfMonth - 1; const days = Array.from({ length: daysInMonth }, (_, i) => i + 1); const placeholders = Array(dayOffset).fill(null); const grid = [...placeholders, ...days]; const quotesByDate = quotes.reduce((acc, quote) => { if (quote.eventDate) { const dateStr = formatDate(quote.eventDate); if (!acc[dateStr]) acc[dateStr] = []; acc[dateStr].push(quote); } return acc; }, {}); return { grid, quotesByDate, year, month }; }, [currentDate, quotes]); const { grid, quotesByDate, year, month } = calendarGrid; const weekdays = useMemo(() => Array.from({length: 7}, (_, i) => new Date(2024, 0, i + 1).toLocaleDateString('sv-SE', { weekday: 'long' })), []); return ( <div className={`${classes.cardBg} p-4 rounded-lg shadow-xl border ${classes.border} overflow-hidden max-w-4xl mx-auto`}> <div className="relative mb-4 flex items-center"> <button onClick={() => handleArrowClick(-1)} className={`absolute left-0 z-10 p-2 rounded-full bg-black/10 hover:bg-black/20 transition-all duration-300 ${classes.text} ${scrollAbility.atStart ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${focusClasses}`} aria-label="Föregående månad"> <ChevronLeftIcon /> </button> <div ref={monthScrollerRef} onScroll={handleScroll} className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory py-4 hide-scrollbar"> {monthYearCombination.map(({year, month, monthIndex}, index) => ( <div key={`${year}-${monthIndex}`} ref={el => monthRefs.current[index] = el} className={`flex-shrink-0 snap-center px-6 py-2 cursor-pointer transition-all duration-300 select-none ${ activeMonthIndex === index ? `text-xl font-bold ${classes.accent}` : `text-lg ${classes.textSecondary} opacity-60 scale-90` }`}> <span className="capitalize">{month}</span> <span className={`${classes.textSecondary} text-base`}>{year}</span> </div> ))} </div> <button onClick={() => handleArrowClick(1)} className={`absolute right-0 z-10 p-2 rounded-full bg-black/10 hover:bg-black/20 transition-all duration-300 ${classes.text} ${scrollAbility.atEnd ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${focusClasses}`} aria-label="Nästa månad"> <ChevronRightIcon /> </button> </div> <div className="grid grid-cols-7 gap-1 text-center"> {weekdays.map((day, i) => <div key={i} className={`font-bold text-sm capitalize ${classes.textSecondary}`}>{day.substring(0, 3)}</div>)} {grid.map((day, index) => ( <DayCell key={day || `ph-${index}`} day={day} year={year} month={month} quotes={quotesByDate} onSelect={onSelect} classes={classes}/> ))} </div> <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style> </div> ); };
    const QuotesControls = ({ onFilterChange, onSearch, onNewQuote, activeFilter, searchRef, viewMode, setViewMode, summary }) => { const { classes } = useContext(ThemeContext); const filters = ["Alla", "Utkast", "Förslag Skickat", "Godkänd", "Genomförd", "Arkiv"]; return ( <div className="mb-4"> <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-4"> <input ref={searchRef} type="text" placeholder="Sök på kundnamn, ID..." onChange={e => onSearch(e.target.value)} className={`w-full md:w-2/5 p-2 rounded ${classes.inputBg} ${classes.text} border ${classes.border} transition-colors shadow-sm ${focusClasses}`} /> <div className="flex gap-2"> <button onClick={() => setViewMode('cards')} className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${focusClasses} ${viewMode === 'cards' ? classes.filterActive : classes.filterInactive}`}>Kortvy</button> <button onClick={() => setViewMode('calendar')} className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${focusClasses} ${viewMode === 'calendar' ? classes.filterActive : classes.filterInactive}`}>Kalendervy</button> <button onClick={onNewQuote} className={`${classes.buttonPrimaryBg} ${classes.buttonPrimaryText} ${classes.buttonPrimaryHover} px-5 py-2 rounded-lg font-semibold transition-colors shadow-sm ${focusClasses}`}>Nytt Ärende</button> </div> </div> <div className={`p-3 mb-4 rounded-lg border ${classes.border} ${classes.inputBg}`}> <p className="text-sm font-semibold">{summary.text}</p> </div> <div className="flex flex-wrap gap-2"> {filters.map(f => <button key={f} onClick={() => onFilterChange(f.toLowerCase().replace(' ', '-'))} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${focusClasses} ${activeFilter === f.toLowerCase().replace(' ', '-') ? classes.filterActive : classes.filterInactive}`}> {f}</button>)} </div> </div> ); };
    const AnalyticsSummaryCard = ({ title, value, unit, icon, classes }) => ( <div className={`${classes.cardBg} p-4 rounded-lg shadow-md flex items-center gap-4 border ${classes.border} group transition-all duration-300 hover:shadow-xl hover:ring-2 hover:ring-cyan-500/80`}> <div className={`p-3 rounded-full ${classes.buttonSecondaryBg} transition-all duration-300 group-hover:ring-2 group-hover:ring-cyan-500/80`}> <div className={`text-2xl ${classes.accent} transition-transform duration-300 group-hover:scale-110`}>{icon}</div> </div> <div> <h3 className={`text-sm font-medium ${classes.textSecondary}`}>{title}</h3> <p className="text-2xl font-bold">{value} <span className="text-lg font-medium">{unit || ''}</span></p> </div> </div> );
    const ActionableQuotesWidget = ({ quotes, onSelect, classes }) => { const actionItems = useMemo(() => { if (!Array.isArray(quotes)) return []; return quotes.filter(q => q.status === 'utkast' || q.status === 'förslag-skickat').sort((a,b) => new Date(a.events[0]?.timestamp) - new Date(b.events[0]?.timestamp)); }, [quotes]); return ( <div className={`p-4 rounded-lg shadow-md border ${classes.border} ${classes.cardBg} border-l-4 border-yellow-500 flex flex-col h-full`}> <h3 className="font-bold mb-3 flex items-center gap-2 flex-shrink-0"> <AlertCircleIcon className="text-yellow-500"/> <span>Ärenden som kräver åtgärd</span> </h3> <div className="flex-grow overflow-y-auto space-y-2 pr-2 hide-scrollbar"> {actionItems.length === 0 ? ( <div className="text-center p-4 text-sm flex flex-col items-center justify-center h-full"> <CheckCircleIcon className={`w-8 h-8 ${classes.textSecondary} text-green-500`} /> <p className={`mt-2 ${classes.textSecondary}`}>Bra jobbat! Inga ärenden kräver åtgärd.</p> </div> ) : ( actionItems.map(q => ( <div key={q.id} onClick={() => onSelect(q)} className={`p-2 rounded-md ${classes.inputBg} hover:bg-cyan-500/10 cursor-pointer transition-colors ${focusClasses}`}> <p className="font-semibold text-sm">{q.customer}</p> <p className={`text-xs ${classes.textSecondary}`}>Status: {statusTextMap[q.status]}</p> </div> )) )} </div> </div> ); };
    const FollowUpWidget = ({ quotes, onSelect, classes }) => { const followUpItems = useMemo(() => { if (!Array.isArray(quotes)) return []; return quotes.filter(q => q.status === 'genomförd').slice(0, 5); }, [quotes]); return ( <div className={`p-4 rounded-lg shadow-md border ${classes.border} ${classes.cardBg} border-l-4 border-blue-500 flex flex-col h-full`}> <h3 className="font-bold mb-3 flex items-center gap-2 flex-shrink-0"> <InvoiceIcon className="text-blue-500"/> <span>Uppföljning & Fakturering</span> </h3> <div className="flex-grow overflow-y-auto space-y-2 pr-2 hide-scrollbar"> {followUpItems.length === 0 ? ( <div className="text-center p-4 text-sm flex flex-col items-center justify-center h-full"> <CheckCircleIcon className={`w-8 h-8 ${classes.textSecondary} text-green-500`} /> <p className={`mt-2 ${classes.textSecondary}`}>Inga genomförda event väntar på fakturering.</p> </div> ) : ( followUpItems.map(q => ( <div key={q.id} onClick={() => onSelect(q)} className={`p-2 rounded-md ${classes.inputBg} hover:bg-cyan-500/10 cursor-pointer transition-colors ${focusClasses}`}> <p className="font-semibold text-sm">{q.customer}</p> <p className={`text-xs ${classes.textSecondary}`}>Genomförd: {formatDate(q.eventDate)}</p> </div> )) )} </div> </div> ); };
    const UpcomingEventsWidget = ({ quotes, onSelect, classes }) => { const upcomingEvents = useMemo(() => { if (!Array.isArray(quotes)) return []; const now = new Date(); now.setHours(0,0,0,0); return quotes.filter(q => ['godkänd', 'betald'].includes(q.status) && new Date(q.eventDate) >= now).sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate)).slice(0, 5); }, [quotes]); return ( <div className={`p-4 rounded-lg shadow-md border ${classes.border} ${classes.cardBg} border-l-4 border-green-500 flex flex-col h-full`}> <h3 className="font-bold mb-3 flex items-center gap-2 flex-shrink-0"> <CalendarCheckIcon className="text-green-500"/> <span>Kommande Event</span> </h3> <div className="flex-grow overflow-y-auto space-y-2 pr-2 hide-scrollbar"> {upcomingEvents.length === 0 ? ( <div className="text-center p-4 text-sm flex flex-col items-center justify-center h-full"> <CheckCircleIcon className={`w-8 h-8 ${classes.textSecondary} text-green-500`} /> <p className={`mt-2 ${classes.textSecondary}`}>Inga kommande event inbokade.</p> </div> ) : ( upcomingEvents.map(q => ( <div key={q.id} onClick={() => onSelect(q)} className={`p-2 rounded-md ${classes.inputBg} hover:bg-cyan-500/10 cursor-pointer transition-colors ${focusClasses}`}> <div className="flex justify-between items-center"> <p className="font-semibold text-sm">{q.customer}</p> {q.status === 'betald' && <span className="text-xs font-bold text-purple-400">BETALD</span>} </div> <p className={`text-xs ${classes.textSecondary}`}>Eventdatum: {formatDate(q.eventDate)}</p> </div> )) )} </div> </div> ); };

    const QuotesDashboard = ({ allQuotes = [], isPending, error, onSelectQuote, onNewQuote, onFilterChange, onSearch, activeFilter, searchRef, onStatusChange }) => {
        const { classes } = useContext(ThemeContext);
        const [viewMode, setViewMode] = useState('cards');
        const [isFocusMode, setIsFocusMode] = useState(false);
        
        const analytics = useMemo(() => {
            if (!Array.isArray(allQuotes)) return { totalQuoteValue: 0, averageQuoteValue: 0, activeQuotesCount: 0 };
            const activeQuotes = allQuotes.filter(q => !['arkiverad', 'betald', 'förlorad'].includes(q.status));
            const totalValue = activeQuotes.reduce((sum, q) => sum + (q.total || 0), 0);
            return { totalQuoteValue: totalValue, averageQuoteValue: activeQuotes.length ? (totalValue / activeQuotes.length) : 0, activeQuotesCount: activeQuotes.length };
        }, [allQuotes]);
        
        const displayQuotes = useMemo(() => {
            if (!Array.isArray(allQuotes)) return [];
            return allQuotes;
        }, [allQuotes]);

        const filterSummary = useMemo(() => {
            const count = displayQuotes.length;
            if (count === 0 && !isPending) return { text: "Inga ärenden i denna vy." };
            if (isPending) return { text: "Hämtar data från servern..." };
            const totalValue = displayQuotes.reduce((sum, q) => sum + (q.total || 0), 0);
            const filterText = statusTextMap[activeFilter] || activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1);
            const plural = count === 1 ? 'ärende' : 'ärenden';
            return { text: `Visar ${count} ${filterText === 'Alla' ? 'aktiva ' : ''}${plural} med ett totalt värde av ${totalValue.toLocaleString('sv-SE', {style: 'currency', currency: 'SEK'})}.`};
        }, [displayQuotes, activeFilter, isPending]);

        return (
            <div className="p-4 md:p-8">
                <div className="flex justify-between items-center mb-2">
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <button onClick={() => setIsFocusMode(!isFocusMode)} className={`${classes.buttonSecondaryBg} ${classes.buttonSecondaryHover} p-2 rounded-full transition-all duration-300 flex items-center justify-center w-10 h-10 ${isFocusMode ? 'ring-2 ring-cyan-500' : ''} ${focusClasses}`} title={isFocusMode ? "Avsluta fokusläge" : "Fokusläge"}>
                        {isFocusMode ? <XIcon /> : <CornersOutIcon />}
                    </button>
                </div>
                <p className={`${classes.textSecondary} mb-8`}>En proaktiv översikt av din cateringverksamhet.</p>
                
                <div className={`transition-all duration-500 ${isFocusMode ? 'max-h-0 opacity-0 overflow-hidden mb-0' : 'max-h-[100rem] opacity-100 mb-8'}`}>
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-1">
                           <ActionableQuotesWidget quotes={allQuotes} onSelect={onSelectQuote} classes={classes} />
                        </div>
                        <div className="lg:col-span-2 grid grid-rows-2 gap-6">
                           <UpcomingEventsWidget quotes={allQuotes} onSelect={onSelectQuote} classes={classes} />
                           <FollowUpWidget quotes={allQuotes} onSelect={onSelectQuote} classes={classes} />
                        </div>
                        <div className="lg:col-span-1 space-y-6">
                            <AnalyticsSummaryCard title="Aktivt Värde (Inkl. moms)" value={analytics.totalQuoteValue.toLocaleString('sv-SE', { style: 'currency', currency: 'SEK' })} unit="" icon={<ChartLineUpIcon/>} classes={classes} />
                            <AnalyticsSummaryCard title="Snittvärde/Ärende" value={analytics.averageQuoteValue.toLocaleString('sv-SE', { style: 'currency', currency: 'SEK' })} unit="" icon={<DivideIcon/>} classes={classes} />
                            <AnalyticsSummaryCard title="Aktiva Ärenden" value={analytics.activeQuotesCount} unit="" icon={<BriefcaseIcon/>} classes={classes} />
                        </div>
                    </div>
                </div>

                <QuotesControls onFilterChange={onFilterChange} onSearch={onSearch} onNewQuote={onNewQuote} activeFilter={activeFilter} searchRef={searchRef} viewMode={viewMode} setViewMode={setViewMode} summary={filterSummary} />
                
                {isPending ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array.from({ length: 8 }).map((_, i) => <QuoteCardSkeleton key={i} classes={classes} />)}
                    </div>
                ) : error ? (
                    <div className={`text-center p-12 border-2 border-dashed ${classes.border} rounded-xl mt-8 flex flex-col items-center`}>
                        <AlertCircleIcon className={`w-16 h-16 mb-4 text-red-500`} />
                        <h3 className="text-xl font-bold text-red-500">Ett fel uppstod</h3> 
                        <p className={`${classes.textSecondary} mb-6 max-w-sm`}>Kunde inte hämta data från servern. Kontrollera din anslutning och försök igen.</p>
                        <p className="text-xs text-gray-500">Fel: {error.message}</p>
                    </div>
                ) : displayQuotes.length > 0 ? (
                    viewMode === 'cards' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {displayQuotes.map(quote => <QuoteCard key={quote.id} quote={quote} onSelect={onSelectQuote} onStatusChange={onStatusChange} />)} 
                        </div>
                    ) : (
                        <TactileCalendar quotes={displayQuotes} onSelect={onSelectQuote} />
                    )
                ) : (
                    <EmptyState onNewQuote={onNewQuote} classes={classes} />
                )}
            </div>
        );
    };

    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    // --- FIL: components/Header.js ---
    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    const InteractiveNordSymLogo = ({ onOpenHub }) => {
        const { classes } = useContext(ThemeContext);
        return (
            <div className="relative group flex items-center gap-2 cursor-pointer" onClick={onOpenHub}>
                <span className="text-xs text-gray-400 select-none">Powered by</span>
                <div className="relative h-8 w-8">
                    <img 
                        src="https://raw.githubusercontent.com/GusHem/Logga-utan-text/refs/heads/main/Final%20logo%20no%20text.svg" 
                        alt="NordSym Logo" 
                        className="w-full h-full rounded-full transition-all duration-300 ease-in-out group-hover:scale-[3.5] group-hover:z-20 group-hover:bg-white/20 dark:group-hover:bg-gray-900/50 group-hover:backdrop-blur-sm group-hover:p-1 group-hover:shadow-2xl"
                    />
                    <div className="absolute inset-0 flex items-center justify-center w-full h-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30">
                         <InfoIcon className={`w-4 h-4 ${classes.accent} drop-shadow-lg`} />
                    </div>
                </div>
            </div>
        );
    };

    const Header = ({ onToggleTheme, theme, onOpenHub }) => {
        const { classes } = useContext(ThemeContext);
        return (
            <header className={`p-4 flex justify-between items-center ${classes.border} border-b`}>
                <div>
                    <GuldkantLogo className={classes.text} size="h-14" />
                    <div className="relative flex items-center gap-2 opacity-70 mt-2">
                        <InteractiveNordSymLogo onOpenHub={onOpenHub} />
                    </div>
                </div>
                <button onClick={onToggleTheme} className={`p-3 rounded-full ${classes.buttonSecondaryBg} ${classes.buttonSecondaryHover} transition-colors ${focusClasses}`}>
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
            </header>
        );
    };

    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    // --- FIL: App.js (ROT-KOMPONENT) ---
    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    const MainNav = ({ activeView, setActiveView }) => { 
        const { classes } = useContext(ThemeContext); 
        const navItems = [{ id: 'quotes', label: 'Offerter' }, { id: 'ai', label: 'AI-Logg' }, { id: 'analytics', label: 'Analytics' }]; 
        return ( 
            <nav className={`px-4 md:px-8 pt-4 border-b ${classes.border}`}> 
                <div className="flex flex-wrap gap-2"> 
                    {navItems.map(item => ( 
                        <button key={item.id} onClick={() => setActiveView(item.id)} className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${focusClasses} ${activeView === item.id ? classes.navActive : classes.navInactive}`}> 
                            {item.label} 
                        </button> 
                    ))} 
                </div> 
            </nav> 
        ); 
    };

    const AiLog = () => { const { classes } = useContext(ThemeContext); return ( <div className="p-8"><h1 className="text-3xl font-bold mb-6">AI-Logg</h1><p className={classes.textSecondary}>Denna sektion är under utveckling.</p></div> ); };
    const AnalyticsPlaceholder = () => { const { classes } = useContext(ThemeContext); return ( <div className="p-8 text-center"><h1 className="text-3xl font-bold mb-4">Analytics</h1><p className={`${classes.textSecondary}`}>Denna sektion är under utveckling.</p></div> ); }


    function App() {
        const [theme, setTheme] = useState('light');
        const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
        const classes = themes[theme];
        
        const [selectedQuote, setSelectedQuote] = useState(null);
        const [isLoggedIn, setIsLoggedIn] = useState(false);
        const [activeView, setActiveView] = useState('quotes');
        const [filter, setFilter] = useState('alla');
        const [searchTerm, setSearchTerm] = useState('');
        const searchRef = useRef(null);
        const [toast, setToast] = useState(null);
        const toastTimer = useRef(null);
        const [isHubOpen, setIsHubOpen] = useState(false);

        const isModalOpen = !!selectedQuote || isHubOpen;
        
        const { data: quotesData, isPending, error } = useQuery({
            queryKey: ['quotes'],
            queryFn: API.getQuotes,
            enabled: isLoggedIn,
            select: (data) => Array.isArray(data) ? data.map(q => ({ ...q, total: calculateTotal(q) })) : []
        });

        const showToast = useCallback((message, type = 'success') => {
            clearTimeout(toastTimer.current);
            setToast({ id: Date.now(), message, type });
            toastTimer.current = setTimeout(() => setToast(null), 5000);
        }, []);

        const saveQuoteMutation = useMutation({
            mutationFn: API.saveQuote,
            onSuccess: (savedQuote) => {
                showToast(`Ärende ${savedQuote.id} har sparats.`, 'success');
                setSelectedQuote(savedQuote);
                queryClient.invalidateQueries({ queryKey: ['quotes'] });
            },
            onError: (err) => {
                showToast(`Kunde inte spara ärendet: ${err.message}`, 'error');
            },
        });
        
        const dispatchEmailMutation = useMutation({
            mutationFn: API.dispatchQuoteEmail,
            onSuccess: () => showToast('Offert har skickats till kunden.', 'success'),
            onError: (err) => showToast(`Kunde inte skicka offerten: ${err.message}`, 'error')
        });

        const handleLogin = () => setIsLoggedIn(true);
        const handleSelectQuote = (quote) => setSelectedQuote(quote);
        const handleCloseModal = () => setSelectedQuote(null);
        
        const handleStatusChange = (quoteToUpdate, newStatus) => {
            const newEvent = { timestamp: new Date().toISOString(), event: `Status manuellt ändrad till "${statusTextMap[newStatus]}".` };
            const updatedQuote = { ...quoteToUpdate, status: newStatus, events: [...(quoteToUpdate.events || []), newEvent] };
            saveQuoteMutation.mutate(updatedQuote);
        };

        const handleNewQuote = () => {
            const newQuoteTemplate = {
                status: 'utkast',
                customer: 'Nytt ärende',
                eventDate: new Date().toISOString().split('T')[0],
                events: [{ timestamp: new Date().toISOString(), event: 'Ärende skapat' }],
                customCosts: [],
                customDiets: [],
                customerType: 'privat',
                guestCount: 10
            };
            setSelectedQuote(newQuoteTemplate);
        };

        const sortedAndFilteredQuotes = useMemo(() => {
            if (!Array.isArray(quotesData)) return [];
            
            const arkivStatus = ['betald', 'förlorad', 'arkiverad'];
            const aktivaStatus = ['utkast', 'förslag-skickat', 'godkänd', 'genomförd'];
            
            return [...quotesData].filter(q => {
                const term = searchTerm.toLowerCase();
                const searchMatch = term === '' || q.customer?.toLowerCase().includes(term) || q.id?.toLowerCase().includes(term);
                let statusMatch = false;
                if (filter === 'alla') statusMatch = aktivaStatus.includes(q.status);
                else if (filter === 'arkiv') statusMatch = arkivStatus.includes(q.status);
                else statusMatch = q.status === filter;
                return statusMatch && searchMatch;
            }).sort((a, b) => {
                const dateA = a.events?.[0]?.timestamp ? new Date(a.events[0].timestamp) : 0;
                const dateB = b.events?.[0]?.timestamp ? new Date(b.events[0].timestamp) : 0;
                return dateB - dateA;
            });
        }, [quotesData, filter, searchTerm]);

        return (
            <ThemeContext.Provider value={{ theme, toggleTheme, classes }}>
                 <div className={`${classes.bg} ${classes.text} min-h-screen font-sans transition-colors duration-300`}>
                    {!isLoggedIn ? ( 
                        <SimpleLoginScreen onLogin={handleLogin} /> 
                    ) : (
                        <>
                            <div className={`flex flex-col h-screen transition-all duration-300 ${isModalOpen ? 'filter blur-md' : ''}`}>
                                <Header onToggleTheme={toggleTheme} theme={theme} onOpenHub={() => setIsHubOpen(true)} />
                                <MainNav activeView={activeView} setActiveView={setActiveView} />
                                <main className="flex-grow overflow-y-auto">
                                    {activeView === 'quotes' && ( 
                                        <QuotesDashboard 
                                            allQuotes={sortedAndFilteredQuotes}
                                            isPending={isPending}
                                            error={error}
                                            onSelectQuote={handleSelectQuote} 
                                            onNewQuote={handleNewQuote} 
                                            onFilterChange={setFilter} 
                                            onSearch={setSearchTerm} 
                                            activeFilter={filter} 
                                            searchRef={searchRef} 
                                            onStatusChange={handleStatusChange} 
                                        /> 
                                    )}
                                    {activeView === 'ai' && <AiLog />}
                                    {activeView === 'analytics' && <AnalyticsPlaceholder />}
                                </main>
                            </div>
                            <EditModal 
                                quote={selectedQuote} 
                                isOpen={!!selectedQuote} 
                                onClose={handleCloseModal} 
                                saveMutation={saveQuoteMutation}
                                sendProposalMutation={dispatchEmailMutation}
                             />
                            <NordSymSupportHub isOpen={isHubOpen} onClose={() => setIsHubOpen(false)} />
                            <Toast toast={toast} />
                        </>
                    )}
                </div>
            </ThemeContext.Provider>
        );
    }

    const AppWrapper = () => (
        <QueryClientProvider client={queryClient}>
            <App />
        </QueryClientProvider>
    );

    return <AppWrapper />;
}

export { AppLoader as default };
