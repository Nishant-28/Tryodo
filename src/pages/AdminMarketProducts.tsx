import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, Edit, Trash2, Eye } from 'lucide-react';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

interface MarketProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  images: string[];
  specifications: Record<string, any>;
  category_id: string;
  brand_id: string;
  is_active: boolean;
  created_at: string;
  category?: {
    name: string;
  };
  brand?: {
    name: string;
  };
}

const AdminMarketProducts = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState<MarketProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Delete handler
  const handleDeleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('market_products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Deleted', description: 'Product removed successfully.' });
      // Refresh list
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast({ title: 'Error', description: error.message || 'Failed to delete product.', variant: 'destructive' });
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('market_products')
        .select(`
          *,
          category:market_categories(name),
          brand:market_brands(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error loading products:', error);
      toast({
        title: "Error",
        description: "Failed to load products.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.brand?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Market Products Management</h1>
          <p className="text-gray-600">Manage the marketplace product catalog</p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Button className="flex items-center gap-2" onClick={() => navigate('/admin/market/products/add')}>
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-32 bg-gray-200 rounded mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-400 mb-4">
                <Search className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No products found' : 'No products yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm 
                  ? 'Try adjusting your search terms.'
                  : 'Get started by adding your first market product.'
                }
              </p>
              {!searchTerm && (
                <Button className="flex items-center gap-2" onClick={() => navigate('/admin/market/products/add')}>
                  <Plus className="h-4 w-4" />
                  Add First Product
                </Button>
              )}
            </div>
          ) : (
            filteredProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg truncate">{product.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <span>{product.category?.name}</span>
                        <span>•</span>
                        <span>{product.brand?.name}</span>
                      </CardDescription>
                    </div>
                    <Badge variant={product.is_active ? 'default' : 'secondary'}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {product.images && product.images.length > 0 && (
                    <div className="aspect-video bg-gray-100 rounded-lg mb-4 overflow-hidden">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.svg';
                        }}
                      />
                    </div>
                  )}
                  
                  {product.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Created {new Date(product.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/market/products/${product.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/market/products/${product.id}/edit`)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Product</AlertDialogTitle>
                          </AlertDialogHeader>
                          Are you sure you want to delete "{product.name}"? This action cannot be undone.
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteProduct(product.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminMarketProducts;