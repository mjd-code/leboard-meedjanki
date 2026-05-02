import React, { useState, useMemo } from 'react';
import { SlideLayout } from '@/components/slides/SlideLayout';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, ReferenceDot, ResponsiveContainer, ComposedChart } from 'recharts';
import { TrendingUp, DollarSign, Package, Percent } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

// Exponential demand: P = A * e^(-k*Q) + shift
// Exponential supply: P = B * (1 - e^(-m*Q)) + base + shift
const generateCurveData = (demandShift: number, supplyShift: number) => {
  const points = [];
  const demandA = 120; // max willingness to pay
  const demandK = 0.025; // decay rate
  const supplyBase = 15; // min production cost
  const supplyB = 100; // max additional cost
  const supplyM = 0.03; // growth rate

  for (let q = 0; q <= 100; q += 1) {
    // Demand: exponential decay (high at low Q, approaches 0 at high Q)
    const demandPrice = Math.max(0, demandA * Math.exp(-demandK * q) + demandShift);
    // Supply: exponential growth approaching asymptote
    const supplyPrice = Math.max(0, supplyBase + supplyB * (1 - Math.exp(-supplyM * q)) + supplyShift);
    points.push({
      quantity: q,
      demand: demandPrice,
      supply: supplyPrice
    });
  }
  return points;
};

// Find equilibrium numerically (Newton-Raphson approximation)
const calculateEquilibrium = (demandShift: number, supplyShift: number) => {
  const demandA = 120;
  const demandK = 0.025;
  const supplyBase = 15;
  const supplyB = 100;
  const supplyM = 0.03;

  // Find Q where demand = supply
  // demandA * e^(-k*Q) + demandShift = supplyBase + supplyB * (1 - e^(-m*Q)) + supplyShift
  let q = 50; // initial guess
  for (let i = 0; i < 20; i++) {
    const demand = demandA * Math.exp(-demandK * q) + demandShift;
    const supply = supplyBase + supplyB * (1 - Math.exp(-supplyM * q)) + supplyShift;
    const diff = demand - supply;
    if (Math.abs(diff) < 0.01) break;

    // Derivatives
    const dDemand = -demandA * demandK * Math.exp(-demandK * q);
    const dSupply = supplyB * supplyM * Math.exp(-supplyM * q);
    const dDiff = dDemand - dSupply;
    q = q - diff / dDiff;
    q = Math.max(0, Math.min(100, q));
  }
  const equilibriumP = supplyBase + supplyB * (1 - Math.exp(-supplyM * q)) + supplyShift;
  return {
    quantity: Math.max(0, Math.min(100, q)),
    price: Math.max(0, equilibriumP)
  };
};

