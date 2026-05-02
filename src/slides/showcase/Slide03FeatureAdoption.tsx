import React, { useState } from 'react';
import { SlideLayout } from '@/components/slides/SlideLayout';
import { Check, Zap, Shield, BarChart3, Users, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
const features = [{
  id: 'analytics',
  icon: BarChart3,
  name: 'Advanced Analytics',
  description: 'Real-time dashboards and custom reports',
  adoption: 87,
  users: '2.4k'
}, {
  id: 'automation',
  icon: Zap,
  name: 'Workflow Automation',
  description: 'Automate repetitive tasks and approvals',
  adoption: 72,
  users: '1.8k'
}, {
  id: 'security',
  icon: Shield,
  name: 'Enterprise Security',
  description: 'SSO, audit logs, and compliance tools',
  adoption: 94,
  users: '3.1k'
}, {
  id: 'collaboration',
  icon: Users,
  name: 'Team Collaboration',
  description: 'Shared workspaces and real-time editing',
  adoption: 68,
  users: '1.5k'
}, {
  id: 'notifications',
  icon: Bell,
  name: 'Smart Notifications',
  description: 'AI-powered alerts and digest emails',
  adoption: 45,
  users: '890'
}];
export default function Slide03FeatureAdoption() {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(['analytics', 'security']);
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  const toggleFeature = (id: string) => {
    setSelectedFeatures(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };
  const totalAdoption = features.filter(f => selectedFeatures.includes(f.id)).reduce((sum, f) => sum + f.adoption, 0) / Math.max(selectedFeatures.length, 1);
  const totalUsers = features.filter(f => selectedFeatures.includes(f.id)).reduce((sum, f) => sum + parseFloat(f.users.replace('k', '')) * (f.users.includes('k') ? 1000 : 1), 0);
  return <SlideLayout variant="default">
      <div className="flex flex-col h-full px-16 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1.5 h-8 bg-[#4E93FF] rounded-full" />
            <h1 className="text-4xl font-bold text-slate-900">
              ​Calculations on the fly    
            </h1>
          </div>
          <p className="text-lg text-slate-500 ml-5">
            Select features to see combined adoption metrics and user engagement
          </p>
        </div>

        {/* Main content */}
        <div className="flex-1 flex gap-8 min-h-0">
          {/* Left: Feature Cards */}
          <div className="w-2/3 grid grid-cols-2 gap-4 content-start">
            {features.map(feature => {
            const Icon = feature.icon;
            const isSelected = selectedFeatures.includes(feature.id);
            const isHovered = hoveredFeature === feature.id;
            return <button key={feature.id} onClick={() => toggleFeature(feature.id)} onMouseEnter={() => setHoveredFeature(feature.id)} onMouseLeave={() => setHoveredFeature(null)} className={cn("relative p-5 rounded-xl border-2 text-left transition-all duration-200", isSelected ? "border-[#4E93FF] bg-blue-50 shadow-md" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm")}>
                  {/* Selection indicator */}
                  <div className={cn("absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all", isSelected ? "bg-[#4E93FF]" : "bg-slate-100 border border-slate-300")}>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </div>

                  {/* Icon */}
                  <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mb-3 transition-colors", isSelected ? "bg-[#4E93FF]" : "bg-slate-100")}>
                    <Icon className={cn("w-6 h-6", isSelected ? "text-white" : "text-slate-600")} />
                  </div>

                  {/* Content */}
                  <h3 className={cn("text-lg font-semibold mb-1", isSelected ? "text-blue-900" : "text-slate-900")}>
                    {feature.name}
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    {feature.description}
                  </p>

                  {/* Adoption bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Adoption</span>
                      <span className={cn("font-semibold", isSelected ? "text-[#4E93FF]" : "text-slate-700")}>
                        {feature.adoption}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-500", isSelected ? "bg-[#4E93FF]" : "bg-slate-400")} style={{
                    width: `${feature.adoption}%`
                  }} />
                    </div>
                  </div>

                  {/* Users badge */}
                  <div className="mt-3 flex items-center gap-1 text-xs text-slate-500">
                    <Users className="w-3 h-3" />
                    <span>{feature.users} active users</span>
                  </div>
                </button>;
          })}
          </div>

          {/* Right: Summary Panel */}
          <div className="w-1/3 flex flex-col gap-4">
            {/* Selected count */}
             <div className="bg-[#4E93FF] text-white rounded-xl p-5">
               <p className="text-blue-100 text-sm mb-1">Selected Features</p>
               <p className="text-4xl font-bold mb-2">{selectedFeatures.length}</p>
               <p className="text-blue-100 text-sm">of {features.length} available</p>
            </div>

            {/* Average adoption */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 flex-1">
              <p className="text-slate-500 text-sm mb-2">Combined Adoption Rate</p>
              <div className="flex items-end gap-2 mb-4">
                <span className="text-5xl font-bold text-slate-900">
                  {selectedFeatures.length > 0 ? Math.round(totalAdoption) : 0}
                </span>
                <span className="text-2xl text-slate-400 mb-1">%</span>
              </div>
              
              {/* Visual gauge */}
              <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden mb-6">
                <div className="absolute inset-y-0 left-0 bg-[#4E93FF] rounded-full transition-all duration-500" style={{
                width: `${selectedFeatures.length > 0 ? totalAdoption : 0}%`
              }} />
              </div>

              {/* Selected features list */}
              <div className="space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Active Selection</p>
                {selectedFeatures.length === 0 ? <p className="text-sm text-slate-400 italic">Click features to select</p> : <div className="flex flex-wrap gap-2">
                    {selectedFeatures.map(id => {
                  const feature = features.find(f => f.id === id);
                  if (!feature) return null;
                  return <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-[#4E93FF] rounded-md text-xs font-medium">
                          <feature.icon className="w-3 h-3" />
                          {feature.name}
                        </span>;
                })}
                  </div>}
              </div>
            </div>

            {/* Total users */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-slate-600" />
                <p className="text-slate-500 text-sm">Total Active Users</p>
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {totalUsers >= 1000 ? `${(totalUsers / 1000).toFixed(1)}k` : totalUsers.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </SlideLayout>;
}