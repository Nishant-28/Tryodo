import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Brand {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface ProductForm {
  name: string;
  brand_id: string;
  category_id: string;
  description: string;
  image_url: string;
  is_active: boolean;
}

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const AdminAddMarketProduct: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<ProductForm>({
    name: '',
    brand_id: '',
    category_id: '',
    description: '',
    image_url: '',
    is_active: true,
  });

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      const [{ data: brandData, error: brandError }, { data: categoryData, error: categoryError }] = await Promise.all([
        supabase.from('market_brands').select('id, name').order('name'),
        supabase.from('market_categories').select('id, name').eq('is_active', true).order('name'),
      ]);

      if (brandError) throw brandError;
      if (categoryError) throw categoryError;

      setBrands(brandData || []);
      setCategories(categoryData || []);
    } catch (error) {
      console.error('Error loading master data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load brands or categories.',
        variant: 'destructive',
      });
    }
  };

  const validateForm = () => {
    const errors: string[] = [];
    if (!form.name.trim()) errors.push('Product name is required');
    if (!form.brand_id) errors.push('Brand is required');
    if (!form.category_id) errors.push('Category is required');
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      toast({ title: 'Validation Error', description: errors.join('\n'), variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);
      const slug = generateSlug(form.name);

      // Check duplicate
      const { data: existing } = await supabase
        .from('market_products')
        .select('id')
        .eq('slug', slug)
        .single();

      if (existing) {
        toast({ title: 'Error', description: 'A product with this name already exists.', variant: 'destructive' });
        return;
      }

      const insertData: any = {
        name: form.name.trim(),
        slug,
        brand_id: form.brand_id,
        category_id: form.category_id,
        description: form.description.trim() || null,
        images: form.image_url ? [form.image_url.trim()] : [],
        specifications: {},
        is_active: form.is_active,
      };

      if (profile) {
        insertData.created_by = profile.id;
      }

      const { error } = await supabase.from('market_products').insert([insertData]);
      if (error) throw error;

      toast({ title: 'Success', description: 'Market product added successfully!' });
      navigate('/admin/market/products');
    } catch (error: any) {
      console.error('Error adding product:', error);
      toast({ title: 'Error', description: error.message || 'Failed to add product.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/admin/market/products')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Products
        </Button>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Add Market Product</h1>
        <p className="text-gray-600 mb-6">Create a new product entry for the marketplace catalog.</p>

        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Add Product Details</CardTitle>
            <CardDescription>Fill in the product information below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Select value={form.brand_id} onValueChange={(v) => setForm({ ...form, brand_id: v })}>
                  <SelectTrigger id="brand">
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Image URL (optional)</Label>
              <Input id="image" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Adding...' : <><Plus className="h-4 w-4 mr-2" /> Add Product</>}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminAddMarketProduct; 