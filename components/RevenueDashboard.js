"use client";

import React, { useState, useCallback } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import * as XLSX from 'xlsx';

const RevenueDashboard = () => {
  // File upload state
  const [monthlyData, setMonthlyData] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Widget 1 states
  const [viewMode, setViewMode] = useState('monthly');
  const [hiddenSeries, setHiddenSeries] = useState({});

  // Widget 2 states
  const [locationFilter, setLocationFilter] = useState('both');
  const [categoryViewMode, setCategoryViewMode] = useState('monthly');

  // Widget 3 states
  const [pieFilterType, setPieFilterType] = useState('year');
  const [pieFilterValue, setPieFilterValue] = useState('2025');

  // Month name mapping (Spanish to English) - with variations
  const monthMap = {
    'Enero': 'Jan', 'Febrero': 'Feb', 'Marzo': 'Mar', 'Abril': 'Apr',
    'Mayo': 'May', 'Junio': 'Jun', 'Julio': 'Jul', 'Agosto': 'Aug',
    'Septiembre': 'Sep', 'Octubre': 'Oct', 'Noviembre': 'Nov', 'Diciembre': 'Dec',
    // With potential trailing spaces
    'Enero ': 'Jan', 'Febrero ': 'Feb', 'Marzo ': 'Mar', 'Abril ': 'Apr',
    'Mayo ': 'May', 'Junio ': 'Jun', 'Julio ': 'Jul', 'Agosto ': 'Aug',
    'Septiembre ': 'Sep', 'Octubre ': 'Oct', 'Noviembre ': 'Nov', 'Diciembre ': 'Dec'
  };

  // Category mapping
  const categoryMap = {
    'Private Offices': 'po',
    'Coworking': 'cw',
    'Meeting Rooms': 'mr',
    'Catering': 'ct',
    'Services': 'sv',
    'Commision due': 'ot',
    'One-off Fees': 'ot',
    'Formacion': 'fm',
    'Formación': 'fm'
  };

  // Parse Excel file
  const parseExcelFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const allMonths = [];
        let currentMonth = null;
        let currentLocation = null;

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          // Browser skips empty column A, so indices are shifted:
          // row[0] = Month/Label (was column B)
          // row[1] = Year (was column C)
          // row[2] = Amount (was column D)
          const col0 = row[0] ? String(row[0]).trim() : '';
          const col1 = row[1] !== undefined && row[1] !== null ? Number(row[1]) : null;
          const col2 = row[2] || 0;

          // Check if this is a month row (year can be 2024, 2025, or future years)
          const isValidYear = col1 && col1 >= 2020 && col1 <= 2030;
          if (monthMap[col0] && isValidYear) {
            if (currentMonth) {
              allMonths.push(currentMonth);
            }
            currentMonth = {
              month: monthMap[col0],
              year: Math.floor(col1),
              total: parseFloat(col2) || 0,
              palace: 0,
              terrace: 0,
              pc: { po: 0, cw: 0, mr: 0, ct: 0, sv: 0, ot: 0, fm: 0 },
              tc: { po: 0, cw: 0, mr: 0, ct: 0, sv: 0, ot: 0, fm: 0 }
            };
            currentLocation = null;
          }
          // Check if this is a location row
          else if (col0 === 'Malaga Palace' && currentMonth) {
            currentLocation = 'palace';
            currentMonth.palace = parseFloat(col2) || 0;
          }
          else if (col0 === 'Malaga Terrace' && currentMonth) {
            currentLocation = 'terrace';
            currentMonth.terrace = parseFloat(col2) || 0;
          }
          // Check if this is a category row
          else if (categoryMap[col0] && currentMonth && currentLocation) {
            const cat = categoryMap[col0];
            const value = parseFloat(col2) || 0;
            if (currentLocation === 'palace') {
              currentMonth.pc[cat] += value;
            } else {
              currentMonth.tc[cat] += value;
            }
          }
        }

        // Don't forget the last month
        if (currentMonth) {
          allMonths.push(currentMonth);
        }

        if (allMonths.length === 0) {
          // Debug: show what we actually read
          const debugInfo = jsonData.slice(0, 10).map((row, i) => 
            `Row ${i}: col0="${row[0]}", col1=${row[1]} (type: ${typeof row[1]}), col2=${row[2]}`
          ).join('\n');
          setParseError(`No valid data found. Debug info:\n${debugInfo}`);
          return;
        }

        setMonthlyData(allMonths);
        setFileName(file.name);
        setParseError(null);
        
        // Set default pie filter to most recent year
        const years = [...new Set(allMonths.map(d => d.year))];
        setPieFilterValue(Math.max(...years).toString());

      } catch (err) {
        setParseError('Error parsing file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      parseExcelFile(file);
    } else {
      setParseError('Please upload an Excel file (.xlsx or .xls)');
    }
  }, [parseExcelFile]);

  const handleFileInput = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      parseExcelFile(file);
    }
  }, [parseExcelFile]);

  const formatCurrency = (value) => {
    return '€' + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  // ========== WIDGET 1: Revenue Evolution by Location ==========
  const getDisplayData = () => {
    if (!monthlyData) return [];
    
    if (viewMode === 'yearly') {
      const yearlyData = {};
      monthlyData.forEach(d => {
        if (!yearlyData[d.year]) {
          yearlyData[d.year] = { label: d.year.toString(), total: 0, palace: 0, terrace: 0 };
        }
        yearlyData[d.year].total += d.total;
        yearlyData[d.year].palace += d.palace;
        yearlyData[d.year].terrace += d.terrace;
      });
      return Object.values(yearlyData);
    } else if (viewMode === 'quarterly') {
      const getQuarter = (month) => {
        const q = { 'Jan': 'Q1', 'Feb': 'Q1', 'Mar': 'Q1', 'Apr': 'Q2', 'May': 'Q2', 'Jun': 'Q2', 'Jul': 'Q3', 'Aug': 'Q3', 'Sep': 'Q3', 'Oct': 'Q4', 'Nov': 'Q4', 'Dec': 'Q4' };
        return q[month];
      };
      const quarterlyData = {};
      monthlyData.forEach(d => {
        const key = getQuarter(d.month) + ' ' + d.year;
        if (!quarterlyData[key]) {
          quarterlyData[key] = { label: key, total: 0, palace: 0, terrace: 0 };
        }
        quarterlyData[key].total += d.total;
        quarterlyData[key].palace += d.palace;
        quarterlyData[key].terrace += d.terrace;
      });
      return Object.values(quarterlyData);
    }
    return monthlyData.map(d => ({
      label: d.month + ' ' + d.year,
      total: d.total,
      palace: d.palace,
      terrace: d.terrace
    }));
  };

  const displayData = getDisplayData();

  // Custom label for values inside bars
  const renderPalaceLabel = (props) => {
    const { x, y, width, height, value } = props;
    if (height < 25 || !value) return null;
    return (
      <text x={x + width / 2} y={y + height / 2} fill="white" textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: viewMode === 'monthly' ? '9px' : '12px', fontWeight: 'bold' }}>
        {formatCurrency(value)}
      </text>
    );
  };

  const renderTerraceLabel = (props) => {
    const { x, y, width, height, value } = props;
    if (height < 25 || !value) return null;
    return (
      <text x={x + width / 2} y={y + height / 2} fill="white" textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: viewMode === 'monthly' ? '9px' : '12px', fontWeight: 'bold' }}>
        {formatCurrency(value)}
      </text>
    );
  };

  const CustomTooltip1 = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum, entry) => sum + entry.value, 0);
      return (
        <div style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>{label}</p>
          {payload.map((entry, index) => {
            const percent = ((entry.value / total) * 100).toFixed(1);
            return (
              <p key={index} style={{ color: entry.color, margin: '3px 0' }}>
                {entry.name}: {formatCurrency(entry.value)} ({percent}%)
              </p>
            );
          })}
          <p style={{ fontWeight: 'bold', marginTop: '5px', borderTop: '1px solid #e5e7eb', paddingTop: '5px' }}>
            Total: {formatCurrency(total)}
          </p>
        </div>
      );
    }
    return null;
  };

  const handleLegendClick = (dataKey) => {
    setHiddenSeries(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
  };

  // ========== WIDGET 2: Revenue Composition by Category ==========
  const getCategoryData = () => {
    if (!monthlyData) return [];
    
    const categories = ['po', 'cw', 'mr', 'ct', 'sv', 'ot', 'fm'];
    
    if (categoryViewMode === 'yearly') {
      const yearlyAgg = {};
      monthlyData.forEach(d => {
        if (!yearlyAgg[d.year]) {
          yearlyAgg[d.year] = { label: d.year.toString(), pc: {}, tc: {} };
          categories.forEach(c => { yearlyAgg[d.year].pc[c] = 0; yearlyAgg[d.year].tc[c] = 0; });
        }
        categories.forEach(c => {
          yearlyAgg[d.year].pc[c] += d.pc[c] || 0;
          yearlyAgg[d.year].tc[c] += d.tc[c] || 0;
        });
      });
      return Object.values(yearlyAgg).map(d => {
        const result = { label: d.label };
        categories.forEach(c => {
          if (locationFilter === 'palace') result[c] = d.pc[c];
          else if (locationFilter === 'terrace') result[c] = d.tc[c];
          else result[c] = d.pc[c] + d.tc[c];
        });
        return result;
      });
    } else if (categoryViewMode === 'quarterly') {
      const getQuarter = (month) => {
        const q = { 'Jan': 'Q1', 'Feb': 'Q1', 'Mar': 'Q1', 'Apr': 'Q2', 'May': 'Q2', 'Jun': 'Q2', 'Jul': 'Q3', 'Aug': 'Q3', 'Sep': 'Q3', 'Oct': 'Q4', 'Nov': 'Q4', 'Dec': 'Q4' };
        return q[month];
      };
      const quarterlyAgg = {};
      monthlyData.forEach(d => {
        const key = getQuarter(d.month) + ' ' + d.year;
        if (!quarterlyAgg[key]) {
          quarterlyAgg[key] = { label: key, pc: {}, tc: {} };
          categories.forEach(c => { quarterlyAgg[key].pc[c] = 0; quarterlyAgg[key].tc[c] = 0; });
        }
        categories.forEach(c => {
          quarterlyAgg[key].pc[c] += d.pc[c] || 0;
          quarterlyAgg[key].tc[c] += d.tc[c] || 0;
        });
      });
      return Object.values(quarterlyAgg).map(d => {
        const result = { label: d.label };
        categories.forEach(c => {
          if (locationFilter === 'palace') result[c] = d.pc[c];
          else if (locationFilter === 'terrace') result[c] = d.tc[c];
          else result[c] = d.pc[c] + d.tc[c];
        });
        return result;
      });
    }
    
    return monthlyData.map(d => {
      const result = { label: d.month + ' ' + d.year };
      categories.forEach(c => {
        if (locationFilter === 'palace') result[c] = d.pc[c] || 0;
        else if (locationFilter === 'terrace') result[c] = d.tc[c] || 0;
        else result[c] = (d.pc[c] || 0) + (d.tc[c] || 0);
      });
      return result;
    });
  };

  const categoryData = getCategoryData();
  const categoryColors = { po: '#6366f1', cw: '#22c55e', mr: '#f59e0b', ct: '#ef4444', sv: '#8b5cf6', ot: '#64748b', fm: '#06b6d4' };
  const categoryNames = { po: 'Private Offices', cw: 'Coworking', mr: 'Meeting Rooms', ct: 'Catering', sv: 'Services', ot: 'Other', fm: 'Training' };

  // ========== WIDGET 3: Pie Charts ==========
  const getPieFilterOptions = () => {
    if (!monthlyData) return [];
    
    const years = [...new Set(monthlyData.map(d => d.year))].sort();
    
    if (pieFilterType === 'year') return years.map(y => y.toString());
    if (pieFilterType === 'quarter') {
      const quarters = [];
      const getQuarter = (month) => {
        const q = { 'Jan': 'Q1', 'Feb': 'Q1', 'Mar': 'Q1', 'Apr': 'Q2', 'May': 'Q2', 'Jun': 'Q2', 'Jul': 'Q3', 'Aug': 'Q3', 'Sep': 'Q3', 'Oct': 'Q4', 'Nov': 'Q4', 'Dec': 'Q4' };
        return q[month];
      };
      monthlyData.forEach(d => {
        const q = getQuarter(d.month) + ' ' + d.year;
        if (!quarters.includes(q)) quarters.push(q);
      });
      return quarters;
    }
    return monthlyData.map(d => d.month + ' ' + d.year);
  };

  const getPieData = () => {
    if (!monthlyData) return { palaceData: [], terraceData: [] };
    
    const categories = ['po', 'cw', 'mr', 'ct', 'sv', 'ot', 'fm'];
    let filteredData = [];
    
    if (pieFilterType === 'year') {
      filteredData = monthlyData.filter(d => d.year.toString() === pieFilterValue);
    } else if (pieFilterType === 'quarter') {
      const getQuarter = (month) => {
        const q = { 'Jan': 'Q1', 'Feb': 'Q1', 'Mar': 'Q1', 'Apr': 'Q2', 'May': 'Q2', 'Jun': 'Q2', 'Jul': 'Q3', 'Aug': 'Q3', 'Sep': 'Q3', 'Oct': 'Q4', 'Nov': 'Q4', 'Dec': 'Q4' };
        return q[month];
      };
      filteredData = monthlyData.filter(d => (getQuarter(d.month) + ' ' + d.year) === pieFilterValue);
    } else {
      filteredData = monthlyData.filter(d => (d.month + ' ' + d.year) === pieFilterValue);
    }

    const palaceData = categories.map(c => ({
      name: categoryNames[c],
      value: filteredData.reduce((sum, d) => sum + (d.pc[c] || 0), 0),
      color: categoryColors[c]
    })).filter(d => d.value > 0);

    const terraceData = categories.map(c => ({
      name: categoryNames[c],
      value: filteredData.reduce((sum, d) => sum + (d.tc[c] || 0), 0),
      color: categoryColors[c]
    })).filter(d => d.value > 0);

    return { palaceData, terraceData };
  };

  const pieOptions = getPieFilterOptions();
  const { palaceData, terraceData } = getPieData();
  const palaceTotal = palaceData.reduce((sum, d) => sum + d.value, 0);
  const terraceTotal = terraceData.reduce((sum, d) => sum + d.value, 0);
  const grandTotal = palaceTotal + terraceTotal;

  const buttonStyle = (active) => ({
    padding: '8px 16px',
    marginRight: '10px',
    backgroundColor: active ? '#3b82f6' : '#e5e7eb',
    color: active ? 'white' : '#333',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: active ? 'bold' : 'normal'
  });

  // ========== UPLOAD SCREEN ==========
  if (!monthlyData) {
    return (
      <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ textAlign: 'center', color: '#333', marginBottom: '30px' }}>
          Revenue Dashboard - Innovation Campus
        </h1>
        
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            width: '100%',
            maxWidth: '500px',
            padding: '60px 40px',
            backgroundColor: isDragging ? '#dbeafe' : 'white',
            border: `3px dashed ${isDragging ? '#3b82f6' : '#d1d5db'}`,
            borderRadius: '12px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📊</div>
          <h2 style={{ color: '#374151', marginBottom: '10px' }}>Upload Excel File</h2>
          <p style={{ color: '#6b7280', marginBottom: '20px' }}>
            Drag & drop your <strong>Facturación mensual</strong> file here
          </p>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '20px' }}>or</p>
          <label style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}>
            Browse Files
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
          </label>
          <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '20px' }}>
            Supports .xlsx and .xls files
          </p>
        </div>

        {parseError && (
          <div style={{ marginTop: '20px', padding: '15px 20px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', maxWidth: '600px', textAlign: 'left' }}>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '12px', margin: 0 }}>{parseError}</pre>
          </div>
        )}
      </div>
    );
  }

  // ========== MAIN DASHBOARD ==========
  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#333', margin: 0 }}>
          Revenue Dashboard - Innovation Campus
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ color: '#6b7280', fontSize: '14px' }}>
            📄 {fileName} ({monthlyData.length} months)
          </span>
          <label style={{
            padding: '8px 16px',
            backgroundColor: '#e5e7eb',
            color: '#374151',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}>
            Change File
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {/* WIDGET 1: Revenue Evolution */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#333', margin: 0 }}>Revenue Evolution by Location</h2>
          <div>
            <button onClick={() => setViewMode('monthly')} style={buttonStyle(viewMode === 'monthly')}>Monthly</button>
            <button onClick={() => setViewMode('quarterly')} style={buttonStyle(viewMode === 'quarterly')}>Quarterly</button>
            <button onClick={() => setViewMode('yearly')} style={buttonStyle(viewMode === 'yearly')}>Yearly</button>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={displayData} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={viewMode === 'monthly' ? -45 : 0} textAnchor={viewMode === 'monthly' ? 'end' : 'middle'} height={viewMode === 'monthly' ? 80 : 30} />
            <YAxis tickFormatter={(value) => '€' + (value/1000).toFixed(0) + 'k'} />
            <Tooltip content={<CustomTooltip1 />} />
            <Legend onClick={(e) => handleLegendClick(e.dataKey)} wrapperStyle={{ cursor: 'pointer' }} />
            {!hiddenSeries.palace && (
              <Bar dataKey="palace" stackId="a" fill="#8b5cf6" name="Malaga Palace">
                <LabelList dataKey="palace" content={renderPalaceLabel} />
              </Bar>
            )}
            {!hiddenSeries.terrace && (
              <Bar dataKey="terrace" stackId="a" fill="#10b981" name="Malaga Terrace">
                <LabelList dataKey="terrace" content={renderTerraceLabel} />
                <LabelList dataKey="total" position="top" formatter={(value) => formatCurrency(value)} 
                  style={{ fontSize: viewMode === 'monthly' ? '8px' : '11px', fontWeight: 'bold', fill: '#374151' }} />
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>

        {/* Data Table */}
        <div style={{ marginTop: '20px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #d1d5db' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Period</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Total</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Malaga Palace</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>%</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Malaga Terrace</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {displayData.map((row, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                  <td style={{ padding: '12px' }}>{row.label}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(row.palace + row.terrace)}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{formatCurrency(row.palace)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#8b5cf6', fontWeight: 'bold' }}>{((row.palace / (row.palace + row.terrace)) * 100).toFixed(1)}%</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{formatCurrency(row.terrace)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#10b981', fontWeight: 'bold' }}>{((row.terrace / (row.palace + row.terrace)) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* WIDGET 2: Revenue Composition by Category */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#333', margin: 0 }}>Revenue Composition by Category</h2>
          <div>
            <button onClick={() => setCategoryViewMode('monthly')} style={buttonStyle(categoryViewMode === 'monthly')}>Monthly</button>
            <button onClick={() => setCategoryViewMode('quarterly')} style={buttonStyle(categoryViewMode === 'quarterly')}>Quarterly</button>
            <button onClick={() => setCategoryViewMode('yearly')} style={buttonStyle(categoryViewMode === 'yearly')}>Yearly</button>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={categoryData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={categoryViewMode === 'monthly' ? -45 : 0} textAnchor={categoryViewMode === 'monthly' ? 'end' : 'middle'} height={categoryViewMode === 'monthly' ? 80 : 30} />
            <YAxis tickFormatter={(value) => '€' + (value/1000).toFixed(0) + 'k'} />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="po" stackId="a" fill={categoryColors.po} name="Private Offices" />
            <Bar dataKey="cw" stackId="a" fill={categoryColors.cw} name="Coworking" />
            <Bar dataKey="mr" stackId="a" fill={categoryColors.mr} name="Meeting Rooms" />
            <Bar dataKey="ct" stackId="a" fill={categoryColors.ct} name="Catering" />
            <Bar dataKey="sv" stackId="a" fill={categoryColors.sv} name="Services" />
            <Bar dataKey="ot" stackId="a" fill={categoryColors.ot} name="Other" />
            <Bar dataKey="fm" stackId="a" fill={categoryColors.fm} name="Training" />
          </BarChart>
        </ResponsiveContainer>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '15px' }}>
          <button onClick={() => setLocationFilter('both')} style={buttonStyle(locationFilter === 'both')}>Both Locations</button>
          <button onClick={() => setLocationFilter('palace')} style={buttonStyle(locationFilter === 'palace')}>Malaga Palace</button>
          <button onClick={() => setLocationFilter('terrace')} style={buttonStyle(locationFilter === 'terrace')}>Malaga Terrace</button>
        </div>
      </div>

      {/* WIDGET 3: Pie Charts */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#333', margin: 0 }}>Revenue Breakdown by Location</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={() => { setPieFilterType('year'); setPieFilterValue(pieOptions[pieOptions.length - 1] || '2025'); }} style={buttonStyle(pieFilterType === 'year')}>Year</button>
            <button onClick={() => { setPieFilterType('quarter'); const opts = getPieFilterOptions(); setPieFilterValue(opts[opts.length - 1] || 'Q4 2025'); }} style={buttonStyle(pieFilterType === 'quarter')}>Quarter</button>
            <button onClick={() => { setPieFilterType('month'); const opts = getPieFilterOptions(); setPieFilterValue(opts[opts.length - 1] || 'Nov 2025'); }} style={buttonStyle(pieFilterType === 'month')}>Month</button>
            <select value={pieFilterValue} onChange={(e) => setPieFilterValue(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '14px' }}>
              {pieOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Palace Pie */}
          <div style={{ textAlign: 'center', flex: '1', minWidth: '300px' }}>
            <h3 style={{ color: '#8b5cf6', marginBottom: '10px' }}>Malaga Palace</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{formatCurrency(palaceTotal)}</p>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={palaceData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                  {palaceData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Summary Card */}
          <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', minWidth: '200px', margin: '0 20px' }}>
            <h3 style={{ color: '#374151', marginBottom: '15px' }}>Total Revenue</h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>{formatCurrency(grandTotal)}</p>
            <div style={{ marginTop: '20px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ color: '#8b5cf6' }}>Palace</span>
                <span style={{ fontWeight: 'bold' }}>{grandTotal > 0 ? ((palaceTotal / grandTotal) * 100).toFixed(1) : 0}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ color: '#10b981' }}>Terrace</span>
                <span style={{ fontWeight: 'bold' }}>{grandTotal > 0 ? ((terraceTotal / grandTotal) * 100).toFixed(1) : 0}%</span>
              </div>
            </div>
          </div>

          {/* Terrace Pie */}
          <div style={{ textAlign: 'center', flex: '1', minWidth: '300px' }}>
            <h3 style={{ color: '#10b981', marginBottom: '10px' }}>Malaga Terrace</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{formatCurrency(terraceTotal)}</p>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={terraceData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                  {terraceData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueDashboard;