// Calculate economic metrics with exponential curves
const calculateMetrics = (eq: {
  quantity: number;
  price: number;
}, demandShift: number, supplyShift: number) => {
  const {
    quantity,
    price
  } = eq;
  const demandA = 120;
  const demandK = 0.025;
  const supplyBase = 15;
  const supplyB = 100;
  const supplyM = 0.03;

  // Unit cost at Q=0
  const unitCost = supplyBase + supplyShift;

  // Total Revenue = P × Q
  const revenue = price * quantity;

  // Approximate total cost (numerical integration of supply curve)
  let totalCost = 0;
  const step = 0.5;
  for (let q = 0; q < quantity; q += step) {
    const supplyPrice = supplyBase + supplyB * (1 - Math.exp(-supplyM * q)) + supplyShift;
    totalCost += supplyPrice * step;
  }

  // Profit = Revenue - Cost
  const profit = revenue - totalCost;

  // Consumer Surplus (area between demand curve and price, from 0 to Q)
  let consumerSurplus = 0;
  for (let q = 0; q < quantity; q += step) {
    const demandPrice = demandA * Math.exp(-demandK * q) + demandShift;
    consumerSurplus += Math.max(0, demandPrice - price) * step;
  }

  // Producer Surplus (area between price and supply curve, from 0 to Q)
  let producerSurplus = 0;
  for (let q = 0; q < quantity; q += step) {
    const supplyPrice = supplyBase + supplyB * (1 - Math.exp(-supplyM * q)) + supplyShift;
    producerSurplus += Math.max(0, price - supplyPrice) * step;
  }

  // Profit margin
  const profitMargin = revenue > 0 ? profit / revenue * 100 : 0;
  return {
    quantity: Math.round(quantity * 10) / 10,
    price: Math.round(price * 100) / 100,
    revenue: Math.round(revenue),
    totalCost: Math.round(totalCost),
    profit: Math.round(profit),
    consumerSurplus: Math.round(consumerSurplus),
    producerSurplus: Math.round(producerSurplus),
    profitMargin: Math.round(profitMargin * 10) / 10,
    unitCost: Math.round(unitCost * 100) / 100
  };
};
export default function Slide02InteractiveChart() {
  const [demandShift, setDemandShift] = useState(0);
  const [supplyShift, setSupplyShift] = useState(0);
  const curveData = useMemo(() => generateCurveData(demandShift, supplyShift), [demandShift, supplyShift]);
  const equilibrium = useMemo(() => calculateEquilibrium(demandShift, supplyShift), [demandShift, supplyShift]);
  const metrics = useMemo(() => calculateMetrics(equilibrium, demandShift, supplyShift), [equilibrium, demandShift, supplyShift]);
  return <SlideLayout variant="default">
      <div className="flex flex-col h-full px-16 py-12">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1.5 h-8 bg-[#4E93FF] rounded-full" />
            <h1 className="text-4xl font-bold text-slate-900">
              ​Interactive simulations  
            </h1>
          </div>
          <p className="text-lg text-slate-500 ml-5">
            Adjust the curves to see real-time market equilibrium and economic outcomes
          </p>
        </div>

        {/* Main content - 2:1 ratio */}
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Left: Chart (66%) */}
          <div className="w-2/3 flex flex-col min-h-0">
            <div className="flex-1 bg-white rounded-xl border border-slate-200 p-4 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={curveData} margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20
              }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="quantity" label={{
                  value: 'Quantity (units)',
                  position: 'bottom',
                  offset: 0
                }} tick={{
                  fontSize: 12,
                  fill: '#64748B'
                }} stroke="#CBD5E1" />
                  <YAxis label={{
                  value: 'Price ($)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10
                }} tick={{
                  fontSize: 12,
                  fill: '#64748B'
                }} stroke="#CBD5E1" domain={[0, 140]} />
                  
                  {/* Supply curve */}
                  <Line type="monotone" dataKey="supply" stroke="#10B981" strokeWidth={3} dot={false} name="Supply" isAnimationActive={false} />
                  
                  {/* Demand curve */}
                  <Line type="monotone" dataKey="demand" stroke="#4E93FF" strokeWidth={3} dot={false} name="Demand" isAnimationActive={false} />
                  
                  {/* Equilibrium reference lines */}
                  <ReferenceLine x={equilibrium.quantity} stroke="#F59E0B" strokeDasharray="5 5" strokeWidth={2} />
                  <ReferenceLine y={equilibrium.price} stroke="#F59E0B" strokeDasharray="5 5" strokeWidth={2} />
                  
                  {/* Equilibrium point */}
                  <ReferenceDot x={equilibrium.quantity} y={equilibrium.price} r={8} fill="#F59E0B" stroke="#FFF" strokeWidth={3} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend */}
            <div className="mt-3 flex items-center justify-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-[#4E93FF] rounded" />
                <span className="text-sm text-slate-600">Demand</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-emerald-500 rounded" />
                <span className="text-sm text-slate-600">Supply</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-sm text-slate-600">Equilibrium</span>
              </div>
            </div>
          </div>

          {/* Right: Controls & Metrics Panel (33%) */}
          <div className="w-1/3 flex flex-col gap-4 overflow-y-auto">
            {/* Curve Controls */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-slate-700 mb-4 uppercase tracking-wide">
                Curve Controls
              </h3>
              
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#4E93FF]" />
                      Demand Shift
                    </label>
                    <span className="text-sm text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">
                      {demandShift > 0 ? '+' : ''}{demandShift}
                    </span>
                  </div>
                  <Slider value={[demandShift]} onValueChange={v => setDemandShift(v[0])} min={-40} max={40} step={1} className="w-full" />
                  <p className="text-sm text-slate-400">
                    ← Less demand | More demand →
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      Supply Shift
                    </label>
                    <span className="text-sm text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">
                      {supplyShift > 0 ? '+' : ''}{supplyShift}
                    </span>
                  </div>
                  <Slider value={[supplyShift]} onValueChange={v => setSupplyShift(v[0])} min={-40} max={40} step={1} className="w-full" />
                  <p className="text-sm text-slate-400">
                    ← Lower costs | Higher costs →
                  </p>
                </div>
              </div>
            </div>
            
            {/* Equilibrium */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-amber-800 mb-3 uppercase tracking-wide">
                Market Equilibrium
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-amber-600 mb-0.5">Price</p>
                  <p className="text-2xl font-bold text-amber-900">
                    ${metrics.price}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-amber-600 mb-0.5">Quantity</p>
                  <p className="text-2xl font-bold text-amber-900">
                    {metrics.quantity}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Metrics */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex-1">
              <h3 className="text-xs font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                Financial Outcomes
              </h3>
              
              <div className="space-y-3">
                <MetricRow icon={DollarSign} label="Total Revenue" value={`$${metrics.revenue.toLocaleString()}`} color="text-[#4E93FF]" />
                <MetricRow icon={Package} label="Total Cost" value={`$${metrics.totalCost.toLocaleString()}`} color="text-slate-600" />
                <div className="border-t border-slate-100 pt-3">
                  <MetricRow icon={TrendingUp} label="Profit" value={`$${metrics.profit.toLocaleString()}`} color={metrics.profit >= 0 ? "text-emerald-600" : "text-red-600"} highlight />
                </div>
                <MetricRow icon={Percent} label="Profit Margin" value={`${metrics.profitMargin}%`} color={metrics.profitMargin >= 0 ? "text-emerald-600" : "text-red-600"} />
              </div>
            </div>

            {/* Surplus */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                Economic Surplus
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Consumer</span>
                  <span className="font-semibold text-[#4E93FF] text-sm">
                    ${metrics.consumerSurplus.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Producer</span>
                  <span className="font-semibold text-emerald-600 text-sm">
                    ${metrics.producerSurplus.toLocaleString()}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">Total Welfare</span>
                  <span className="font-bold text-slate-900 text-sm">
                    ${(metrics.consumerSurplus + metrics.producerSurplus).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SlideLayout>;
}

// Metric row component
function MetricRow({
  icon: Icon,
  label,
  value,
  color,
  highlight = false
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  highlight?: boolean;
}) {
  return <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className={`text-sm ${highlight ? 'font-medium text-slate-800' : 'text-slate-600'}`}>
          {label}
        </span>
      </div>
      <span className={`font-semibold ${color} ${highlight ? 'text-base' : 'text-sm'}`}>
        {value}
      </span>
    </div>;
}