import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Heart,
  MapPin,
  Home,
  DollarSign,
  Trash2,
  ExternalLink,
  MessageSquare,
  Map,
  Search,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function Favorites() {
  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingFavorite, setEditingFavorite] = useState(null);
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

  // Fetch favorites
  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["favorites", currentUserEmail],
    queryFn: () =>
      currentUserEmail
        ? base44.entities.FavoriteProperty.filter({ user_email: currentUserEmail })
        : Promise.resolve([]),
    enabled: !!currentUserEmail,
  });

  // Delete favorite mutation
  const deleteFavoriteMutation = useMutation({
    mutationFn: (id) => base44.entities.FavoriteProperty.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites", currentUserEmail] });
    },
  });

  // Update notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: ({ id, notes }) => base44.entities.FavoriteProperty.update(id, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites", currentUserEmail] });
      setNotesDialog(false);
      setEditingFavorite(null);
    },
  });

  const handleEditNotes = (favorite) => {
    setEditingFavorite(favorite);
    setTempNotes(favorite.notes || "");
    setNotesDialog(true);
  };

  const handleSaveNotes = () => {
    if (editingFavorite) {
      updateNotesMutation.mutate({ id: editingFavorite.id, notes: tempNotes });
    }
  };

  const filteredFavorites = favorites.filter(
    (fav) =>
      fav.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fav.property_url?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-slate-300 border-t-slate-900 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="h-8 w-8 text-red-500" />
            <h1 className="text-3xl font-bold text-slate-900">Favorite Properties</h1>
          </div>
          <p className="text-slate-600">
            {favorites.length} saved {favorites.length === 1 ? "property" : "properties"}
          </p>
        </div>

        {/* Search Bar */}
        {favorites.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by address or URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Favorites Grid */}
        {filteredFavorites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFavorites.map((favorite) => (
              <Card key={favorite.id} className="border-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base leading-snug truncate">
                        {favorite.address}
                      </CardTitle>
                    </div>
                    <button
                      onClick={() => deleteFavoriteMutation.mutate(favorite.id)}
                      disabled={deleteFavoriteMutation.isPending}
                      className="text-slate-400 hover:text-red-500 flex-shrink-0 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Price and Size */}
                  <div className="grid grid-cols-2 gap-3">
                    {favorite.price && (
                      <div className="flex items-start gap-2">
                        <DollarSign className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-500">Price</p>
                          <p className="font-semibold text-slate-900">
                            ${favorite.price.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                    {favorite.sqft && (
                      <div className="flex items-start gap-2">
                        <Home className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-500">Sq Ft</p>
                          <p className="font-semibold text-slate-900">
                            {favorite.sqft.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Beds / Baths */}
                  {(favorite.beds || favorite.baths) && (
                    <div className="flex gap-2">
                      {favorite.beds && (
                        <Badge variant="outline" className="bg-slate-50">
                          {favorite.beds} bed{favorite.beds !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      {favorite.baths && (
                        <Badge variant="outline" className="bg-slate-50">
                          {favorite.baths} bath{favorite.baths !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Notes Preview */}
                  {favorite.notes && (
                    <div className="bg-blue-50 border border-blue-100 rounded p-2">
                      <p className="text-xs text-blue-800 line-clamp-2">{favorite.notes}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2">
                    <div className="flex gap-2">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        <Link to={createPageUrl(`PropertyDetails?url=${encodeURIComponent(favorite.property_url)}`)}>
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View Details
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditNotes(favorite)}
                        className="flex-1"
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Notes
                      </Button>
                    </div>
                    {favorite.latitude && favorite.longitude && (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="w-full"
                      >
                        <Link
                          to={createPageUrl(
                            `GISMap?lat=${favorite.latitude}&lng=${favorite.longitude}`
                          )}
                        >
                          <Map className="h-3 w-3 mr-1" />
                          View on Map
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Heart className="h-16 w-16 text-slate-200 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">No Favorites Yet</h2>
            <p className="text-slate-500 mb-6">
              {searchQuery
                ? "No properties match your search"
                : "Start adding properties to your favorites from the GIS map"}
            </p>
            <Button asChild className="bg-slate-900 hover:bg-slate-800">
              <Link to={createPageUrl("GISMap")}>Browse Map</Link>
            </Button>
          </div>
        )}
      </div>

      {/* Notes Dialog */}
      <Dialog open={notesDialog} onOpenChange={setNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notes for {editingFavorite?.address}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={tempNotes}
              onChange={(e) => setTempNotes(e.target.value)}
              placeholder="Add your notes about this property..."
              className="min-h-24"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveNotes}
              disabled={updateNotesMutation.isPending}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {updateNotesMutation.isPending ? "Saving..." : "Save Notes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}