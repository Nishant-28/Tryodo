import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Trash2, Edit, Package, AlertTriangle, Image, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';

interface MarketBrand {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  description?: string;
  website_url?: string;
  brand_guidelines?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  products_count?: number;
}

interface NewBrandForm {
  name: string;
  description: string;
  logo_url: string;
  website_url: string;
  brand_guidelines: string;
}

const AdminMarketBrands = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State management
  const [brands, setBrands] = useState<MarketBrand[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<MarketBrand[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<MarketBrand | null>(null);
  
  // Form state
  const [newBrand, setNewBrand] = useState<NewBrandForm>({
    name: '',
    description: '',
    logo_url: '',
    website_url: '',
    brand_guidelines: ''
  });

  // Load data on component mount
  useEffect(() => {
    loadBrands();
  }, []);

  // Filter brands when search term changes
  useEffect(() => {
    filterBrands();
  }, [brands, searchTerm]);

  const loadBrands = async () => {
    try {
      setLoading(true);
      setInitialLoading(true);

      const { data, error } = await supabase
        .from('market_brands')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading market brands:', error);
        toast({
          title: "Error",
          description: "Failed to load market brands. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Get counts for products
      const brandsWithCounts = await Promise.all(
        (data || []).map(async (brand) => {
          // Count products
          const { count: productsCount } = await supabase
            .from('market_products')
            .select('*', { count: 'exact', head: true })
            .eq('brand_id', brand.id);

          return {
            ...brand,
            products_count: productsCount || 0
          };
        })
      );

      setBrands(brandsWithCounts);
    } catch (error) {
      console.error('Error loading market brands:', error);
      toast({
        title: "Error",
        description: "Failed to load market brands. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const filterBrands = () => {
    if (!searchTerm.trim()) {
      setFilteredBrands(brands);
      return;
    }

    const filtered = brands.filter(brand =>
      brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brand.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brand.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredBrands(filtered);
  };

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleAddBrand = async () => {
    if (!newBrand.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Brand name is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const slug = generateSlug(newBrand.name);
      
      // Check if slug already exists
      const { data: existingBrand } = await supabase
        .from('market_brands')
        .select('id')
        .eq('slug', slug)
        .single();

      if (existingBrand) {
        toast({
          title: "Validation Error",
          description: "A brand with this name already exists.",
          variant: "destructive",
        });
        return;
      }

      const brandData = {
        name: newBrand.name.trim(),
        slug,
        description: newBrand.description.trim() || null,
        logo_url: newBrand.logo_url.trim() || null,
        website_url: newBrand.website_url.trim() || null,
        brand_guidelines: newBrand.brand_guidelines.trim() || null,
        is_active: true
      };

      const { error } = await supabase
        .from('market_brands')
        .insert([brandData]);

      if (error) {
        console.error('Error adding brand:', error);
        toast({
          title: "Error",
          description: "Failed to add brand. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Market brand added successfully.",
      });

      // Reset form and close dialog
      setNewBrand({
        name: '',
        description: '',
        logo_url: '',
        website_url: '',
        brand_guidelines: ''
      });
      setIsAddDialogOpen(false);
      
      // Reload brands
      loadBrands();
    } catch (error) {
      console.error('Error adding brand:', error);
      toast({
        title: "Error",
        description: "Failed to add brand. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditBrand = async () => {
    if (!editingBrand || !newBrand.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Brand name is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const slug = generateSlug(newBrand.name);
      
      // Check if slug already exists (excluding current brand)
      const { data: existingBrand } = await supabase
        .from('market_brands')
        .select('id')
        .eq('slug', slug)
        .neq('id', editingBrand.id)
        .single();

      if (existingBrand) {
        toast({
          title: "Validation Error",
          description: "A brand with this name already exists.",
          variant: "destructive",
        });
        return;
      }

      const brandData = {
        name: newBrand.name.trim(),
        slug,
        description: newBrand.description.trim() || null,
        logo_url: newBrand.logo_url.trim() || null,
        website_url: newBrand.website_url.trim() || null,
        brand_guidelines: newBrand.brand_guidelines.trim() || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('market_brands')
        .update(brandData)
        .eq('id', editingBrand.id);

      if (error) {
        console.error('Error updating brand:', error);
        toast({
          title: "Error",
          description: "Failed to update brand. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Market brand updated successfully.",
      });

      // Reset form and close dialog
      setEditingBrand(null);
      setNewBrand({
        name: '',
        description: '',
        logo_url: '',
        website_url: '',
        brand_guidelines: ''
      });
      
      // Reload brands
      loadBrands();
    } catch (error) {
      console.error('Error updating brand:', error);
      toast({
        title: "Error",
        description: "Failed to update brand. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (brand: MarketBrand) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('market_brands')
        .update({ 
          is_active: !brand.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', brand.id);

      if (error) {
        console.error('Error toggling brand status:', error);
        toast({
          title: "Error",
          description: "Failed to update brand status. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Brand ${!brand.is_active ? 'activated' : 'deactivated'} successfully.`,
      });

      // Reload brands
      loadBrands();
    } catch (error) {
      console.error('Error toggling brand status:', error);
      toast({
        title: "Error",
        description: "Failed to update brand status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBrand = async (brand: MarketBrand) => {
    try {
      setLoading(true);

      // Check if brand has products
      if (brand.products_count! > 0) {
        toast({
          title: "Cannot Delete",
          description: "Cannot delete brand that has products. Please remove them first.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('market_brands')
        .delete()
        .eq('id', brand.id);

      if (error) {
        console.error('Error deleting brand:', error);
        toast({
          title: "Error",
          description: "Failed to delete brand. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Market brand deleted successfully.",
      });

      // Reload brands
      loadBrands();
    } catch (error) {
      console.error('Error deleting brand:', error);
      toast({
        title: "Error",
        description: "Failed to delete brand. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (brand: MarketBrand) => {
    setEditingBrand(brand);
    setNewBrand({
      name: brand.name,
      description: brand.description || '',
      logo_url: brand.logo_url || '',
      website_url: brand.website_url || '',
      brand_guidelines: brand.brand_guidelines || ''
    });
  };

  const resetForm = () => {
    setNewBrand({
      name: '',
      description: '',
      logo_url: '',
      website_url: '',
      brand_guidelines: ''
    });
    setEditingBrand(null);
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading market brands...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
          <div className="flex items-center mb-4 sm:mb-0">
            <Button
              variant="ghost"
              onClick={() => navigate('/admin-dashboard')}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Market Brands</h1>
              <p className="text-gray-600 mt-1">Manage marketplace product brands</p>
            </div>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Brand
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Market Brand</DialogTitle>
                <DialogDescription>
                  Create a new brand for marketplace products
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="name">Brand Name *</Label>
                  <Input
                    id="name"
                    value={newBrand.name}
                    onChange={(e) => setNewBrand(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter brand name"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newBrand.description}
                    onChange={(e) => setNewBrand(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter brand description"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="logo_url">Logo URL</Label>
                    <Input
                      id="logo_url"
                      value={newBrand.logo_url}
                      onChange={(e) => setNewBrand(prev => ({ ...prev, logo_url: e.target.value }))}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                  <div>
                    <Label htmlFor="website_url">Website URL</Label>
                    <Input
                      id="website_url"
                      value={newBrand.website_url}
                      onChange={(e) => setNewBrand(prev => ({ ...prev, website_url: e.target.value }))}
                      placeholder="https://brand-website.com"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="brand_guidelines">Brand Guidelines</Label>
                  <Textarea
                    id="brand_guidelines"
                    value={newBrand.brand_guidelines}
                    onChange={(e) => setNewBrand(prev => ({ ...prev, brand_guidelines: e.target.value }))}
                    placeholder="Brand usage guidelines, color codes, fonts, etc."
                    rows={4}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddBrand} disabled={loading}>
                  {loading ? 'Adding...' : 'Add Brand'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Stats */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search brands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Total: {brands.length}</span>
            <span>Active: {brands.filter(b => b.is_active).length}</span>
          </div>
        </div>

        {/* Brands Grid */}
        <div className="grid gap-6">
          {filteredBrands.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No brands found</h3>
                <p className="text-gray-600 text-center mb-4">
                  {searchTerm ? 'No brands match your search criteria.' : 'Get started by creating your first market brand.'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Brand
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredBrands.map((brand) => (
              <Card key={brand.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {brand.logo_url && (
                        <img 
                          src={brand.logo_url} 
                          alt={`${brand.name} logo`}
                          className="w-16 h-16 object-contain rounded border bg-white"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-xl">{brand.name}</CardTitle>
                          <Badge variant={brand.is_active ? "default" : "secondary"}>
                            {brand.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>Slug:</strong> {brand.slug}</p>
                          {brand.description && (
                            <p><strong>Description:</strong> {brand.description}</p>
                          )}
                          {brand.website_url && (
                            <p className="flex items-center gap-1">
                              <strong>Website:</strong> 
                              <a 
                                href={brand.website_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                              >
                                {brand.website_url}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(brand)}
                        disabled={loading}
                      >
                        {brand.is_active ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(brand)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit Market Brand</DialogTitle>
                            <DialogDescription>
                              Update brand information
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="grid gap-4 py-4">
                            <div>
                              <Label htmlFor="edit_name">Brand Name *</Label>
                              <Input
                                id="edit_name"
                                value={newBrand.name}
                                onChange={(e) => setNewBrand(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Enter brand name"
                              />
                            </div>

                            <div>
                              <Label htmlFor="edit_description">Description</Label>
                              <Textarea
                                id="edit_description"
                                value={newBrand.description}
                                onChange={(e) => setNewBrand(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Enter brand description"
                                rows={3}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="edit_logo_url">Logo URL</Label>
                                <Input
                                  id="edit_logo_url"
                                  value={newBrand.logo_url}
                                  onChange={(e) => setNewBrand(prev => ({ ...prev, logo_url: e.target.value }))}
                                  placeholder="https://example.com/logo.png"
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit_website_url">Website URL</Label>
                                <Input
                                  id="edit_website_url"
                                  value={newBrand.website_url}
                                  onChange={(e) => setNewBrand(prev => ({ ...prev, website_url: e.target.value }))}
                                  placeholder="https://brand-website.com"
                                />
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="edit_brand_guidelines">Brand Guidelines</Label>
                              <Textarea
                                id="edit_brand_guidelines"
                                value={newBrand.brand_guidelines}
                                onChange={(e) => setNewBrand(prev => ({ ...prev, brand_guidelines: e.target.value }))}
                                placeholder="Brand usage guidelines, color codes, fonts, etc."
                                rows={4}
                              />
                            </div>
                          </div>

                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingBrand(null)}>
                              Cancel
                            </Button>
                            <Button onClick={handleEditBrand} disabled={loading}>
                              {loading ? 'Updating...' : 'Update Brand'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={brand.products_count! > 0}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Brand</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{brand.name}"? This action cannot be undone.
                              {brand.products_count! > 0 && (
                                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                  <AlertTriangle className="h-4 w-4 text-yellow-600 inline mr-2" />
                                  This brand has {brand.products_count} products. Please remove them first.
                                </div>
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteBrand(brand)}
                              className="bg-red-600 hover:bg-red-700"
                              disabled={brand.products_count! > 0}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-600">Products</p>
                      <p className="font-medium">{brand.products_count}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Created</p>
                      <p className="font-medium">{new Date(brand.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Updated</p>
                      <p className="font-medium">{new Date(brand.updated_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  {brand.brand_guidelines && (
                    <div className="mt-4 p-3 bg-gray-50 rounded">
                      <p className="text-sm font-medium text-gray-700 mb-2">Brand Guidelines:</p>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{brand.brand_guidelines}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminMarketBrands;