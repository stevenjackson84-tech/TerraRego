import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

export default function GISFilterPanel({ deals, users, onFilterChange, isOpen, onToggle }) {
  const [dealStageFilter, setDealStageFilter] = useState('');
  const [minAcreage, setMinAcreage] = useState('');
  const [maxAcreage, setMaxAcreage] = useState('');
  const [assignedUserFilter, setAssignedUserFilter] = useState('');
  const [wuiFilter, setWuiFilter] = useState(true);
  const [floodZoneFilter, setFloodZoneFilter] = useState(true);
  const [faultLineFilter, setFaultLineFilter] = useState(true);
  const [sitlaFilter, setSitlaFilter] = useState(true);

  const stageOptions = [
    { value: 'prospecting', label: 'Prospecting' },
    { value: 'loi', label: 'LOI' },
    { value: 'controlled_not_approved', label: 'Controlled (Not Approved)' },
    { value: 'controlled_approved', label: 'Controlled (Approved)' },
    { value: 'owned', label: 'Owned' },
    { value: 'entitlements', label: 'Entitlements' },
    { value: 'development', label: 'Development' },
    { value: 'closed', label: 'Closed' },
    { value: 'dead', label: 'Dead' },
  ];

  const uniqueUsers = [...new Set(deals?.map(d => d.assigned_to).filter(Boolean))];

  const applyFilters = () => {
    onFilterChange({
      dealStage: dealStageFilter,
      minAcreage: minAcreage ? parseFloat(minAcreage) : null,
      maxAcreage: maxAcreage ? parseFloat(maxAcreage) : null,
      assignedUser: assignedUserFilter,
      layers: {
        wui: wuiFilter,
        floodZones: floodZoneFilter,
        faultLines: faultLineFilter,
        sitla: sitlaFilter,
      },
    });
  };

  const resetFilters = () => {
    setDealStageFilter('');
    setMinAcreage('');
    setMaxAcreage('');
    setAssignedUserFilter('');
    setWuiFilter(true);
    setFloodZoneFilter(true);
    setFaultLineFilter(true);
    setSitlaFilter(true);
    onFilterChange({
      dealStage: '',
      minAcreage: null,
      maxAcreage: null,
      assignedUser: '',
      layers: {
        wui: true,
        floodZones: true,
        faultLines: true,
        sitla: true,
      },
    });
  };

  return (
    <div className="absolute top-40 left-4 z-20 w-80 max-h-[85vh] overflow-y-auto">
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm">Filters</CardTitle>
          <button
            onClick={onToggle}
            className="text-slate-400 hover:text-slate-600"
          >
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </CardHeader>

        {isOpen && (
          <CardContent className="space-y-4 text-sm">
            {/* Deal Filters */}
            <div className="border-b pb-4">
              <h3 className="font-semibold text-slate-900 mb-3">Deal Filters</h3>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="stage" className="text-xs">Deal Stage</Label>
                  <Select value={dealStageFilter} onValueChange={setDealStageFilter}>
                    <SelectTrigger id="stage" className="h-8 text-xs">
                      <SelectValue placeholder="All stages" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>All Stages</SelectItem>
                      {stageOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="assignee" className="text-xs">Assigned To</Label>
                  <Select value={assignedUserFilter} onValueChange={setAssignedUserFilter}>
                    <SelectTrigger id="assignee" className="h-8 text-xs">
                      <SelectValue placeholder="All users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>All Users</SelectItem>
                      {uniqueUsers.map(user => (
                        <SelectItem key={user} value={user}>{user}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="minAcres" className="text-xs">Min Acres</Label>
                    <Input
                      id="minAcres"
                      type="number"
                      placeholder="0"
                      value={minAcreage}
                      onChange={(e) => setMinAcreage(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxAcres" className="text-xs">Max Acres</Label>
                    <Input
                      id="maxAcres"
                      type="number"
                      placeholder="10000"
                      value={maxAcreage}
                      onChange={(e) => setMaxAcreage(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Layer Filters */}
            <div className="border-b pb-4">
              <h3 className="font-semibold text-slate-900 mb-3">Layer Visibility</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="wui-check"
                    checked={wuiFilter}
                    onCheckedChange={setWuiFilter}
                  />
                  <Label htmlFor="wui-check" className="text-xs cursor-pointer">🔥 WUI Zones</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="flood-check"
                    checked={floodZoneFilter}
                    onCheckedChange={setFloodZoneFilter}
                  />
                  <Label htmlFor="flood-check" className="text-xs cursor-pointer">💧 Flood Zones</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="fault-check"
                    checked={faultLineFilter}
                    onCheckedChange={setFaultLineFilter}
                  />
                  <Label htmlFor="fault-check" className="text-xs cursor-pointer">⚡ Fault Lines</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sitla-check"
                    checked={sitlaFilter}
                    onCheckedChange={setSitlaFilter}
                  />
                  <Label htmlFor="sitla-check" className="text-xs cursor-pointer">🏛️ SITLA Lands</Label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={applyFilters}
                className="flex-1 h-8 text-xs bg-slate-900 hover:bg-slate-800"
              >
                Apply
              </Button>
              <Button
                onClick={resetFilters}
                variant="outline"
                className="flex-1 h-8 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}