import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  MapPin,
  DollarSign,
  Home,
  Calendar,
  TrendingUp,
  School,
  Zap,
  Image as ImageIcon,
  Heart,
  Activity,
  AlertCircle,
} from "lucide-react";

export default function PropertyDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const propertyUrl = urlParams.get("url");
  const [imageIndex, setImageIndex] = useState(0);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [notesDialog, setNotesDialog] = useState(false);
  const [tempNotes, setTempNotes] = useState("");
  const queryClient = useQueryClient();

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const user = await base44.auth.me();
      if (user) setCurrentUserEmail(user.email);
    };
    getUser();
  }, []);

  const { data: property, isLoading, error } = useQuery({
    queryKey: ["property", propertyUrl],
    queryFn: async () => {
      const response = await base44.functions.invoke("getPropertyDetails", {
        propertyUrl: decodeURIComponent(propertyUrl || ""),
      });
      return response.data;
    },
    enabled: !!propertyUrl,
  });

  // Check if property is favorited
  useQuery({
    queryKey: ["isFavorited", propertyUrl, currentUserEmail],
    queryFn: async () => {
      if (!currentUserEmail) return false;
      const favorites = await base44.entities.FavoriteProperty.filter({
        user_email: currentUserEmail,
        property_url: decodeURIComponent(propertyUrl || ""),
      });
      const favorited = favorites.length > 0;
      setIsFavorited(favorited);
      if (favorited && favorites[0].notes) {
        setTempNotes(favorites[0].notes);
      }
      return favorited;
    },
    enabled: !!currentUserEmail && !!propertyUrl,
  });

  // Fetch comparable properties
  const { data: compsData, isLoading: compsLoading } = useQuery({
    queryKey: ["comps", property?.latitude, property?.longitude],
    queryFn: async () => {
      if (!property?.latitude || !property?.longitude) return null;
      const response = await base44.functions.invoke("getPropertyComps", {
        latitude: property.latitude,
        longitude: property.longitude,
        radius: 0.5,
      });
      return response.data;
    },
    enabled: !!property?.latitude && !!property?.longitude,
  });

  // Fetch market trends
  const { data: marketTrends, isLoading: marketLoading } = useQuery({
    queryKey: ["marketTrends", property?.address],
    queryFn: async () => {
      if (!property?.address || !property?.latitude) return null;
      const response = await base44.functions.invoke("getMarketTrends", {
        latitude: property.latitude,
        longitude: property.longitude,
        address: property.address,
      });
      return response.data;
    },
    enabled: !!property?.address && !!property?.latitude,
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorited) {
        const favorites = await base44.entities.FavoriteProperty.filter({
          user_email: currentUserEmail,
          property_url: decodeURIComponent(propertyUrl || ""),
        });
        if (favorites[0]) {
          await base44.entities.FavoriteProperty.delete(favorites[0].id);
        }
      } else {
        await base44.entities.FavoriteProperty.create({
          user_email: currentUserEmail,
          property_url: decodeURIComponent(propertyUrl || ""),
          address: property?.address || "",
          price: property?.price || null,
          beds: property?.beds || null,
          baths: property?.baths || null,
          sqft: property?.sqft || null,
          latitude: property?.latitude || null,
          longitude: property?.longitude || null,
          notes: tempNotes || "",
          cached_data: property || {},
        });
      }
      setIsFavorited(!isFavorited);
      queryClient.invalidateQueries({ queryKey: ["isFavorited"] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-slate-300 border-t-slate-900 rounded-full" />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Link
            to={createPageUrl("GISMap")}
            className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Map
          </Link>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">
              {error?.message || "Failed to load property details"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          to={createPageUrl("GISMap")}
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Map
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {property.address}
          </h1>
          <div className="flex items-center gap-4 text-slate-600">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">{property.address}</span>
            </div>
            {property.daysOnMarket && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">{property.daysOnMarket} days on market</span>
              </div>
            )}
          </div>
        </div>

        {/* Key Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Price</p>
              <p className="text-2xl font-semibold text-slate-900">
                ${property.price?.toLocaleString() || "—"}
              </p>
              {property.pricePerSqft && (
                <p className="text-xs text-slate-500 mt-1">
                  ${property.pricePerSqft}/sqft
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Size</p>
              <p className="text-2xl font-semibold text-slate-900">
                {property.sqft ? `${property.sqft.toLocaleString()} sqft` : "—"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Beds / Baths</p>
              <p className="text-2xl font-semibold text-slate-900">
                {property.beds || "—"} / {property.baths || "—"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Year Built</p>
              <p className="text-2xl font-semibold text-slate-900">
                {property.yearBuilt || "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white border flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="comps">Comps</TabsTrigger>
            <TabsTrigger value="market">Market Trends</TabsTrigger>
            {property.images?.length > 0 && (
              <TabsTrigger value="images">Images ({property.images.length})</TabsTrigger>
            )}
            {property.priceHistory?.length > 0 && (
              <TabsTrigger value="pricehistory">Price History</TabsTrigger>
            )}
            {property.schoolRatings?.length > 0 && (
              <TabsTrigger value="schools">Schools</TabsTrigger>
            )}
          </TabsList>

          {/* Comps Tab */}
          <TabsContent value="comps">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Comparable Properties
                </CardTitle>
              </CardHeader>
              <CardContent>
                {compsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-6 w-6 border-2 border-slate-300 border-t-slate-900 rounded-full" />
                  </div>
                ) : compsData?.comps?.length > 0 ? (
                  <div className="space-y-3">
                    {compsData.comps.map((comp, idx) => (
                      <div key={idx} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-slate-900">{comp.address}</h4>
                          <span className="text-sm font-semibold text-indigo-600">
                            ${comp.price?.toLocaleString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500">Beds</p>
                            <p className="font-medium">{comp.beds || "—"}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Baths</p>
                            <p className="font-medium">{comp.baths || "—"}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Sq Ft</p>
                            <p className="font-medium">{comp.sqft?.toLocaleString() || "—"}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">$/Sq Ft</p>
                            <p className="font-medium">${comp.pricePerSqft?.toLocaleString() || "—"}</p>
                          </div>
                        </div>
                        {comp.saleDate && (
                          <p className="text-xs text-slate-500 mt-2">Sold: {comp.saleDate}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-slate-500">No comparable properties found nearby</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Market Trends Tab */}
          <TabsContent value="market">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Market Trends & Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {marketLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-6 w-6 border-2 border-slate-300 border-t-slate-900 rounded-full" />
                  </div>
                ) : marketTrends ? (
                  <div className="space-y-6">
                    {/* Market Overview Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {marketTrends.avgPrice && (
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-xs text-slate-500">Avg Price</p>
                          <p className="text-lg font-semibold text-slate-900">
                            ${(marketTrends.avgPrice / 1000).toFixed(0)}K
                          </p>
                        </div>
                      )}
                      {marketTrends.pricePerSqft && (
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-xs text-slate-500">Price/Sqft</p>
                          <p className="text-lg font-semibold text-slate-900">
                            ${marketTrends.pricePerSqft}
                          </p>
                        </div>
                      )}
                      {marketTrends.daysOnMarket && (
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-xs text-slate-500">Days on Market</p>
                          <p className="text-lg font-semibold text-slate-900">
                            {marketTrends.daysOnMarket}
                          </p>
                        </div>
                      )}
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500">Outlook</p>
                        <p className={`text-lg font-semibold ${
                          marketTrends.marketOutlook === 'bullish' ? 'text-green-600' :
                          marketTrends.marketOutlook === 'bearish' ? 'text-red-600' :
                          'text-yellow-600'
                        }`}>
                          {marketTrends.marketOutlook?.charAt(0).toUpperCase() + marketTrends.marketOutlook?.slice(1) || "—"}
                        </p>
                      </div>
                    </div>

                    {/* Price Trend */}
                    {marketTrends.priceeTrend && (
                      <div className={`p-4 rounded-lg border ${
                        marketTrends.priceeTrend === 'up' ? 'bg-green-50 border-green-200' :
                        marketTrends.priceeTrend === 'down' ? 'bg-red-50 border-red-200' :
                        'bg-blue-50 border-blue-200'
                      }`}>
                        <p className={`font-medium ${
                          marketTrends.priceeTrend === 'up' ? 'text-green-800' :
                          marketTrends.priceeTrend === 'down' ? 'text-red-800' :
                          'text-blue-800'
                        }`}>
                          {marketTrends.priceeTrend === 'up' ? '📈' : marketTrends.priceeTrend === 'down' ? '📉' : '→'} 
                          {' '} Price Trend: {marketTrends.priceChange12m || 'Stable'}
                        </p>
                      </div>
                    )}

                    {/* Inventory Level */}
                    {marketTrends.inventoryLevel && (
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-600 mb-2">Inventory Level</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                marketTrends.inventoryLevel === 'high' ? 'bg-red-500' :
                                marketTrends.inventoryLevel === 'moderate' ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{
                                width: marketTrends.inventoryLevel === 'high' ? '100%' :
                                       marketTrends.inventoryLevel === 'moderate' ? '60%' : '30%'
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {marketTrends.inventoryLevel.charAt(0).toUpperCase() + marketTrends.inventoryLevel.slice(1)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Key Factors */}
                    {marketTrends.keyFactors?.length > 0 && (
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-sm font-medium text-slate-900 mb-3">Key Market Factors</p>
                        <ul className="space-y-2">
                          {marketTrends.keyFactors.map((factor, idx) => (
                            <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                              <span className="text-indigo-600 font-semibold mt-0.5">•</span>
                              {factor}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Analysis */}
                    {marketTrends.analysis && (
                      <div className="p-4 border border-slate-200 rounded-lg">
                        <p className="text-sm font-medium text-slate-900 mb-2">Analysis</p>
                        <p className="text-sm text-slate-600 leading-relaxed">{marketTrends.analysis}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-center py-8 text-slate-500">Unable to load market trends at this time</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {property.description && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-600 leading-relaxed">
                        {property.description}
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Property Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {property.lotSize && (
                        <div>
                          <p className="text-slate-500">Lot Size</p>
                          <p className="font-medium">{property.lotSize}</p>
                        </div>
                      )}
                      {property.propertyType && (
                        <div>
                          <p className="text-slate-500">Property Type</p>
                          <p className="font-medium">{property.propertyType}</p>
                        </div>
                      )}
                      {property.taxes && (
                        <div>
                          <p className="text-slate-500">Annual Taxes</p>
                          <p className="font-medium">${property.taxes.toLocaleString()}</p>
                        </div>
                      )}
                      {property.hoaFee && (
                        <div>
                          <p className="text-slate-500">HOA Fee</p>
                          <p className="font-medium">${property.hoaFee.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                {property.zestimate && (
                  <Card className="border-0 shadow-sm bg-indigo-50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-indigo-600" />
                        Zestimate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-indigo-600">
                        ${property.zestimate.toLocaleString()}
                      </p>
                      <p className="text-xs text-indigo-600 mt-2">
                        Zillow's estimate of property value
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      asChild
                      className="w-full bg-slate-900 hover:bg-slate-800"
                    >
                      <a href={property.url} target="_blank" rel="noopener noreferrer">
                        View on Redfin
                      </a>
                    </Button>
                    <Button
                      onClick={() => toggleFavoriteMutation.mutate()}
                      disabled={toggleFavoriteMutation.isPending}
                      variant={isFavorited ? "default" : "outline"}
                      className={`w-full ${isFavorited ? "bg-red-500 hover:bg-red-600" : ""}`}
                    >
                      <Heart className={`h-4 w-4 mr-2 ${isFavorited ? "fill-current" : ""}`} />
                      {isFavorited ? "Favorited" : "Add to Favorites"}
                    </Button>
                    {isFavorited && (
                      <Button variant="outline" className="w-full" onClick={() => setNotesDialog(true)}>
                        Edit Notes
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Images Tab */}
          {property.images?.length > 0 && (
            <TabsContent value="images">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Property Images
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-4">
                    {property.images[imageIndex] && (
                      <img
                        src={property.images[imageIndex]}
                        alt={`Property view ${imageIndex + 1}`}
                        className="w-full h-96 object-cover rounded-lg"
                        onError={(e) => {
                          e.target.src =
                            "https://via.placeholder.com/600x400?text=Image+Not+Available";
                        }}
                      />
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">
                        {imageIndex + 1} of {property.images.length}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() =>
                            setImageIndex(Math.max(0, imageIndex - 1))
                          }
                          disabled={imageIndex === 0}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            setImageIndex(
                              Math.min(property.images.length - 1, imageIndex + 1)
                            )
                          }
                          disabled={imageIndex === property.images.length - 1}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Price History Tab */}
          {property.priceHistory?.length > 0 && (
            <TabsContent value="pricehistory">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Price History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {property.priceHistory.map((entry, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded"
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            ${entry.price?.toLocaleString() || "—"}
                          </p>
                          <p className="text-sm text-slate-500">
                            {entry.date || entry.eventType}
                          </p>
                        </div>
                        {entry.eventType && (
                          <Badge variant="outline">{entry.eventType}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Schools Tab */}
          {property.schoolRatings?.length > 0 && (
            <TabsContent value="schools">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <School className="h-5 w-5" />
                    Nearby Schools
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {property.schoolRatings.map((school, idx) => (
                      <div
                        key={idx}
                        className="p-4 border border-slate-200 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-slate-900">
                            {school.name}
                          </h4>
                          {school.rating && (
                            <Badge className="bg-indigo-100 text-indigo-800">
                              Rating: {school.rating}/10
                            </Badge>
                          )}
                        </div>
                        {school.grade && (
                          <p className="text-sm text-slate-600 mb-1">
                            Grade: {school.grade}
                          </p>
                        )}
                        {school.distance && (
                          <p className="text-sm text-slate-500">
                            {school.distance} away
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}