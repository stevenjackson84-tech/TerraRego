import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, TrendingUp, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export default function MarketAnalysisTab({ dealId, proforma }) {
  const [showForm, setShowForm] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [formData, setFormData] = useState({
    competitor_name: "",
    subdivision_name: "",
    product_type: "",
    sale_price: "",
    square_footage: "",
    bedrooms: "",
    bathrooms: "",
    sale_date: "",
    location: "",
    notes: ""
  });

  const queryClient = useQueryClient();

  const { data: competitorSales = [] } = useQuery({
    queryKey: ['competitorSales', dealId],
    queryFn: () => base44.entities.CompetitorSale.filter({ deal_id: dealId }),
    enabled: !!dealId
  });

  const saleMutation = useMutation({
    mutationFn: (data) => editingSale 
      ? base44.entities.CompetitorSale.update(editingSale.id, data)
      : base44.entities.CompetitorSale.create({ ...data, deal_id: dealId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitorSales', dealId] });
      setShowForm(false);
      setEditingSale(null);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CompetitorSale.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['competitorSales', dealId] })
  });

  const resetForm = () => {
    setFormData({
      competitor_name: "",
      subdivision_name: "",
      product_type: "",
      sale_price: "",
      square_footage: "",
      bedrooms: "",
      bathrooms: "",
      sale_date: "",
      location: "",
      notes: ""
    });
  };

  const handleEdit = (sale) => {
    setEditingSale(sale);
    setFormData({
      competitor_name: sale.competitor_name || "",
      subdivision_name: sale.subdivision_name || "",
      product_type: sale.product_type || "",
      sale_price: sale.sale_price || "",
      square_footage: sale.square_footage || "",
      bedrooms: sale.bedrooms || "",
      bathrooms: sale.bathrooms || "",
      sale_date: sale.sale_date || "",
      location: sale.location || "",
      notes: sale.notes || ""
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    const data = {
      ...formData,
      sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
      square_footage: formData.square_footage ? parseFloat(formData.square_footage) : null,
      bedrooms: formData.bedrooms ? parseFloat(formData.bedrooms) : null,
      bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null
    };
    saleMutation.mutate(data);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Prepare chart data
  const getChartData = () => {
    if (!proforma?.product_types?.length) return [];

    // Group competitor sales by product type
    const competitorByType = competitorSales.reduce((acc, sale) => {
      if (!acc[sale.product_type]) {
        acc[sale.product_type] = [];
      }
      acc[sale.product_type].push(sale.sale_price);
      return acc;
    }, {});

    // Calculate average competitor price per type
    const competitorAvg = Object.entries(competitorByType).reduce((acc, [type, prices]) => {
      acc[type] = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      return acc;
    }, {});

    // Get unique product types from both sources
    const allTypes = new Set([
      ...proforma.product_types.map(pt => pt.name),
      ...Object.keys(competitorAvg)
    ]);

    return Array.from(allTypes).map(type => {
      const proformaProduct = proforma.product_types.find(pt => pt.name === type);
      return {
        name: type,
        "Your Price": proformaProduct?.sales_price_per_unit || null,
        "Market Avg": competitorAvg[type] || null
      };
    }).filter(item => item["Your Price"] || item["Market Avg"]);
  };

  const chartData = getChartData();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900">Market Analysis</h2>
        <Button onClick={() => {
          resetForm();
          setEditingSale(null);
          setShowForm(true);
        }} className="bg-slate-900 hover:bg-slate-800">
          <Plus className="h-4 w-4 mr-2" />
          Add Competitor Sale
        </Button>
      </div>

      {/* Price Comparison Chart */}
      {chartData.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Price Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="Your Price" fill="#0f172a" />
                <Bar dataKey="Market Avg" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Competitor Sales List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Competitor Sales ({competitorSales.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {competitorSales.length > 0 ? (
            <div className="space-y-3">
              {competitorSales.map(sale => (
                <div key={sale.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-slate-900">{sale.competitor_name}</h3>
                          {sale.subdivision_name && (
                            <p className="text-sm text-slate-600">{sale.subdivision_name}</p>
                          )}
                          <p className="text-sm text-slate-500">{sale.product_type}</p>
                        </div>
                        <p className="text-lg font-bold text-slate-900">{formatCurrency(sale.sale_price)}</p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        {sale.square_footage && (
                          <div>
                            <p className="text-slate-500">Sq. Ft.</p>
                            <p className="font-medium">{sale.square_footage.toLocaleString()}</p>
                          </div>
                        )}
                        {sale.bedrooms && (
                          <div>
                            <p className="text-slate-500">Beds</p>
                            <p className="font-medium">{sale.bedrooms}</p>
                          </div>
                        )}
                        {sale.bathrooms && (
                          <div>
                            <p className="text-slate-500">Baths</p>
                            <p className="font-medium">{sale.bathrooms}</p>
                          </div>
                        )}
                        {sale.sale_date && (
                          <div>
                            <p className="text-slate-500">Sale Date</p>
                            <p className="font-medium">{new Date(sale.sale_date).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                      {sale.location && (
                        <p className="text-sm text-slate-500 mt-2">{sale.location}</p>
                      )}
                      {sale.notes && (
                        <p className="text-sm text-slate-600 mt-2">{sale.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(sale)}>
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deleteMutation.mutate(sale.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No competitor sales data yet</p>
              <p className="text-sm text-slate-400 mt-1">Add competitor sales to analyze market pricing</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) {
          setEditingSale(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSale ? 'Edit' : 'Add'} Competitor Sale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="competitor_name">Competitor Name *</Label>
                <Input
                  id="competitor_name"
                  value={formData.competitor_name}
                  onChange={(e) => setFormData({ ...formData, competitor_name: e.target.value })}
                  placeholder="e.g., Builder Name"
                />
              </div>
              <div>
                <Label htmlFor="subdivision_name">Subdivision Name</Label>
                <Input
                  id="subdivision_name"
                  value={formData.subdivision_name}
                  onChange={(e) => setFormData({ ...formData, subdivision_name: e.target.value })}
                  placeholder="e.g., Oak Ridge Estates"
                />
              </div>
              <div>
                <Label htmlFor="product_type">Product Type *</Label>
                <Input
                  id="product_type"
                  value={formData.product_type}
                  onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                  placeholder="e.g., Single Family"
                />
              </div>
              <div>
                <Label htmlFor="sale_price">Sale Price *</Label>
                <Input
                  id="sale_price"
                  type="number"
                  value={formData.sale_price}
                  onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="square_footage">Square Footage</Label>
                <Input
                  id="square_footage"
                  type="number"
                  value={formData.square_footage}
                  onChange={(e) => setFormData({ ...formData, square_footage: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  step="0.5"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="sale_date">Sale Date</Label>
                <Input
                  id="sale_date"
                  type="date"
                  value={formData.sale_date}
                  onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Address or area"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.competitor_name || !formData.product_type || !formData.sale_price || saleMutation.isPending}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {saleMutation.isPending ? "Saving..." : editingSale ? "Update" : "Add"} Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}