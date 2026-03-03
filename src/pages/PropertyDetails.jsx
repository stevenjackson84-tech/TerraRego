import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";

export default function PropertyDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const propertyUrl = urlParams.get("url");
  const [imageIndex, setImageIndex] = useState(0);

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
                    <Button variant="outline" className="w-full">
                      Save to Deals
                    </Button>
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