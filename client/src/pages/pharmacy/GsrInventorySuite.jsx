import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import axiosInstance from '../../api/axiosConfig';
import DashboardLayout from '../../components/DashboardLayout';
import { showError, showSuccess } from '../../utils/sweetalert';
import {
    Activity,
    AlertTriangle,
    ClipboardList,
    Database,
    Download,
    Package,
    Plus,
    RefreshCw,
    RotateCcw,
    Search,
    Send,
    ShieldCheck,
    UserPlus
} from 'lucide-react';

const emptyMainReceive = {
    scanCode: '',
    quantity: '',
    source: '',
    toLocation: '',
    notes: ''
};

const emptyMainIssue = {
    scanCode: '',
    quantity: '',
    department: '',
    toLocation: '',
    receiverName: '',
    reason: ''
};

const emptyMainStockTake = {
    scanCode: '',
    countedQuantity: '',
    location: '',
    reason: ''
};

const emptyPatient = {
    patientName: '',
    patientIdentifier: '',
    patientType: '',
    procedureName: '',
    doctorName: ''
};

const emptyCathReceive = {
    scanCode: '',
    quantity: '',
    source: '',
    subStore: '',
    procedureRoom: ''
};

const emptyCathIssue = {
    scanCode: '',
    quantity: '',
    subStore: '',
    procedureRoom: '',
    nurseName: ''
};

const emptyCathConsume = {
    caseId: '',
    scanCode: '',
    quantity: '',
    procedureRoom: '',
    nurseName: ''
};

const emptyCathReturn = {
    scanCode: '',
    quantity: '',
    subStore: '',
    procedureRoom: '',
    nurseName: '',
    reused: false
};

const emptyLookup = {
    module: 'main_store',
    type: 'store_location',
    label: '',
    value: '',
    description: ''
};

const emptyReport = {
    module: 'main_store',
    q: '',
    transactionType: '',
    xAxis: 'transactionType'
};

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;
const formatNumber = (value) => Number(value || 0).toLocaleString();
const escapeCsvValue = (value) => {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
};

const StatTile = ({ icon, label, value, tone = 'blue' }) => {
    const tones = {
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        amber: 'bg-amber-50 text-amber-700 border-amber-100',
        red: 'bg-red-50 text-red-700 border-red-100',
        slate: 'bg-slate-50 text-slate-700 border-slate-100'
    };

    return (
        <div className={`rounded-xl border p-4 ${tones[tone] || tones.blue}`}>
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
                    <p className="mt-2 text-2xl font-bold">{value}</p>
                </div>
                {createElement(icon, { className: 'h-8 w-8 opacity-75' })}
            </div>
        </div>
    );
};

const TextInput = ({ label, ...props }) => (
    <label className="space-y-1">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <input {...props} className="input-field" />
    </label>
);

const SelectInput = ({ label, children, ...props }) => (
    <label className="space-y-1">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <select {...props} className="input-field">
            {children}
        </select>
    </label>
);

const Panel = ({ title, icon, children, actions }) => (
    <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
                {createElement(icon, { className: 'h-5 w-5 text-blue-600' })}
                <h2 className="text-lg font-bold text-slate-800">{title}</h2>
            </div>
            {actions}
        </div>
        {children}
    </section>
);

