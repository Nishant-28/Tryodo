import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

interface Brand { id: string; name: string; }
interface Category { id: string; name: string; }
interface Product { id: string; name: string; brand_id: string; category_id: string; description: string | null; images: string[]; is_active: boolean; }

const AdminEditMarketProduct: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Product | null>(null);

  useEffect(() => {
    loadMasterData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMasterData = async () => {
    try {
      const [brandRes, catRes, productRes] = await Promise.all([
        supabase.from('market_brands').select('id, name').order('name'),
        supabase.from('market_categories').select('id, name').order('name'),
        supabase.from('market_products').select('*').eq('id', id!).single(),
      ]);

      if (brandRes.error) throw brandRes.error;
      if (catRes.error) throw catRes.error;
      if (productRes.error) throw productRes.error;

      setBrands(brandRes.data || []);
      setCategories(catRes.data || []);
      setForm(productRes.data as Product);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: 'Error', description: 'Failed to load product info.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8 text-center">Loading...</main>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('market_products')
        .update({
          name: form.name.trim(),
          brand_id: form.brand_id,
          category_id: form.category_id,
          description: form.description?.trim() || null,
          images: form.images,
          is_active: form.is_active,
        })
        .eq('id', form.id);

      if (error) throw error;
      toast({ title: 'Updated', description: 'Product updated successfully.' });
      navigate('/admin/market/products');
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast({ title: 'Error', description: error.message || 'Failed to update.', variant: 'destructive' });
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

        <h1 className="text-3xl font-bold mb-2">Edit Market Product</h1>
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Edit Details</CardTitle>
            <CardDescription>Update information and save changes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form!, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Brand</Label>
                <Select value={form.brand_id} onValueChange={(v) => setForm({ ...form!, brand_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form!, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description || ''} onChange={(e) => setForm({ ...form!, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Image URL (first image)</Label>
              <Input value={form.images[0] || ''} onChange={(e) => setForm({ ...form!, images: [e.target.value] })} />
            </div>
            <Button onClick={handleSave} disabled={loading} className="w-full">
              {loading ? 'Saving...' : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminEditMarketProduct; 