import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function VisualizationPanel({
  showClusters,
  onToggleClusters,
  heatmapMode,
  onHeatmapModeChange,
  heatmapOpacity,
  onHeatmapOpacityChange,
  isOpen,
  onToggle,
}) {
  return (
    <div className="absolute bottom-6 left-4 z-20 w-80">
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm">Data Visualization</CardTitle>
          <button
            onClick={onToggle}
            className="text-slate-400 hover:text-slate-600"
          >
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </CardHeader>

        {isOpen && (
          <CardContent className="space-y-4 text-sm">
            {/* Cluster Markers */}
            <div className="border-b pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  id="cluster-toggle"
                  checked={showClusters}
                  onCheckedChange={onToggleClusters}
                />
                <Label htmlFor="cluster-toggle" className="text-xs font-medium cursor-pointer">
                  🎯 Cluster Markers
                </Label>
              </div>
              <p className="text-xs text-slate-500">Groups nearby deals for better performance</p>
            </div>

            {/* Heatmap Visualization */}
            <div>
              <Label className="text-xs font-medium mb-2 block">Heatmap Visualization</Label>
              <Select value={heatmapMode || 'off'} onValueChange={onHeatmapModeChange}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Off" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Off</SelectItem>
                  <SelectItem value="value">By Deal Value</SelectItem>
                  <SelectItem value="acreage">By Acreage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {heatmapMode && heatmapMode !== 'off' && (
              <div>
                <Label className="text-xs font-medium mb-2 block">Opacity</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={heatmapOpacity}
                    onChange={(e) => onHeatmapOpacityChange(parseFloat(e.target.value))}
                    className="flex-1 h-2 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 w-10 text-right">
                    {Math.round(heatmapOpacity * 100)}%
                  </span>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-700 mb-2">Heatmap Scale</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded" style={{ backgroundColor: '#0000ff' }} />
                  <span className="text-xs text-slate-600">Low</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded" style={{ backgroundColor: '#ffff00' }} />
                  <span className="text-xs text-slate-600">Medium</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded" style={{ backgroundColor: '#ff0000' }} />
                  <span className="text-xs text-slate-600">High</span>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}