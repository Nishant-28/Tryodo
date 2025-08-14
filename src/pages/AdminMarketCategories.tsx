import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Trash2, Edit, Package, AlertTriangle, FolderTree, Image, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';

interface MarketCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
  seo_title?: string;
  seo_description?: string;
  created_at: string;
  updated_at: string;
  parent_category?: {
    name: string;
  };
  subcategories_count?: number;
  products_count?: number;
}

interface NewCategoryForm {
  name: string;
  description: string;
  image_url: string;
  parent_id: string;
  sort_order: string;
  seo_title: string;
  seo_description: string;
}

const AdminMarketCategories = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State management
  const [categories, setCategories] = useState<MarketCategory[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<MarketCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MarketCategory | null>(null);
  
  // Form state
  const [newCategory, setNewCategory] = useState<NewCategoryForm>({
    name: '',
    description: '',
    image_url: '',
    parent_id: '',
    sort_order: '0',
    seo_title: '',
    seo_description: ''
  });

  // Load data on component mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Filter categories when search term changes
  useEffect(() => {
    filterCategories();
  }, [categories, searchTerm]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setInitialLoading(true);

      const { data, error } = await supabase
        .from('market_categories')
        .select(`
          *,
          parent_category:parent_id(name)
        `)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading market categories:', error);
        toast({
          title: "Error",
          description: "Failed to load market categories. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Get counts for subcategories and products
      const categoriesWithCounts = await Promise.all(
        (data || []).map(async (category) => {
          // Count subcategories
          const { count: subcategoriesCount } = await supabase
            .from('market_categories')
            .select('*', { count: 'exact', head: true })
            .eq('parent_id', category.id);

          // Count products
          const { count: productsCount } = await supabase
            .from('market_products')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id);

          return {
            ...category,
            subcategories_count: subcategoriesCount || 0,
            products_count: productsCount || 0
          };
        })
      );

      setCategories(categoriesWithCounts);
    } catch (error) {
      console.error('Error loading market categories:', error);
      toast({
        title: "Error",
        description: "Failed to load market categories. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const filterCategories = () => {
    if (!searchTerm.trim()) {
      setFilteredCategories(categories);
      return;
    }

    const filtered = categories.filter(category =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCategories(filtered);
  };

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Category name is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const slug = generateSlug(newCategory.name);
      
      // Check if slug already exists
      const { data: existingCategory } = await supabase
        .from('market_categories')
        .select('id')
        .eq('slug', slug)
        .single();

      if (existingCategory) {
        toast({
          title: "Validation Error",
          description: "A category with this name already exists.",
          variant: "destructive",
        });
        return;
      }

      const categoryData = {
        name: newCategory.name.trim(),
        slug,
        description: newCategory.description.trim() || null,
        image_url: newCategory.image_url.trim() || null,
        parent_id: newCategory.parent_id === 'none' ? null : newCategory.parent_id || null,
        sort_order: parseInt(newCategory.sort_order) || 0,
        seo_title: newCategory.seo_title.trim() || null,
        seo_description: newCategory.seo_description.trim() || null,
        is_active: true
      };

      const { error } = await supabase
        .from('market_categories')
        .insert([categoryData]);

      if (error) {
        console.error('Error adding category:', error);
        toast({
          title: "Error",
          description: "Failed to add category. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Market category added successfully.",
      });

      // Reset form and close dialog
      setNewCategory({
        name: '',
        description: '',
        image_url: '',
        parent_id: '',
        sort_order: '0',
        seo_title: '',
        seo_description: ''
      });
      setIsAddDialogOpen(false);
      
      // Reload categories
      loadCategories();
    } catch (error) {
      console.error('Error adding category:', error);
      toast({
        title: "Error",
        description: "Failed to add category. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !newCategory.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Category name is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const slug = generateSlug(newCategory.name);
      
      // Check if slug already exists (excluding current category)
      const { data: existingCategory } = await supabase
        .from('market_categories')
        .select('id')
        .eq('slug', slug)
        .neq('id', editingCategory.id)
        .single();

      if (existingCategory) {
        toast({
          title: "Validation Error",
          description: "A category with this name already exists.",
          variant: "destructive",
        });
        return;
      }

      const categoryData = {
        name: newCategory.name.trim(),
        slug,
        description: newCategory.description.trim() || null,
        image_url: newCategory.image_url.trim() || null,
        parent_id: newCategory.parent_id === 'none' ? null : newCategory.parent_id || null,
        sort_order: parseInt(newCategory.sort_order) || 0,
        seo_title: newCategory.seo_title.trim() || null,
        seo_description: newCategory.seo_description.trim() || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('market_categories')
        .update(categoryData)
        .eq('id', editingCategory.id);

      if (error) {
        console.error('Error updating category:', error);
        toast({
          title: "Error",
          description: "Failed to update category. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Market category updated successfully.",
      });

      // Reset form and close dialog
      setEditingCategory(null);
      setNewCategory({
        name: '',
        description: '',
        image_url: '',
        parent_id: '',
        sort_order: '0',
        seo_title: '',
        seo_description: ''
      });
      
      // Reload categories
      loadCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (category: MarketCategory) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('market_categories')
        .update({ 
          is_active: !category.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', category.id);

      if (error) {
        console.error('Error toggling category status:', error);
        toast({
          title: "Error",
          description: "Failed to update category status. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Category ${!category.is_active ? 'activated' : 'deactivated'} successfully.`,
      });

      // Reload categories
      loadCategories();
    } catch (error) {
      console.error('Error toggling category status:', error);
      toast({
        title: "Error",
        description: "Failed to update category status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (category: MarketCategory) => {
    try {
      setLoading(true);

      // Check if category has subcategories or products
      if (category.subcategories_count! > 0 || category.products_count! > 0) {
        toast({
          title: "Cannot Delete",
          description: "Cannot delete category that has subcategories or products. Please remove them first.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('market_categories')
        .delete()
        .eq('id', category.id);

      if (error) {
        console.error('Error deleting category:', error);
        toast({
          title: "Error",
          description: "Failed to delete category. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Market category deleted successfully.",
      });

      // Reload categories
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (category: MarketCategory) => {
    setEditingCategory(category);
    setNewCategory({
      name: category.name,
      description: category.description || '',
      image_url: category.image_url || '',
      parent_id: category.parent_id || '',
      sort_order: category.sort_order.toString(),
      seo_title: category.seo_title || '',
      seo_description: category.seo_description || ''
    });
  };

  const resetForm = () => {
    setNewCategory({
      name: '',
      description: '',
      image_url: '',
      parent_id: '',
      sort_order: '0',
      seo_title: '',
      seo_description: ''
    });
    setEditingCategory(null);
  };

  // Get parent categories for dropdown (exclude current category when editing)
  const getParentCategoryOptions = () => {
    return categories.filter(cat => 
      cat.id !== editingCategory?.id && // Don't allow self as parent
      cat.parent_id === null // Only show root categories as parent options
    );
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading market categories...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Market Categories</h1>
              <p className="text-gray-600 mt-1">Manage marketplace product categories</p>
            </div>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Market Category</DialogTitle>
                <DialogDescription>
                  Create a new category for marketplace products
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Category Name *</Label>
                    <Input
                      id="name"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter category name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sort_order">Sort Order</Label>
                    <Input
                      id="sort_order"
                      type="number"
                      value={newCategory.sort_order}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, sort_order: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newCategory.description}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter category description"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="image_url">Image URL</Label>
                    <Input
                      id="image_url"
                      value={newCategory.image_url}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, image_url: e.target.value }))}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="parent_id">Parent Category</Label>
                    <Select
                      value={newCategory.parent_id}
                      onValueChange={(value) => setNewCategory(prev => ({ ...prev, parent_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent category (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Parent (Root Category)</SelectItem>
                        {getParentCategoryOptions().map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="seo_title">SEO Title</Label>
                  <Input
                    id="seo_title"
                    value={newCategory.seo_title}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, seo_title: e.target.value }))}
                    placeholder="SEO optimized title"
                  />
                </div>

                <div>
                  <Label htmlFor="seo_description">SEO Description</Label>
                  <Textarea
                    id="seo_description"
                    value={newCategory.seo_description}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, seo_description: e.target.value }))}
                    placeholder="SEO meta description"
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddCategory} disabled={loading}>
                  {loading ? 'Adding...' : 'Add Category'}
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
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Total: {categories.length}</span>
            <span>Active: {categories.filter(c => c.is_active).length}</span>
            <span>Root: {categories.filter(c => !c.parent_id).length}</span>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid gap-6">
          {filteredCategories.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
                <p className="text-gray-600 text-center mb-4">
                  {searchTerm ? 'No categories match your search criteria.' : 'Get started by creating your first market category.'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Category
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredCategories.map((category) => (
              <Card key={category.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{category.name}</CardTitle>
                        <Badge variant={category.is_active ? "default" : "secondary"}>
                          {category.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {category.parent_id && (
                          <Badge variant="outline">
                            <FolderTree className="h-3 w-3 mr-1" />
                            Subcategory
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Slug:</strong> {category.slug}</p>
                        {category.parent_category && (
                          <p><strong>Parent:</strong> {category.parent_category.name}</p>
                        )}
                        {category.description && (
                          <p><strong>Description:</strong> {category.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(category)}
                        disabled={loading}
                      >
                        {category.is_active ? (
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
                            onClick={() => openEditDialog(category)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit Market Category</DialogTitle>
                            <DialogDescription>
                              Update category information
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="edit_name">Category Name *</Label>
                                <Input
                                  id="edit_name"
                                  value={newCategory.name}
                                  onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                                  placeholder="Enter category name"
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit_sort_order">Sort Order</Label>
                                <Input
                                  id="edit_sort_order"
                                  type="number"
                                  value={newCategory.sort_order}
                                  onChange={(e) => setNewCategory(prev => ({ ...prev, sort_order: e.target.value }))}
                                  placeholder="0"
                                />
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="edit_description">Description</Label>
                              <Textarea
                                id="edit_description"
                                value={newCategory.description}
                                onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Enter category description"
                                rows={3}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="edit_image_url">Image URL</Label>
                                <Input
                                  id="edit_image_url"
                                  value={newCategory.image_url}
                                  onChange={(e) => setNewCategory(prev => ({ ...prev, image_url: e.target.value }))}
                                  placeholder="https://example.com/image.jpg"
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit_parent_id">Parent Category</Label>
                                <Select
                                  value={newCategory.parent_id}
                                  onValueChange={(value) => setNewCategory(prev => ({ ...prev, parent_id: value }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select parent category (optional)" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">No Parent (Root Category)</SelectItem>
                                    {getParentCategoryOptions().map((cat) => (
                                      <SelectItem key={cat.id} value={cat.id}>
                                        {cat.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="edit_seo_title">SEO Title</Label>
                              <Input
                                id="edit_seo_title"
                                value={newCategory.seo_title}
                                onChange={(e) => setNewCategory(prev => ({ ...prev, seo_title: e.target.value }))}
                                placeholder="SEO optimized title"
                              />
                            </div>

                            <div>
                              <Label htmlFor="edit_seo_description">SEO Description</Label>
                              <Textarea
                                id="edit_seo_description"
                                value={newCategory.seo_description}
                                onChange={(e) => setNewCategory(prev => ({ ...prev, seo_description: e.target.value }))}
                                placeholder="SEO meta description"
                                rows={2}
                              />
                            </div>
                          </div>

                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingCategory(null)}>
                              Cancel
                            </Button>
                            <Button onClick={handleEditCategory} disabled={loading}>
                              {loading ? 'Updating...' : 'Update Category'}
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
                            disabled={category.subcategories_count! > 0 || category.products_count! > 0}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Category</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{category.name}"? This action cannot be undone.
                              {(category.subcategories_count! > 0 || category.products_count! > 0) && (
                                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                  <AlertTriangle className="h-4 w-4 text-yellow-600 inline mr-2" />
                                  This category has {category.subcategories_count} subcategories and {category.products_count} products.
                                  Please remove them first.
                                </div>
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteCategory(category)}
                              className="bg-red-600 hover:bg-red-700"
                              disabled={category.subcategories_count! > 0 || category.products_count! > 0}
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Sort Order</p>
                      <p className="font-medium">{category.sort_order}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Subcategories</p>
                      <p className="font-medium">{category.subcategories_count}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Products</p>
                      <p className="font-medium">{category.products_count}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Created</p>
                      <p className="font-medium">{new Date(category.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  {category.image_url && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 mb-2">Category Image:</p>
                      <img 
                        src={category.image_url} 
                        alt={category.name}
                        className="w-20 h-20 object-cover rounded border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  {(category.seo_title || category.seo_description) && (
                    <div className="mt-4 p-3 bg-gray-50 rounded">
                      <p className="text-sm font-medium text-gray-700 mb-2">SEO Information:</p>
                      {category.seo_title && (
                        <p className="text-sm"><strong>Title:</strong> {category.seo_title}</p>
                      )}
                      {category.seo_description && (
                        <p className="text-sm"><strong>Description:</strong> {category.seo_description}</p>
                      )}
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

export default AdminMarketCategories;