const GsrInventorySuite = () => {
    const [activeTab, setActiveTab] = useState('main_store');
    const [loading, setLoading] = useState(true);
    const [mainDashboard, setMainDashboard] = useState(null);
    const [cathDashboard, setCathDashboard] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [cases, setCases] = useState([]);
    const [lookups, setLookups] = useState([]);
    const [reportRows, setReportRows] = useState([]);
    const [reportGraph, setReportGraph] = useState([]);
    const [reportForm, setReportForm] = useState(emptyReport);

    const [mainReceive, setMainReceive] = useState(emptyMainReceive);
    const [mainIssue, setMainIssue] = useState(emptyMainIssue);
    const [mainStockTake, setMainStockTake] = useState(emptyMainStockTake);
    const [patientForm, setPatientForm] = useState(emptyPatient);
    const [cathReceive, setCathReceive] = useState(emptyCathReceive);
    const [cathIssue, setCathIssue] = useState(emptyCathIssue);
    const [cathConsume, setCathConsume] = useState(emptyCathConsume);
    const [cathReturn, setCathReturn] = useState(emptyCathReturn);
    const [lookupForm, setLookupForm] = useState(emptyLookup);

    const fetchSuiteData = useCallback(async () => {
        try {
            setLoading(true);
            const [mainRes, cathRes, suggestionRes, caseRes, lookupRes] = await Promise.all([
                axiosInstance.get('/api/gsr/main-store/dashboard'),
                axiosInstance.get('/api/gsr/cath-lab/dashboard'),
                axiosInstance.get('/api/gsr/cath-lab/daily-suggestions'),
                axiosInstance.get('/api/gsr/cath-lab/patients?limit=25'),
                axiosInstance.get('/api/gsr/lookups?active=true')
            ]);

            setMainDashboard(mainRes.data.data);
            setCathDashboard(cathRes.data.data);
            setSuggestions(suggestionRes.data.data || []);
            setCases(caseRes.data.data || []);
            setLookups(lookupRes.data.data || []);
        } catch (error) {
            console.error('GSR suite load error:', error);
            showError(error.response?.data?.message || 'Failed to load GSR suite data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSuiteData();
    }, [fetchSuiteData]);

    const groupedLookups = useMemo(() => {
        return lookups.reduce((acc, lookup) => {
            const key = `${lookup.module}/${lookup.type}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(lookup);
            return acc;
        }, {});
    }, [lookups]);

    const submitForm = async ({ endpoint, payload, reset, message }) => {
        try {
            await axiosInstance.post(endpoint, payload);
            reset();
            await fetchSuiteData();
            showSuccess(message);
        } catch (error) {
            console.error('GSR submit error:', error);
            showError(error.response?.data?.message || 'Request failed');
        }
    };

    const handleReport = async (e) => {
        e.preventDefault();
        try {
            const endpoint = reportForm.module === 'cath_lab'
                ? '/api/gsr/cath-lab/reports/generic'
                : '/api/gsr/main-store/reports/generic';

            const { data } = await axiosInstance.get(endpoint, { params: reportForm });
            setReportRows(data.data || []);
            setReportGraph(data.graphData || []);
            showSuccess('Report generated');
        } catch (error) {
            console.error('GSR report error:', error);
            showError(error.response?.data?.message || 'Failed to generate report');
        }
    };

    const downloadReportCsv = () => {
        if (reportRows.length === 0) return;

        const headers = ['Date', 'Type', 'Item', 'Batch', 'Quantity', 'Cost'];
        const rows = reportRows.map((row) => [
            row.createdAt ? new Date(row.createdAt).toLocaleString() : '',
            row.transactionType || '',
            row.masterMedicineId?.name || '',
            row.batchNumber || '',
            row.quantity || 0,
            row.totalCost || 0
        ]);

        const csv = [headers, ...rows]
            .map((row) => row.map(escapeCsvValue).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `afic-gsr-${reportForm.module}-report.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const printWristband = (cathCase) => {
        const popup = window.open('', '_blank', 'width=480,height=320');
        if (!popup) return;

        popup.document.write(`
            <html>
                <head>
                    <title>Wristband - ${cathCase.caseNumber}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 16px; }
                        .band { border: 2px solid #111827; padding: 12px; width: 360px; }
                        .label { font-size: 10px; text-transform: uppercase; color: #475569; }
                        .value { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
                        .barcode { font-family: monospace; font-size: 18px; letter-spacing: 1px; border-top: 1px dashed #94a3b8; padding-top: 8px; }
                    </style>
                </head>
                <body>
                    <div class="band">
                        <div class="label">AFIC Cath Lab</div>
                        <div class="value">${cathCase.patientName}</div>
                        <div class="label">Case</div>
                        <div class="value">${cathCase.caseNumber}</div>
                        <div class="label">Procedure / Doctor</div>
                        <div class="value">${cathCase.procedureName} / ${cathCase.doctorName}</div>
                        <div class="label">Wristband Barcode</div>
                        <div class="barcode">${cathCase.wristbandBarcode}</div>
                    </div>
                    <script>window.print(); window.close();</script>
                </body>
            </html>
        `);
        popup.document.close();
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex min-h-[60vh] items-center justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="mx-auto max-w-7xl space-y-6 p-6">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">AFIC GSR Store Suite</h1>
                        <p className="mt-1 text-slate-500">Main Medical Store and Cath Lab inventory workflows.</p>
                    </div>
                    <button onClick={fetchSuiteData} className="btn-secondary flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 rounded-xl border border-slate-100 bg-white p-2 shadow-sm">
                    {[
                        ['main_store', 'Main Store'],
                        ['cath_lab', 'Cath Lab'],
                        ['lookups', 'Lookups'],
                        ['reports', 'Reports']
                    ].map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${activeTab === key
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {activeTab === 'main_store' && (
                    <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                            <StatTile icon={Package} label="Batches" value={formatNumber(mainDashboard?.totalBatches)} />
                            <StatTile icon={Database} label="Total Stock" value={formatNumber(mainDashboard?.totalStock)} tone="green" />
                            <StatTile icon={AlertTriangle} label="Low Stock" value={formatNumber(mainDashboard?.lowStockCount)} tone="red" />
                            <StatTile icon={Activity} label="Forecast 30 Days" value={formatNumber(mainDashboard?.forecastNext30Days)} tone="amber" />
                            <StatTile icon={ShieldCheck} label="Budget Value" value={formatCurrency(mainDashboard?.approximateBudget)} tone="slate" />
                        </div>

                        <div className="grid gap-6 lg:grid-cols-3">
                            <Panel title="Receive Stock" icon={Plus}>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        submitForm({
                                            endpoint: '/api/gsr/main-store/receive',
                                            payload: mainReceive,
                                            reset: () => setMainReceive(emptyMainReceive),
                                            message: 'Main store receipt recorded'
                                        });
                                    }}
                                    className="grid gap-4 md:grid-cols-2"
                                >
                                    <TextInput label="Batch / Barcode / QR" value={mainReceive.scanCode} onChange={(e) => setMainReceive({ ...mainReceive, scanCode: e.target.value })} required />
                                    <TextInput label="Quantity" type="number" min="1" value={mainReceive.quantity} onChange={(e) => setMainReceive({ ...mainReceive, quantity: e.target.value })} required />
                                    <TextInput label="Source" value={mainReceive.source} onChange={(e) => setMainReceive({ ...mainReceive, source: e.target.value })} />
                                    <TextInput label="Store Location" value={mainReceive.toLocation} onChange={(e) => setMainReceive({ ...mainReceive, toLocation: e.target.value })} />
                                    <div className="md:col-span-2">
                                        <TextInput label="Notes" value={mainReceive.notes} onChange={(e) => setMainReceive({ ...mainReceive, notes: e.target.value })} />
                                    </div>
                                    <button type="submit" className="btn-primary flex items-center justify-center gap-2 md:col-span-2">
                                        <Plus className="h-4 w-4" />
                                        Receive
                                    </button>
                                </form>
                            </Panel>

                            <Panel title="Issue Department Wise" icon={Send}>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        submitForm({
                                            endpoint: '/api/gsr/main-store/issue',
                                            payload: mainIssue,
                                            reset: () => setMainIssue(emptyMainIssue),
                                            message: 'Main store issue recorded'
                                        });
                                    }}
                                    className="grid gap-4 md:grid-cols-2"
                                >
                                    <TextInput label="Batch / Barcode / QR" value={mainIssue.scanCode} onChange={(e) => setMainIssue({ ...mainIssue, scanCode: e.target.value })} required />
                                    <TextInput label="Quantity" type="number" min="1" value={mainIssue.quantity} onChange={(e) => setMainIssue({ ...mainIssue, quantity: e.target.value })} required />
                                    <TextInput label="Department" value={mainIssue.department} onChange={(e) => setMainIssue({ ...mainIssue, department: e.target.value })} required />
                                    <TextInput label="Issue Location" value={mainIssue.toLocation} onChange={(e) => setMainIssue({ ...mainIssue, toLocation: e.target.value })} />
                                    <TextInput label="Receiver" value={mainIssue.receiverName} onChange={(e) => setMainIssue({ ...mainIssue, receiverName: e.target.value })} />
                                    <TextInput label="Reason" value={mainIssue.reason} onChange={(e) => setMainIssue({ ...mainIssue, reason: e.target.value })} />
                                    <button type="submit" className="btn-primary flex items-center justify-center gap-2 md:col-span-2">
                                        <Send className="h-4 w-4" />
                                        Issue
                                    </button>
                                </form>
                            </Panel>

                            <Panel title="Stock Taking" icon={ClipboardList}>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        submitForm({
                                            endpoint: '/api/gsr/main-store/stock-taking',
                                            payload: mainStockTake,
                                            reset: () => setMainStockTake(emptyMainStockTake),
                                            message: 'Stock taking recorded'
                                        });
                                    }}
                                    className="space-y-4"
                                >
                                    <TextInput label="Batch / Barcode / QR" value={mainStockTake.scanCode} onChange={(e) => setMainStockTake({ ...mainStockTake, scanCode: e.target.value })} required />
                                    <TextInput label="Counted Quantity" type="number" min="0" value={mainStockTake.countedQuantity} onChange={(e) => setMainStockTake({ ...mainStockTake, countedQuantity: e.target.value })} required />
                                    <TextInput label="Location" value={mainStockTake.location} onChange={(e) => setMainStockTake({ ...mainStockTake, location: e.target.value })} />
                                    <TextInput label="Reason" value={mainStockTake.reason} onChange={(e) => setMainStockTake({ ...mainStockTake, reason: e.target.value })} />
                                    <button type="submit" className="btn-primary flex w-full items-center justify-center gap-2">
                                        <ClipboardList className="h-4 w-4" />
                                        Record Count
                                    </button>
                                </form>
                            </Panel>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-2">
                            <Panel title="Top Consumption" icon={Activity}>
                                <div className="space-y-3">
                                    {(mainDashboard?.topConsumption || []).slice(0, 6).map((item) => (
                                        <div key={item.medicineId || item.medicineName} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                                            <span className="font-medium text-slate-700">{item.medicineName}</span>
                                            <span className="text-slate-500">{formatNumber(item.quantity)} units</span>
                                        </div>
                                    ))}
                                    {(!mainDashboard?.topConsumption || mainDashboard.topConsumption.length === 0) && (
                                        <p className="text-slate-500">No issue history yet.</p>
                                    )}
                                </div>
                            </Panel>

                            <Panel title="Department Issues" icon={ClipboardList}>
                                <div className="space-y-3">
                                    {(mainDashboard?.departmentIssues || []).slice(0, 6).map((item) => (
                                        <div key={item.department} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                                            <span className="font-medium text-slate-700">{item.department}</span>
                                            <span className="text-slate-500">{formatCurrency(item.totalCost)}</span>
                                        </div>
                                    ))}
                                    {(!mainDashboard?.departmentIssues || mainDashboard.departmentIssues.length === 0) && (
                                        <p className="text-slate-500">No department issue history yet.</p>
                                    )}
                                </div>
                            </Panel>
                        </div>
                    </div>
                )}

                {activeTab === 'cath_lab' && (
                    <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                            <StatTile icon={UserPlus} label="Active Cases" value={formatNumber(cathDashboard?.activeCases)} />
                            <StatTile icon={ClipboardList} label="Registered Today" value={formatNumber(cathDashboard?.registeredToday)} tone="green" />
                            <StatTile icon={Package} label="Consumed Qty" value={formatNumber(cathDashboard?.consumedQuantity)} tone="amber" />
                            <StatTile icon={AlertTriangle} label="Low Stock" value={formatNumber(cathDashboard?.lowStockCount)} tone="red" />
                            <StatTile icon={Activity} label="Expense" value={formatCurrency(cathDashboard?.totalExpense)} tone="slate" />
                        </div>

                        <div className="grid gap-6 xl:grid-cols-4">
                            <Panel title="Register Patient" icon={UserPlus}>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        submitForm({
                                            endpoint: '/api/gsr/cath-lab/patients',
                                            payload: patientForm,
                                            reset: () => setPatientForm(emptyPatient),
                                            message: 'Cath Lab patient registered'
                                        });
                                    }}
                                    className="space-y-4"
                                >
                                    <TextInput label="Patient Name" value={patientForm.patientName} onChange={(e) => setPatientForm({ ...patientForm, patientName: e.target.value })} required />
                                    <TextInput label="Patient MR / CNIC" value={patientForm.patientIdentifier} onChange={(e) => setPatientForm({ ...patientForm, patientIdentifier: e.target.value })} />
                                    <TextInput label="Patient Type" value={patientForm.patientType} onChange={(e) => setPatientForm({ ...patientForm, patientType: e.target.value })} />
                                    <TextInput label="Procedure" value={patientForm.procedureName} onChange={(e) => setPatientForm({ ...patientForm, procedureName: e.target.value })} required />
                                    <TextInput label="Doctor" value={patientForm.doctorName} onChange={(e) => setPatientForm({ ...patientForm, doctorName: e.target.value })} required />
                                    <button type="submit" className="btn-primary flex w-full items-center justify-center gap-2">
                                        <UserPlus className="h-4 w-4" />
                                        Register
                                    </button>
                                </form>
                            </Panel>

                            <Panel title="Receive Cath Lab Stock" icon={Plus}>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        submitForm({
                                            endpoint: '/api/gsr/cath-lab/receive',
                                            payload: cathReceive,
                                            reset: () => setCathReceive(emptyCathReceive),
                                            message: 'Cath Lab receipt recorded'
                                        });
                                    }}
                                    className="space-y-4"
                                >
                                    <TextInput label="Batch / Barcode / QR" value={cathReceive.scanCode} onChange={(e) => setCathReceive({ ...cathReceive, scanCode: e.target.value })} required />
                                    <TextInput label="Quantity" type="number" min="1" value={cathReceive.quantity} onChange={(e) => setCathReceive({ ...cathReceive, quantity: e.target.value })} required />
                                    <TextInput label="Source" value={cathReceive.source} onChange={(e) => setCathReceive({ ...cathReceive, source: e.target.value })} />
                                    <TextInput label="Sub Store" value={cathReceive.subStore} onChange={(e) => setCathReceive({ ...cathReceive, subStore: e.target.value })} />
                                    <TextInput label="Procedure Room" value={cathReceive.procedureRoom} onChange={(e) => setCathReceive({ ...cathReceive, procedureRoom: e.target.value })} />
                                    <button type="submit" className="btn-primary flex w-full items-center justify-center gap-2">
                                        <Plus className="h-4 w-4" />
                                        Receive
                                    </button>
                                </form>
                            </Panel>

                            <Panel title="Issue To Procedure Room" icon={Send}>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        submitForm({
                                            endpoint: '/api/gsr/cath-lab/issue',
                                            payload: cathIssue,
                                            reset: () => setCathIssue(emptyCathIssue),
                                            message: 'Procedure-room issue recorded'
                                        });
                                    }}
                                    className="space-y-4"
                                >
                                    <TextInput label="Batch / Barcode / QR" value={cathIssue.scanCode} onChange={(e) => setCathIssue({ ...cathIssue, scanCode: e.target.value })} required />
                                    <TextInput label="Quantity" type="number" min="1" value={cathIssue.quantity} onChange={(e) => setCathIssue({ ...cathIssue, quantity: e.target.value })} required />
                                    <TextInput label="Sub Store" value={cathIssue.subStore} onChange={(e) => setCathIssue({ ...cathIssue, subStore: e.target.value })} />
                                    <TextInput label="Procedure Room" value={cathIssue.procedureRoom} onChange={(e) => setCathIssue({ ...cathIssue, procedureRoom: e.target.value })} />
                                    <TextInput label="Nurse" value={cathIssue.nurseName} onChange={(e) => setCathIssue({ ...cathIssue, nurseName: e.target.value })} required />
                                    <button type="submit" className="btn-primary flex w-full items-center justify-center gap-2">
                                        <Send className="h-4 w-4" />
                                        Issue
                                    </button>
                                </form>
                            </Panel>

                            <Panel title="Record Patient Consumption" icon={Activity}>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        submitForm({
                                            endpoint: '/api/gsr/cath-lab/consume',
                                            payload: cathConsume,
                                            reset: () => setCathConsume(emptyCathConsume),
                                            message: 'Patient consumption recorded'
                                        });
                                    }}
                                    className="space-y-4"
                                >
                                    <SelectInput label="Patient Case" value={cathConsume.caseId} onChange={(e) => setCathConsume({ ...cathConsume, caseId: e.target.value })} required>
                                        <option value="">Select case</option>
                                        {cases.map((item) => (
                                            <option key={item._id} value={item._id}>
                                                {item.caseNumber} - {item.patientName}
                                            </option>
                                        ))}
                                    </SelectInput>
                                    <TextInput label="Batch / Barcode / QR" value={cathConsume.scanCode} onChange={(e) => setCathConsume({ ...cathConsume, scanCode: e.target.value })} required />
                                    <TextInput label="Quantity" type="number" min="1" value={cathConsume.quantity} onChange={(e) => setCathConsume({ ...cathConsume, quantity: e.target.value })} required />
                                    <TextInput label="Procedure Room" value={cathConsume.procedureRoom} onChange={(e) => setCathConsume({ ...cathConsume, procedureRoom: e.target.value })} />
                                    <TextInput label="Nurse" value={cathConsume.nurseName} onChange={(e) => setCathConsume({ ...cathConsume, nurseName: e.target.value })} />
                                    <button type="submit" className="btn-primary flex w-full items-center justify-center gap-2">
                                        <Activity className="h-4 w-4" />
                                        Record
                                    </button>
                                </form>
                            </Panel>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-3">
                            <Panel title="Return / Re-ingest Items" icon={RotateCcw}>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        submitForm({
                                            endpoint: '/api/gsr/cath-lab/return',
                                            payload: cathReturn,
                                            reset: () => setCathReturn(emptyCathReturn),
                                            message: 'Cath Lab return recorded'
                                        });
                                    }}
                                    className="grid gap-4 md:grid-cols-2"
                                >
                                    <TextInput label="Batch / Barcode / QR" value={cathReturn.scanCode} onChange={(e) => setCathReturn({ ...cathReturn, scanCode: e.target.value })} required />
                                    <TextInput label="Quantity" type="number" min="1" value={cathReturn.quantity} onChange={(e) => setCathReturn({ ...cathReturn, quantity: e.target.value })} required />
                                    <TextInput label="Sub Store" value={cathReturn.subStore} onChange={(e) => setCathReturn({ ...cathReturn, subStore: e.target.value })} />
                                    <TextInput label="Procedure Room" value={cathReturn.procedureRoom} onChange={(e) => setCathReturn({ ...cathReturn, procedureRoom: e.target.value })} />
                                    <TextInput label="Nurse" value={cathReturn.nurseName} onChange={(e) => setCathReturn({ ...cathReturn, nurseName: e.target.value })} />
                                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={cathReturn.reused}
                                            onChange={(e) => setCathReturn({ ...cathReturn, reused: e.target.checked })}
                                        />
                                        Re-ingest as reused
                                    </label>
                                    <button type="submit" className="btn-primary flex items-center justify-center gap-2 md:col-span-2">
                                        <RotateCcw className="h-4 w-4" />
                                        Return
                                    </button>
                                </form>
                            </Panel>

                            <Panel title="Minimum Daily Issue Suggestions" icon={ClipboardList}>
                                <div className="space-y-3">
                                    {suggestions.slice(0, 8).map((item) => (
                                        <div key={`${item.medicineId}-${item.procedureRoom}`} className="rounded-lg bg-slate-50 px-3 py-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="font-medium text-slate-700">{item.medicineName}</span>
                                                <span className="font-semibold text-blue-700">{item.minimumDailyIssue} daily</span>
                                            </div>
                                            <p className="mt-1 text-xs text-slate-500">{item.procedureRoom} - {formatNumber(item.totalConsumed)} consumed in window</p>
                                        </div>
                                    ))}
                                    {suggestions.length === 0 && <p className="text-slate-500">No consumption history available for suggestions.</p>}
                                </div>
                            </Panel>

                            <Panel title="Registered Cases" icon={UserPlus}>
                                <div className="space-y-3">
                                    {cases.slice(0, 8).map((item) => (
                                        <div key={item._id} className="rounded-lg bg-slate-50 px-3 py-2">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-medium text-slate-700">{item.patientName}</p>
                                                    <p className="mt-1 text-xs text-slate-500">{item.caseNumber} - {item.procedureName}</p>
                                                    <p className="mt-1 font-mono text-xs text-slate-600">{item.wristbandBarcode}</p>
                                                </div>
                                                <button type="button" className="btn-secondary px-3 py-1 text-xs" onClick={() => printWristband(item)}>
                                                    Print
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {cases.length === 0 && <p className="text-slate-500">No Cath Lab cases registered yet.</p>}
                                </div>
                            </Panel>
                        </div>
                    </div>
                )}

                {activeTab === 'lookups' && (
                    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
                        <Panel title="Add Lookup Value" icon={Plus}>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    submitForm({
                                        endpoint: '/api/gsr/lookups',
                                        payload: lookupForm,
                                        reset: () => setLookupForm(emptyLookup),
                                        message: 'Lookup value added'
                                    });
                                }}
                                className="space-y-4"
                            >
                                <SelectInput label="Module" value={lookupForm.module} onChange={(e) => setLookupForm({ ...lookupForm, module: e.target.value })}>
                                    <option value="main_store">Main Store</option>
                                    <option value="cath_lab">Cath Lab</option>
                                    <option value="master_admin">Master Admin</option>
                                    <option value="shared">Shared</option>
                                </SelectInput>
                                <TextInput label="Type" value={lookupForm.type} onChange={(e) => setLookupForm({ ...lookupForm, type: e.target.value })} required />
                                <TextInput label="Label" value={lookupForm.label} onChange={(e) => setLookupForm({ ...lookupForm, label: e.target.value })} required />
                                <TextInput label="Value" value={lookupForm.value} onChange={(e) => setLookupForm({ ...lookupForm, value: e.target.value })} required />
                                <TextInput label="Description" value={lookupForm.description} onChange={(e) => setLookupForm({ ...lookupForm, description: e.target.value })} />
                                <button type="submit" className="btn-primary flex w-full items-center justify-center gap-2">
                                    <Plus className="h-4 w-4" />
                                    Add Lookup
                                </button>
                            </form>
                        </Panel>

                        <Panel title="Lookup Registry" icon={Database}>
                            <div className="grid gap-4 md:grid-cols-2">
                                {Object.entries(groupedLookups).map(([key, items]) => (
                                    <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                                        <h3 className="font-bold text-slate-700">{key}</h3>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {items.map((item) => (
                                                <span key={item._id} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                                                    {item.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {lookups.length === 0 && <p className="text-slate-500">No lookup values configured yet.</p>}
                            </div>
                        </Panel>
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div className="space-y-6">
                        <Panel
                            title="Generic Search and Report"
                            icon={Search}
                            actions={
                                <button
                                    className="btn-secondary flex items-center gap-2 disabled:opacity-50"
                                    type="button"
                                    onClick={downloadReportCsv}
                                    disabled={reportRows.length === 0}
                                >
                                    <Download className="h-4 w-4" />
                                    Export CSV
                                </button>
                            }
                        >
                            <form onSubmit={handleReport} className="grid gap-4 md:grid-cols-5">
                                <SelectInput label="Module" value={reportForm.module} onChange={(e) => setReportForm({ ...reportForm, module: e.target.value })}>
                                    <option value="main_store">Main Store</option>
                                    <option value="cath_lab">Cath Lab</option>
                                </SelectInput>
                                <TextInput label="Search" value={reportForm.q} onChange={(e) => setReportForm({ ...reportForm, q: e.target.value })} />
                                <TextInput label="Transaction Type" value={reportForm.transactionType} onChange={(e) => setReportForm({ ...reportForm, transactionType: e.target.value })} />
                                <SelectInput label="X-axis" value={reportForm.xAxis} onChange={(e) => setReportForm({ ...reportForm, xAxis: e.target.value })}>
                                    <option value="transactionType">Transaction Type</option>
                                    <option value="date">Date</option>
                                    <option value="item">Item</option>
                                    <option value="department">Department</option>
                                    <option value="location">Location</option>
                                    <option value="doctor">Doctor</option>
                                    <option value="procedure">Procedure</option>
                                    <option value="patientType">Patient Type</option>
                                    <option value="nurse">Nurse</option>
                                    <option value="procedureRoom">Procedure Room</option>
                                </SelectInput>
                                <button type="submit" className="btn-primary mt-5 flex items-center justify-center gap-2">
                                    <Search className="h-4 w-4" />
                                    Generate
                                </button>
                            </form>
                        </Panel>

                        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
                            <Panel title="Graph Data" icon={Activity}>
                                <div className="space-y-3">
                                    {(() => {
                                        const maxQuantity = Math.max(...reportGraph.map((item) => item.quantity || 0), 1);
                                        return reportGraph.slice(0, 10).map((item) => (
                                            <div key={item.label} className="rounded-lg bg-slate-50 px-3 py-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-slate-700">{item.label}</span>
                                                    <span className="text-blue-700">{formatNumber(item.quantity)}</span>
                                                </div>
                                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                                                    <div
                                                        className="h-full rounded-full bg-blue-600"
                                                        style={{ width: `${Math.max(4, ((item.quantity || 0) / maxQuantity) * 100)}%` }}
                                                    />
                                                </div>
                                                <p className="mt-1 text-xs text-slate-500">{item.count} records - {formatCurrency(item.totalCost)}</p>
                                            </div>
                                        ));
                                    })()}
                                    {reportGraph.length === 0 && <p className="text-slate-500">Generate a report to view graph data.</p>}
                                </div>
                            </Panel>

                            <Panel title="Report Rows" icon={ClipboardList}>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[760px] text-left text-sm">
                                        <thead className="bg-slate-50 text-slate-600">
                                            <tr>
                                                <th className="px-3 py-2">Date</th>
                                                <th className="px-3 py-2">Type</th>
                                                <th className="px-3 py-2">Item</th>
                                                <th className="px-3 py-2">Batch</th>
                                                <th className="px-3 py-2">Qty</th>
                                                <th className="px-3 py-2">Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {reportRows.slice(0, 50).map((row) => (
                                                <tr key={row._id} className="hover:bg-slate-50">
                                                    <td className="px-3 py-2 text-slate-600">{new Date(row.createdAt).toLocaleDateString()}</td>
                                                    <td className="px-3 py-2 font-medium text-slate-700">{row.transactionType}</td>
                                                    <td className="px-3 py-2 text-slate-600">{row.masterMedicineId?.name || '-'}</td>
                                                    <td className="px-3 py-2 text-slate-600">{row.batchNumber || '-'}</td>
                                                    <td className="px-3 py-2 text-slate-600">{formatNumber(row.quantity)}</td>
                                                    <td className="px-3 py-2 text-slate-600">{formatCurrency(row.totalCost)}</td>
                                                </tr>
                                            ))}
                                            {reportRows.length === 0 && (
                                                <tr>
                                                    <td className="px-3 py-6 text-center text-slate-500" colSpan="6">No report rows yet.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Panel>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default GsrInventorySuite;
