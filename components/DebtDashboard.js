"use client";

import React, { useState, useCallback } from 'react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

const DebtDashboard = () => {
  const [loanData, setLoanData] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeView, setActiveView] = useState('overview');

  const cutoffDate = new Date(2026, 1, 1);

  const loanColors = {
    'Leasing Sabadell': '#6366f1',
    'Acquisgran 50000': '#22c55e',
    'Caixa Prestamo 30000': '#f59e0b',
    'Caixa Prestamo 50000': '#ef4444',
    'Caixa Prestamo 65000': '#8b5cf6',
    'Sabadell Prestamo 15000': '#06b6d4',
    'Outfund 50000': '#ec4899',
    'Outfund 40000': '#ec4899',
    'BBVA Click and Play 17000': '#14b8a6'
  };

  const parseExcelFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const loans = [];
        
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });
          
          if (jsonData.length < 7) return;
          
          const loanName = jsonData[0] && jsonData[0][1] ? String(jsonData[0][1]) : sheetName;
          const originalAmount = jsonData[1] && jsonData[1][1] ? parseFloat(jsonData[1][1]) || 0 : 0;
          const frequency = jsonData[3] && jsonData[3][1] ? String(jsonData[3][1]) : 'Monthly';
          
          const isWeekly = frequency.toLowerCase() === 'weekly';
          const payments = [];
          
          for (let i = 6; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length < 6) continue;
            
            const paymentNum = row[0];
            const dueDateRaw = row[1];
            const principal = parseFloat(row[2]) || 0;
            const interest = parseFloat(row[3]) || 0;
            const totalPayment = parseFloat(row[4]) || 0;
            const remainingBalance = parseFloat(row[5]) || 0;
            
            if (!paymentNum && !dueDateRaw && !principal && !totalPayment) continue;
            
            let dueDate = null;
            if (dueDateRaw) {
              dueDate = dueDateRaw instanceof Date ? dueDateRaw : new Date(dueDateRaw);
              if (isNaN(dueDate.getTime())) dueDate = null;
            }
            
            if (!dueDate) continue;
            
            payments.push({ paymentNum, date: dueDate, principal, interest, payment: totalPayment, balance: remainingBalance });
          }
          
          if (payments.length === 0) return;
          payments.sort((a, b) => a.date - b.date);
          
          // Find first payment from Feb 2026 onwards
          const cutoff = new Date(2026, 1, 1);
          const futurePayments = payments.filter(p => p.date >= cutoff);
          const firstFuturePayment = futurePayments.length > 0 ? futurePayments[0] : payments[payments.length - 1];
          const lastPayment = payments[payments.length - 1];
          
          // FIXED: Current balance = balance BEFORE first payment (balance after + principal)
          const currentBalance = firstFuturePayment.balance + firstFuturePayment.principal;
          
          loans.push({
            name: loanName, originalAmount, frequency, payments,
            currentBalance: currentBalance,
            monthlyPayment: isWeekly ? firstFuturePayment.payment * 4.33 : firstFuturePayment.payment,
            totalInterest: payments.filter(p => p.date >= cutoff).reduce((sum, p) => sum + p.interest, 0),
            paymentAmount: firstFuturePayment.payment,
            endDate: lastPayment.date, isWeekly,
            color: loanColors[loanName] || loanColors[sheetName] || '#64748b'
          });
        });
        
        if (loans.length === 0) { setParseError('No valid loan data found.'); return; }
        setLoanData(loans);
        setFileName(file.name);
        setParseError(null);
      } catch (err) { setParseError('Error: ' + err.message); }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) parseExcelFile(file);
    else setParseError('Please upload an Excel file (.xlsx or .xls)');
  }, [parseExcelFile]);
  const handleFileInput = useCallback((e) => { if (e.target.files[0]) parseExcelFile(e.target.files[0]); }, [parseExcelFile]);

  const formatCurrency = (v) => '€' + v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '-';

  if (!loanData) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-8">💳 Debt Dashboard - Innovation Campus (v3)</h1>
        <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
          className={`w-full max-w-md p-12 rounded-xl text-center transition-all bg-white ${isDragging ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
          style={{ border: `3px dashed ${isDragging ? '#f87171' : '#d1d5db'}` }}>
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-xl text-gray-700 mb-2">Upload Loans File</h2>
          <p className="text-gray-500 mb-4">Drag & drop <strong>ICampus_Loans_Clean_v2.xlsx</strong></p>
          <label className="inline-block px-6 py-3 bg-red-500 text-white rounded-lg cursor-pointer font-bold hover:bg-red-600">
            Browse Files
            <input type="file" accept=".xlsx,.xls" onChange={handleFileInput} className="hidden" />
          </label>
        </div>
        {parseError && <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{parseError}</div>}
      </div>
    );
  }

  const metrics = {
    totalDebt: loanData.reduce((s, l) => s + l.currentBalance, 0),
    totalOriginal: loanData.reduce((s, l) => s + l.originalAmount, 0),
    monthlyPayment: loanData.reduce((s, l) => s + l.monthlyPayment, 0),
    totalInterest: loanData.reduce((s, l) => s + l.totalInterest, 0),
    activeLoans: loanData.filter(l => l.currentBalance > 0).length,
    finalPayoff: new Date(Math.max(...loanData.map(l => l.endDate))),
  };
  metrics.paidOffPercent = metrics.totalOriginal > 0 ? ((metrics.totalOriginal - metrics.totalDebt) / metrics.totalOriginal) * 100 : 0;

  const getTimelineData = () => {
    const maxDate = new Date(Math.max(...loanData.flatMap(l => l.payments.map(p => p.date))));
    const timeline = [];
    const current = new Date(2026, 1, 1);
    
    while (current <= maxDate) {
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      const monthData = { month: current.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), total: 0 };
      
      loanData.forEach(loan => {
        const paymentsThisMonthOrBefore = loan.payments.filter(p => p.date <= monthEnd);
        let balance = 0;
        
        if (paymentsThisMonthOrBefore.length > 0) {
          balance = paymentsThisMonthOrBefore[paymentsThisMonthOrBefore.length - 1].balance;
        } else {
          const firstPayment = loan.payments[0];
          if (firstPayment) balance = firstPayment.balance + firstPayment.principal;
        }
        
        monthData[loan.name.replace(/\s+/g, '_')] = balance;
        monthData.total += balance;
      });
      
      timeline.push(monthData);
      current.setMonth(current.getMonth() + 1);
    }
    return timeline;
  };

  const getPaymentSchedule = () => {
    const mp = {};
    loanData.forEach(loan => {
      loan.payments.filter(p => p.date >= cutoffDate).forEach(p => {
        const k = `${p.date.getFullYear()}-${String(p.date.getMonth() + 1).padStart(2, '0')}`;
        const label = p.date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
        if (!mp[k]) mp[k] = { month: label, total: 0 };
        const key = loan.name.replace(/\s+/g, '_');
        mp[k][key] = (mp[k][key] || 0) + p.payment;
        mp[k].total += p.payment;
      });
    });
    return Object.entries(mp).sort(([a], [b]) => a.localeCompare(b)).map(([, d]) => d);
  };

  const timelineData = getTimelineData();
  const paymentSchedule = getPaymentSchedule();
  const btn = (active) => ({ padding: '8px 16px', marginRight: '8px', backgroundColor: active ? '#3b82f6' : '#e5e7eb', color: active ? 'white' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: active ? 'bold' : 'normal' });

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-800">💳 Debt Dashboard - Innovation Campus (v3)</h1>
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-sm">📄 {fileName}</span>
          <label className="px-3 py-1 bg-gray-200 text-gray-700 rounded cursor-pointer text-sm">Change<input type="file" accept=".xlsx,.xls" onChange={handleFileInput} className="hidden" /></label>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-5">
        <div className="bg-white p-4 rounded-lg shadow"><div className="text-gray-500 text-xs">Total Debt (Feb 2026)</div><div className="text-red-500 text-xl font-bold">{formatCurrency(metrics.totalDebt)}</div><div className="text-gray-400 text-xs">of {formatCurrency(metrics.totalOriginal)} original</div></div>
        <div className="bg-white p-4 rounded-lg shadow"><div className="text-gray-500 text-xs">Paid Off</div><div className="text-green-500 text-xl font-bold">{metrics.paidOffPercent.toFixed(1)}%</div><div className="bg-gray-200 rounded h-2 mt-2"><div className="bg-green-500 h-full rounded" style={{ width: `${metrics.paidOffPercent}%` }} /></div></div>
        <div className="bg-white p-4 rounded-lg shadow"><div className="text-gray-500 text-xs">Interest Remaining</div><div className="text-amber-500 text-xl font-bold">{formatCurrency(metrics.totalInterest)}</div></div>
        <div className="bg-white p-4 rounded-lg shadow"><div className="text-gray-500 text-xs">Active Loans</div><div className="text-blue-500 text-xl font-bold">{metrics.activeLoans}</div></div>
        <div className="bg-white p-4 rounded-lg shadow"><div className="text-gray-500 text-xs">Debt Free</div><div className="text-green-500 text-xl font-bold">{formatDate(metrics.finalPayoff)}</div></div>
      </div>

      <div className="mb-4">
        <button onClick={() => setActiveView('overview')} style={btn(activeView === 'overview')}>Overview</button>
        <button onClick={() => setActiveView('timeline')} style={btn(activeView === 'timeline')}>Timeline</button>
        <button onClick={() => setActiveView('schedule')} style={btn(activeView === 'schedule')}>Payments</button>
        <button onClick={() => setActiveView('details')} style={btn(activeView === 'details')}>Details</button>
      </div>

      {activeView === 'overview' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-bold text-gray-800 mb-3">Debt Paydown (Feb 2026 → Mar 2030)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={timelineData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 9 }} /><YAxis tickFormatter={v => '€' + (v/1000).toFixed(0) + 'k'} /><Tooltip formatter={v => formatCurrency(v)} /><Area type="monotone" dataKey="total" fill="#ef4444" fillOpacity={0.3} stroke="#ef4444" /></AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-bold text-gray-800 mb-3">Loan Breakdown (as of Feb 2026)</h3>
            <div className="space-y-3">
              {loanData.sort((a, b) => b.currentBalance - a.currentBalance).map(loan => (
                <div key={loan.name}>
                  <div className="flex justify-between text-sm"><span className="text-gray-700">{loan.name}</span><span className="font-bold">{formatCurrency(loan.currentBalance)}</span></div>
                  <div className="bg-gray-200 rounded h-2 mt-1"><div style={{ backgroundColor: loan.color, width: `${(loan.currentBalance / metrics.totalDebt) * 100}%` }} className="h-full rounded" /></div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1"><span>{formatCurrency(loan.monthlyPayment)}/mo</span><span>Ends: {formatDate(loan.endDate)}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeView === 'timeline' && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-bold text-gray-800 mb-3">Balance by Loan (Feb 2026 onwards)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={timelineData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 9 }} /><YAxis tickFormatter={v => '€' + (v/1000).toFixed(0) + 'k'} /><Tooltip formatter={v => formatCurrency(v)} /><Legend />
              {loanData.map(l => <Area key={l.name} type="monotone" dataKey={l.name.replace(/\s+/g, '_')} stackId="1" fill={l.color} fillOpacity={0.6} stroke={l.color} name={l.name} />)}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeView === 'schedule' && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-bold text-gray-800 mb-3">Monthly Payments (Feb 2026 onwards)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={paymentSchedule}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 9 }} /><YAxis tickFormatter={v => '€' + (v/1000).toFixed(0) + 'k'} /><Tooltip formatter={v => formatCurrency(v)} /><Legend />
              {loanData.map(l => <Bar key={l.name} dataKey={l.name.replace(/\s+/g, '_')} stackId="a" fill={l.color} name={l.name} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeView === 'details' && (
        <div className="bg-white p-4 rounded-lg shadow overflow-x-auto">
          <h3 className="font-bold text-gray-800 mb-3">Loan Details (as of Feb 2026)</h3>
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-100 border-b-2"><th className="p-2 text-left">Loan</th><th className="p-2 text-right">Original</th><th className="p-2 text-right">Balance Now</th><th className="p-2 text-right">Paid Off</th><th className="p-2 text-right">Monthly</th><th className="p-2 text-center">Ends</th></tr></thead>
            <tbody>
              {loanData.sort((a, b) => b.currentBalance - a.currentBalance).map((l, i) => {
                const paidOff = l.originalAmount > 0 ? ((l.originalAmount - l.currentBalance) / l.originalAmount) * 100 : 0;
                return (
                  <tr key={l.name} className={`border-b ${i % 2 ? 'bg-gray-50' : ''}`}>
                    <td className="p-2 flex items-center gap-2"><div className="w-3 h-3 rounded" style={{ backgroundColor: l.color }} />{l.name}</td>
                    <td className="p-2 text-right text-gray-500">{formatCurrency(l.originalAmount)}</td>
                    <td className="p-2 text-right font-bold text-red-500">{formatCurrency(l.currentBalance)}</td>
                    <td className="p-2 text-right text-green-500 font-bold">{paidOff.toFixed(0)}%</td>
                    <td className="p-2 text-right">{formatCurrency(l.monthlyPayment)}</td>
                    <td className="p-2 text-center">{formatDate(l.endDate)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr className="bg-gray-100 font-bold"><td className="p-2">TOTAL</td><td className="p-2 text-right">{formatCurrency(metrics.totalOriginal)}</td><td className="p-2 text-right text-red-500">{formatCurrency(metrics.totalDebt)}</td><td className="p-2 text-right text-green-500">{metrics.paidOffPercent.toFixed(0)}%</td><td className="p-2 text-right">{formatCurrency(metrics.monthlyPayment)}</td><td className="p-2 text-center">{formatDate(metrics.finalPayoff)}</td></tr></tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default DebtDashboard;
