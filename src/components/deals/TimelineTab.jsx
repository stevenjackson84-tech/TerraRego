import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Calendar, TrendingUp, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function TimelineTab({ proforma, onSave, isLoading }) {
  const [isEditing, setIsEditing] = useState(!proforma || !proforma.timeline_events?.length);
  const [formData, setFormData] = useState(proforma || {
    timeline_events: []
  });

  const events = formData.timeline_events || [];

  const addEvent = () => {
    setFormData(prev => ({
      ...prev,
      timeline_events: [
        ...(prev.timeline_events || []),
        { date: "", event_type: "development_spend", amount: "", units: "", description: "" }
      ]
    }));
  };

  const removeEvent = (index) => {
    setFormData(prev => ({
      ...prev,
      timeline_events: prev.timeline_events.filter((_, i) => i !== index)
    }));
  };

  const updateEvent = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      timeline_events: prev.timeline_events.map((evt, i) => 
        i === index ? { ...evt, [field]: value } : evt
      )
    }));
  };

  const handleSave = () => {
    const data = {
      ...formData,
      timeline_events: (formData.timeline_events || []).map(evt => ({
        date: evt.date,
        event_type: evt.event_type,
        amount: evt.amount ? parseFloat(evt.amount) : null,
        units: evt.units ? parseFloat(evt.units) : null,
        description: evt.description
      }))
    };
    onSave(data);
    setIsEditing(false);
  };

  // Calculate Unlevered IRR
  const calculateUnleveredIRR = () => {
    if (!events.length) return null;

    // Sort events by date
    const sortedEvents = [...events]
      .filter(e => e.date)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (sortedEvents.length === 0) return null;

    // Build cash flow map
    const cashFlowMap = new Map();
    
    sortedEvents.forEach(event => {
      const date = event.date;
      const amount = parseFloat(event.amount) || 0;
      
      if (!cashFlowMap.has(date)) {
        cashFlowMap.set(date, 0);
      }
      
      if (event.event_type === 'development_spend') {
        cashFlowMap.set(date, cashFlowMap.get(date) - amount); // Outflow
      } else if (event.event_type === 'home_closing') {
        cashFlowMap.set(date, cashFlowMap.get(date) + amount); // Inflow
      }
    });

    // Convert to array of [date, cashflow]
    const cashFlows = Array.from(cashFlowMap.entries())
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([date, amount]) => ({ date: new Date(date), amount }));

    if (cashFlows.length < 2) return null;

    const startDate = cashFlows[0].date;
    
    // Convert to period-based cash flows
    const periodCashFlows = cashFlows.map(cf => {
      const monthsDiff = (cf.date.getFullYear() - startDate.getFullYear()) * 12 + 
                         (cf.date.getMonth() - startDate.getMonth());
      return { period: monthsDiff, amount: cf.amount };
    });

    // Group by period and sum
    const groupedFlows = periodCashFlows.reduce((acc, cf) => {
      if (!acc[cf.period]) acc[cf.period] = 0;
      acc[cf.period] += cf.amount;
      return acc;
    }, {});

    // Build final cash flow array with zeros for missing periods
    const maxPeriod = Math.max(...Object.keys(groupedFlows).map(Number));
    const finalCashFlows = [];
    for (let i = 0; i <= maxPeriod; i++) {
      finalCashFlows.push(groupedFlows[i] || 0);
    }

    // NPV calculation
    const npv = (rate, flows) => {
      return flows.reduce((sum, flow, t) => sum + flow / Math.pow(1 + rate, t), 0);
    };

    // Newton's method to find IRR
    let rate = 0.1; // Initial guess 10%
    const maxIterations = 100;
    const tolerance = 0.0001;

    for (let i = 0; i < maxIterations; i++) {
      const npvValue = npv(rate, finalCashFlows);
      const npvDerivative = finalCashFlows.reduce((sum, flow, t) => 
        sum - (t * flow) / Math.pow(1 + rate, t + 1), 0);

      if (Math.abs(npvDerivative) < 0.000001) break;

      const newRate = rate - npvValue / npvDerivative;

      if (Math.abs(newRate - rate) < tolerance) {
        // Annualize the monthly IRR
        return (Math.pow(1 + newRate, 12) - 1) * 100;
      }

      rate = newRate;
      
      // Prevent divergence
      if (rate < -0.99 || rate > 10 || isNaN(rate)) break;
    }

    return null;
  };

  const unleveredIRR = calculateUnleveredIRR();

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const eventTypeLabels = {
    development_spend: "Development Spend",
    home_start: "Home Start",
    home_sale: "Home Sale",
    home_closing: "Home Closing"
  };

  const eventTypeIcons = {
    development_spend: DollarSign,
    home_start: Calendar,
    home_sale: TrendingUp,
    home_closing: TrendingUp
  };

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900">Project Timeline</h2>
          <div className="flex gap-2">
            {proforma && (
              <Button variant="outline" onClick={() => {
                setFormData(proforma);
                setIsEditing(false);
              }}>
                Cancel
              </Button>
            )}
            <Button onClick={handleSave} disabled={isLoading} className="bg-slate-900 hover:bg-slate-800">
              {isLoading ? "Saving..." : "Save Timeline"}
            </Button>
          </div>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Timeline Events</CardTitle>
              <Button onClick={addEvent} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Event
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {events.map((event, index) => (
              <div key={index} className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <Label className="text-sm font-medium">Event {index + 1}</Label>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeEvent(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Date</Label>
                    <Input
                      type="date"
                      value={event.date}
                      onChange={(e) => updateEvent(index, "date", e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Event Type</Label>
                    <Select
                      value={event.event_type}
                      onValueChange={(value) => updateEvent(index, "event_type", value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="development_spend">Development Spend</SelectItem>
                        <SelectItem value="home_start">Home Start</SelectItem>
                        <SelectItem value="home_sale">Home Sale</SelectItem>
                        <SelectItem value="home_closing">Home Closing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(event.event_type === 'development_spend' || event.event_type === 'home_sale' || event.event_type === 'home_closing') && (
                    <div>
                      <Label className="text-xs">Amount ($)</Label>
                      <Input
                        type="number"
                        value={event.amount}
                        onChange={(e) => updateEvent(index, "amount", e.target.value)}
                        placeholder="0"
                        className="h-9"
                      />
                    </div>
                  )}
                  {(event.event_type === 'home_start' || event.event_type === 'home_sale' || event.event_type === 'home_closing') && (
                    <div>
                      <Label className="text-xs">Units</Label>
                      <Input
                        type="number"
                        value={event.units}
                        onChange={(e) => updateEvent(index, "units", e.target.value)}
                        placeholder="0"
                        className="h-9"
                      />
                    </div>
                  )}
                  <div className="col-span-2">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={event.description}
                      onChange={(e) => updateEvent(index, "description", e.target.value)}
                      placeholder="Optional description"
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            ))}
            {events.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No timeline events added yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!proforma || !events.length) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Timeline Data</h3>
        <p className="text-slate-500 mb-4">Add timeline events to track cash flows and calculate IRR</p>
        <Button onClick={() => setIsEditing(true)} className="bg-slate-900 hover:bg-slate-800">
          Add Timeline Events
        </Button>
      </div>
    );
  }

  // Sort events by date
  const sortedEvents = [...events]
    .filter(e => e.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900">Project Timeline</h2>
        <Button onClick={() => setIsEditing(true)} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Edit Timeline
        </Button>
      </div>

      {/* IRR Card */}
      {unleveredIRR !== null && (
        <Card className={cn("border-0 shadow-sm", unleveredIRR >= 0 ? "bg-blue-50" : "bg-red-50")}>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
              <TrendingUp className="h-4 w-4" />
              <span>Unlevered IRR</span>
            </div>
            <p className={cn("text-3xl font-bold", unleveredIRR >= 0 ? "text-blue-700" : "text-red-700")}>
              {unleveredIRR.toFixed(2)}%
            </p>
            <p className="text-xs text-slate-500 mt-1">Based on timeline cash flows</p>
          </CardContent>
        </Card>
      )}

      {/* Timeline Events */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Timeline Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedEvents.map((event, index) => {
              const Icon = eventTypeIcons[event.event_type];
              return (
                <div key={index} className="flex items-start gap-4 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                  <div className="p-2 rounded-lg bg-slate-100">
                    <Icon className="h-4 w-4 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{eventTypeLabels[event.event_type]}</p>
                        {event.description && (
                          <p className="text-sm text-slate-500 mt-0.5">{event.description}</p>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{format(new Date(event.date), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="flex gap-4 mt-2 text-sm">
                      {event.amount && (
                        <div>
                          <span className="text-slate-500">Amount: </span>
                          <span className={cn("font-medium", event.event_type === 'development_spend' ? "text-red-600" : "text-emerald-600")}>
                            {event.event_type === 'development_spend' ? '-' : '+'}{formatCurrency(event.amount)}
                          </span>
                        </div>
                      )}
                      {event.units && (
                        <div>
                          <span className="text-slate-500">Units: </span>
                          <span className="font-medium text-slate-900">{event.units}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}