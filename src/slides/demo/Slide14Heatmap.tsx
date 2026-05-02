import React, { useState } from 'react';
import { MSSlideLayout } from '@/components/slides/MSSlideLayout';

// Sample data for AI adoption across business units and quarters
const departments = ['Wealth Mgmt', 'Investment Bank', 'Research', 'Technology', 'Operations', 'Legal & Compliance'];
const quarters = ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025'];

const heatmapData: number[][] = [
  [45, 52, 68, 78, 85],  // Wealth Mgmt
  [38, 45, 55, 62, 72],  // Investment Bank
  [62, 70, 78, 85, 92],  // Research
  [72, 80, 88, 94, 98],  // Technology
  [25, 35, 48, 58, 68],  // Operations
  [18, 28, 38, 52, 65],  // Legal & Compliance
];

// Color interpolation based on value (0-100)
function getColor(value: number): string {
  if (value >= 80) return 'bg-ms-blue';
  if (value >= 60) return 'bg-ms-blue/80';
  if (value >= 40) return 'bg-ms-blue/50';
  if (value >= 20) return 'bg-ms-blue/30';
  return 'bg-ms-blue-20';
}

function getTextColor(value: number): string {
  if (value >= 60) return 'text-white';
  return 'text-ms-navy';
}

export default function Slide14Heatmap() {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);

  const handleCellClick = (row: number, col: number) => {
    if (selectedCell?.row === row && selectedCell?.col === col) {
      setSelectedCell(null);
    } else {
      setSelectedCell({ row, col });
    }
  };

  return (
    <MSSlideLayout variant="default">
      <div className="flex flex-col h-full px-20 py-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-semibold text-ms-navy mb-3">
            AI Adoption Heatmap
          </h1>
          <p className="text-lg text-ms-navy-80 font-light">
            Adoption rates across business units over time — Click cells to explore
          </p>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-8">
          {/* Heatmap Grid */}
          <div className="flex-1">
            <div className="flex flex-col h-full">
              {/* Column Headers */}
              <div className="flex">
                <div className="w-36 flex-shrink-0" />
                {quarters.map((quarter, colIdx) => (
                  <div 
                    key={colIdx} 
                    className={`flex-1 text-center text-sm font-medium text-ms-navy py-3 transition-all duration-200 ${
                      hoveredCell?.col === colIdx || selectedCell?.col === colIdx 
                        ? 'bg-ms-blue-20/50 rounded-t-lg' 
                        : ''
                    }`}
                  >
                    {quarter}
                  </div>
                ))}
              </div>

              {/* Heatmap Rows */}
              <div className="flex-1 flex flex-col gap-1">
                {departments.map((dept, rowIdx) => (
                  <div key={rowIdx} className="flex flex-1 items-stretch">
                    {/* Row Label */}
                    <div 
                      className={`w-36 flex-shrink-0 flex items-center text-sm font-medium text-ms-navy pr-4 transition-all duration-200 ${
                        hoveredCell?.row === rowIdx || selectedCell?.row === rowIdx
                          ? 'text-ms-blue font-semibold'
                          : ''
                      }`}
                    >
                      {dept}
                    </div>

                    {/* Cells */}
                    {heatmapData[rowIdx].map((value, colIdx) => {
                      const isHovered = hoveredCell?.row === rowIdx && hoveredCell?.col === colIdx;
                      const isSelected = selectedCell?.row === rowIdx && selectedCell?.col === colIdx;
                      const isRowOrColHighlighted = 
                        (hoveredCell?.row === rowIdx || hoveredCell?.col === colIdx) ||
                        (selectedCell?.row === rowIdx || selectedCell?.col === colIdx);

                      return (
                        <div
                          key={colIdx}
                          className={`
                            flex-1 flex items-center justify-center mx-0.5 rounded-md cursor-pointer
                            transition-all duration-200 ease-out
                            ${getColor(value)}
                            ${isHovered || isSelected ? 'scale-105 shadow-lg ring-2 ring-ms-navy/30 z-10' : ''}
                            ${isRowOrColHighlighted && !isHovered && !isSelected ? 'opacity-90' : ''}
                          `}
                          onMouseEnter={() => setHoveredCell({ row: rowIdx, col: colIdx })}
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={() => handleCellClick(rowIdx, colIdx)}
                        >
                          <span className={`text-base font-semibold ${getTextColor(value)} transition-all duration-200`}>
                            {value}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Info Panel */}
          <div className="w-56 flex flex-col gap-4">
            {/* Legend */}
            <div className="p-5 bg-white rounded-lg shadow-sm border border-ms-blue-40">
              <h3 className="text-sm font-semibold text-ms-navy mb-3">Adoption Rate</h3>
              <div className="space-y-2">
                {[
                  { label: 'High (80%+)', color: 'bg-ms-blue' },
                  { label: 'Good (60-79%)', color: 'bg-ms-blue/80' },
                  { label: 'Medium (40-59%)', color: 'bg-ms-blue/50' },
                  { label: 'Low (20-39%)', color: 'bg-ms-blue/30' },
                  { label: 'Minimal (<20%)', color: 'bg-ms-blue-20' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded ${item.color}`} />
                    <span className="text-xs text-ms-navy-80">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Cell Info */}
            {selectedCell && (
              <div className="p-5 bg-ms-blue rounded-lg text-white animate-fade-in">
                <h3 className="text-sm font-semibold mb-2">Selected</h3>
                <p className="text-lg font-bold mb-1">
                  {heatmapData[selectedCell.row][selectedCell.col]}%
                </p>
                <p className="text-xs opacity-90">
                  {departments[selectedCell.row]}
                </p>
                <p className="text-xs opacity-90">
                  {quarters[selectedCell.col]}
                </p>
              </div>
            )}

            {/* Summary Stats */}
            <div className="p-5 bg-white rounded-lg shadow-sm border border-ms-blue-40">
              <h3 className="text-sm font-semibold text-ms-navy mb-3">Key Insights</h3>
              <div className="space-y-2 text-xs text-ms-navy-80">
                <p>• Technology leads at <strong className="text-ms-navy">98%</strong></p>
                <p>• Research close behind at <strong className="text-ms-navy">92%</strong></p>
                <p>• Legal growing fastest: <strong className="text-ms-navy">+47pts</strong></p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-ms-blue-40">
          <p className="text-sm text-ms-navy-80 font-light tracking-wide">
            Confidential — Internal Use Only
          </p>
        </div>
      </div>
    </MSSlideLayout>
  );
}
